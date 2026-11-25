import { prisma } from "./db";
import { ApiError } from "./api";
import { addItems, createOrder, LineIn, sendKotTx } from "./order-service";
import { emitToBranch, emitToRoom } from "./realtime";

const ACTIVE = ["OPEN", "HELD", "BILLED"] as const;
/** Customer order from the table QR. Auto-accept → goes straight to kitchen (added to the table's open order).
 *  Otherwise a PENDING_APPROVAL order is created and staff get an alert. */
export async function placeQrOrder(ctx: { restaurantId: string; branchId: string; tableId: string; tableName: string; autoAccept: boolean }, d: { items: LineIn[]; customerName?: string; customerPhone?: string }) {
  const session = { restaurantId: ctx.restaurantId, branchId: ctx.branchId, sub: "" };
  const open = await prisma.order.findFirst({ where: { tableId: ctx.tableId, status: { in: ["OPEN", "HELD"] } } });
  if (ctx.autoAccept && open) {
    const o = await addItems(session, open.id, d.items, true);
    return { orderId: o.id, status: "OPEN" as const };
  }
  const billed = await prisma.order.findFirst({ where: { tableId: ctx.tableId, status: "BILLED" } });
  if (billed && ctx.autoAccept) throw new ApiError(400, "Your bill is ready. Please ask the waiter to add more items.");
  const { order } = await createOrder(session, { type: "QR", tableId: ctx.tableId, items: d.items, customerName: d.customerName, customerPhone: d.customerPhone, guests: 1, send: ctx.autoAccept, hold: false, source: "QR", status: ctx.autoAccept ? "OPEN" : "PENDING_APPROVAL" });
  if (!ctx.autoAccept) emitToBranch(ctx.branchId, "qr:pending", { id: order.id, table: ctx.tableName });
  return { orderId: order.id, status: order.status };
}

/** Staff accepts or rejects a QR order. Accepting merges it into the table's open order (if any) and sends the KOT. */
export async function approveQrOrder(s: { restaurantId: string; branchId: string | null; name: string }, orderId: string, accept: boolean) {
  const o = await prisma.order.findFirst({ where: { id: orderId, restaurantId: s.restaurantId, branchId: s.branchId ?? undefined }, include: { table: true } });
  if (!o) throw new ApiError(404, "Order not found.");
  if (o.status !== "PENDING_APPROVAL") throw new ApiError(400, "This order was already handled.");
  let target = o.id;
  await prisma.$transaction(async (tx) => {
    if (!accept) {
      await tx.orderItem.updateMany({ where: { orderId }, data: { status: "CANCELLED", cancelReason: `Rejected by ${s.name}` } });
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: `QR order rejected by ${s.name}`, closedAt: new Date() } });
      const others = o.tableId ? await tx.order.count({ where: { tableId: o.tableId, status: { in: [...ACTIVE, "PENDING_APPROVAL"] } } }) : 1;
      if (o.tableId && !others) await tx.diningTable.update({ where: { id: o.tableId }, data: { status: "FREE" } });
      return;
    }
    const open = o.tableId ? await tx.order.findFirst({ where: { tableId: o.tableId, status: { in: ["OPEN", "HELD"] }, id: { not: o.id } } }) : null;
    if (open) {
      await tx.orderItem.updateMany({ where: { orderId }, data: { orderId: open.id } });
      await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED", cancelReason: `Merged into order #${open.orderNo}`, closedAt: new Date() } });
      if (!open.customerPhone && o.customerPhone) await tx.order.update({ where: { id: open.id }, data: { customerPhone: o.customerPhone, customerName: o.customerName } });
      target = open.id;
    } else await tx.order.update({ where: { id: orderId }, data: { status: "OPEN" } });
    await sendKotTx(tx, target, o.branchId);
  });
  emitToBranch(o.branchId, accept ? "kot:new" : "order:updated", { orderId: target });
  emitToBranch(o.branchId, "order:updated", { id: target });
  emitToRoom(`order:${orderId}`, "order:updated", { id: orderId, mergedInto: target });
  return { orderId: target, accepted: accept };
}
