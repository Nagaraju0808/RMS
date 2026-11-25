import type { Bill, Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./api";
import { Session } from "./session";
import { BillInput, BillResult, billNumber, computeBill, settle, splitByItems, splitEqual } from "./billing";
import { resolveSettings } from "./features";
import { loadOrder } from "./order-service";
import { emitToBranch, emitToRoom } from "./realtime";
import { onOrderPaid } from "./paid-hooks";
import { Receipt } from "./escpos";

type OrderFull = Awaited<ReturnType<typeof loadOrder>>;

export function billInput(o: OrderFull, settingsRaw: unknown): BillInput & { lines: any[] } {
  const st = resolveSettings(settingsRaw);
  return {
    lines: o.items.map((i) => ({ id: i.id, unitPrice: i.unitPrice, quantity: i.quantity, taxPercent: i.taxPercent, complimentary: i.complimentary, status: i.status })),
    discount: o.discountType ? { type: o.discountType, value: o.discountValue } : null,
    serviceChargePercent: o.type === "DINE_IN" || o.type === "QR" ? st.serviceChargePercent : 0,
    packingCharge: o.packingCharge, deliveryCharge: o.deliveryCharge, interState: st.interState, roundOff: st.roundOff,
  };
}

export type SplitIn = { mode: "none" } | { mode: "equal"; parts: number } | { mode: "items"; groups: string[][]; labels?: string[] };

/** Make the bill(s) for an order. Old unpaid bills are voided first, so this can be re-run after changes. */
export async function createBills(s: Session, orderId: string, split: SplitIn) {
  const o = await loadOrder(s, orderId);
  if (!["OPEN", "HELD", "BILLED"].includes(o.status)) throw new ApiError(400, "This order cannot be billed.");
  if (o.bills.some((b) => b.status !== "VOID" && b.paid > 0)) throw new ApiError(400, "Payment already taken on a bill. Finish that payment or refund it first.");
  if (!o.items.some((i) => i.status !== "CANCELLED")) throw new ApiError(400, "There are no items to bill.");
  const branch = await prisma.branch.findUniqueOrThrow({ where: { id: o.branchId } });
  const inp = billInput(o, branch.settings);
  let results: { r: BillResult; label?: string; itemIds: string[] }[];
  try {
    if (split.mode === "equal") results = splitEqual(computeBill(inp), split.parts).map((r, i) => ({ r, label: `Part ${i + 1} of ${split.parts}`, itemIds: [] }));
    else if (split.mode === "items") results = splitByItems(inp, split.groups).map((r, i) => ({ r, label: split.labels?.[i] ?? `Person ${i + 1}`, itemIds: split.groups[i] }));
    else results = [{ r: computeBill(inp), itemIds: [] }];
  } catch (e: any) { throw new ApiError(400, e.message); }
  const bills = await prisma.$transaction(async (tx) => {
    await tx.bill.updateMany({ where: { orderId, status: { in: ["OPEN"] } }, data: { status: "VOID" } });
    const b = await tx.branch.update({ where: { id: branch.id }, data: { billCounter: { increment: results.length } } });
    const first = b.billCounter - results.length + 1;
    const out: Bill[] = [];
    for (const [i, { r, label, itemIds }] of results.entries()) {
      out.push(await tx.bill.create({ data: {
        restaurantId: s.restaurantId, branchId: branch.id, orderId, billNo: billNumber(first + i), splitLabel: label ?? null, itemIds,
        subtotal: r.subtotal, discount: r.discount, serviceCharge: r.serviceCharge, packingCharge: r.packingCharge, deliveryCharge: r.deliveryCharge,
        cgst: r.cgst, sgst: r.sgst, igst: r.igst, roundOff: r.roundOff, total: r.total, breakdown: { taxGroups: r.taxGroups, taxable: r.taxable } as any,
      } }));
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "BILLED" } });
    if (o.tableId) await tx.diningTable.update({ where: { id: o.tableId }, data: { status: "BILL_PRINTED" } });
    if (o.couponCode) await tx.coupon.updateMany({ where: { restaurantId: s.restaurantId, code: o.couponCode }, data: { usedCount: { increment: 1 } } });
    return out;
  });
  emitToBranch(branch.id, "order:updated", { id: orderId });
  if (o.tableId) emitToBranch(branch.id, "table:updated", { id: o.tableId });
  return bills;
}

export type PaymentIn = { mode: "CASH" | "CARD" | "UPI" | "WALLET" | "ONLINE"; amount: number; tip?: number; gateway?: string; gatewayRef?: string };

/** Record one or more payments (split payment across modes). Closes the order when every bill is paid. */
export async function recordPayments(restaurantId: string, billId: string, payments: PaymentIn[]) {
  const bill = await prisma.bill.findFirst({ where: { id: billId, restaurantId }, include: { order: true } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  if (bill.status === "VOID") throw new ApiError(400, "This bill was cancelled. Open the latest bill.");
  if (bill.status === "PAID" || bill.status === "REFUNDED") throw new ApiError(400, "This bill is already paid.");
  let res;
  try { res = settle(bill.total, bill.paid, payments); } catch (e: any) { throw new ApiError(400, e.message); }
  // Cash payments are stored only for the amount applied (change goes back to the customer).
  let cashLeft = res.applied - payments.filter((p) => p.mode !== "CASH").reduce((s, p) => s + p.amount, 0);
  const rows = payments.map((p) => {
    const amount = p.mode === "CASH" ? Math.min(p.amount, cashLeft) : p.amount;
    if (p.mode === "CASH") cashLeft -= amount;
    return { billId, mode: p.mode, amount, tip: p.tip ?? 0, gateway: p.gateway, gatewayRef: p.gatewayRef };
  }).filter((r) => r.amount > 0 || r.tip > 0);
  const paid = bill.paid + res.applied;
  const done = await prisma.$transaction(async (tx) => {
    await tx.payment.createMany({ data: rows });
    await tx.bill.update({ where: { id: billId }, data: { paid, status: paid >= bill.total ? "PAID" : "PARTIALLY_PAID" } });
    const open = await tx.bill.count({ where: { orderId: bill.orderId, status: { in: ["OPEN", "PARTIALLY_PAID"] } } });
    if (open === 0) {
      await tx.order.update({ where: { id: bill.orderId }, data: { status: "PAID", closedAt: new Date() } });
      if (bill.order.tableId) {
        await tx.diningTable.update({ where: { id: bill.order.tableId }, data: { status: "CLEANING" } });
        await tx.diningTable.updateMany({ where: { mergedIntoId: bill.order.tableId }, data: { status: "CLEANING", mergedIntoId: null } });
      }
      await onOrderPaid(tx, bill.orderId);
      return true;
    }
    return false;
  });
  emitToBranch(bill.branchId, "order:updated", { id: bill.orderId });
  emitToRoom(`order:${bill.orderId}`, "order:updated", { id: bill.orderId });
  if (bill.order.tableId) emitToBranch(bill.branchId, "table:updated", { id: bill.order.tableId });
  return { change: res.change, remaining: res.remaining, orderPaid: done };
}

export async function billForPrint(where: Prisma.BillWhereInput) {
  const bill = await prisma.bill.findFirst({ where, include: { payments: true, refunds: true, order: { include: { items: { orderBy: { createdAt: "asc" } }, table: true } }, branch: { include: { restaurant: true } } } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  return bill;
}
type PrintBill = Awaited<ReturnType<typeof billForPrint>>;
const r2 = (p: number) => (p / 100).toFixed(2);
export function billItems(b: PrintBill) {
  const items = b.order.items.filter((i) => i.status !== "CANCELLED" && (!b.itemIds.length || b.itemIds.includes(i.id)));
  return items;
}
export function toReceipt(b: PrintBill): Receipt {
  const r = b.branch.restaurant;
  const t: Receipt["totals"] = [{ left: "Subtotal", right: r2(b.subtotal) }];
  if (b.discount) t.push({ left: "Discount", right: "-" + r2(b.discount) });
  if (b.serviceCharge) t.push({ left: "Service charge", right: r2(b.serviceCharge) });
  if (b.packingCharge) t.push({ left: "Packing", right: r2(b.packingCharge) });
  if (b.deliveryCharge) t.push({ left: "Delivery", right: r2(b.deliveryCharge) });
  for (const g of ((b.breakdown as any)?.taxGroups ?? []) as any[]) {
    if (g.igst) t.push({ left: `IGST ${g.ratePercent}%`, right: r2(g.igst) });
    else if (g.cgst) { t.push({ left: `CGST ${g.ratePercent / 2}%`, right: r2(g.cgst) }); t.push({ left: `SGST ${g.ratePercent / 2}%`, right: r2(g.sgst) }); }
  }
  if (b.roundOff) t.push({ left: "Round off", right: r2(b.roundOff) });
  t.push({ left: "TOTAL", right: "₹" + r2(b.total), bold: true });
  for (const p of b.payments) t.push({ left: `Paid ${p.mode}`, right: r2(p.amount) });
  return {
    header: [r.name, b.branch.name, ...(b.branch.address ? [b.branch.address] : []), ...(r.gstin ? [`GSTIN ${r.gstin}`] : []), "TAX INVOICE", `Bill ${b.billNo}${b.splitLabel ? ` (${b.splitLabel})` : ""}`, `${new Date(b.createdAt).toLocaleString("en-IN")}`, `${b.order.table ? "Table " + b.order.table.name : b.order.type}${b.order.tokenNo ? " Token " + b.order.tokenNo : ""}`],
    lines: b.splitLabel && !b.itemIds.length ? [{ left: `Share of order #${b.order.orderNo}`, right: r2(b.subtotal) }] : billItems(b).map((i) => ({ left: `${i.quantity} x ${i.name}${i.complimentary ? " (FREE)" : ""}`, right: i.complimentary ? "0.00" : r2(i.unitPrice * i.quantity) })),
    totals: t,
    footer: ["Thank you! Visit again", "SAC 996331"],
  };
}
