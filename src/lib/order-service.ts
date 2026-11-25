// Database side of orders: create, add items, send KOT, approvals. All tenant-scoped.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ApiError } from "./api";
import { Session } from "./session";
import { checkSecret } from "./auth";
import { happyHourPercent, itemAvailable } from "./menu";
import { lineName, nextToken, todayStr, unitPrice, unsentItems } from "./orders";
import { resolveFeatures, RestaurantTypeName } from "./features";
import { emitToBranch, emitToRoom } from "./realtime";
import { onItemsSold } from "./stock-hooks";

export const LineSchema = z.object({
  menuItemId: z.string(), variantId: z.string().nullable().optional(), addonIds: z.array(z.string()).default([]),
  quantity: z.number().int().min(1).max(99), notes: z.string().max(200).optional(),
});
export type LineIn = z.infer<typeof LineSchema>;

export const ORDER_INCLUDE = { items: { orderBy: { createdAt: "asc" } }, table: true, kots: { orderBy: { kotNo: "asc" } }, bills: { include: { payments: true } }, delivery: { include: { rider: { select: { id: true, name: true, phone: true } } } } } satisfies Prisma.OrderInclude;

/** Turn client line requests into priced OrderItem rows. Prices ALWAYS come from the database. */
export async function resolveLines(restaurantId: string, channel: "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "QR", lines: LineIn[], opts: { allowUnavailable?: boolean } = {}) {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const items = await prisma.menuItem.findMany({ where: { id: { in: ids }, restaurantId }, include: { variants: true, category: true, taxRate: true, addonGroups: { include: { group: { include: { addons: true } } } } } });
  const schedules = await prisma.menuSchedule.findMany({ where: { restaurantId } });
  const defTax = await prisma.taxRate.findFirst({ where: { restaurantId, isDefault: true } });
  return lines.map((l) => {
    const item = items.find((i) => i.id === l.menuItemId);
    if (!item) throw new ApiError(400, "One of the items is not on the menu.");
    if (!opts.allowUnavailable && !itemAvailable(item, schedules)) throw new ApiError(400, `${item.name} is not available right now.`);
    let variant = null;
    if (l.variantId) { variant = item.variants.find((v) => v.id === l.variantId) ?? null; if (!variant) throw new ApiError(400, `Size not found for ${item.name}.`); }
    else if (item.variants.length) variant = item.variants[0];
    const allAddons = item.addonGroups.flatMap((g) => g.group.addons);
    const addons = l.addonIds.map((id) => { const a = allAddons.find((x) => x.id === id); if (!a) throw new ApiError(400, `Add-on not allowed for ${item.name}.`); return { id: a.id, name: a.name, price: a.price }; });
    for (const g of item.addonGroups) {
      const n = addons.filter((a) => g.group.addons.some((x) => x.id === a.id)).length;
      if (n < g.group.minSelect || n > g.group.maxSelect) throw new ApiError(400, `${item.name}: choose ${g.group.minSelect}–${g.group.maxSelect} from ${g.group.name}.`);
    }
    const hh = happyHourPercent(item.scheduleIds, schedules);
    return {
      menuItemId: item.id, variantId: variant?.id ?? null, name: lineName({ item, variant }), quantity: l.quantity, notes: l.notes,
      unitPrice: unitPrice({ item, variant, addons, quantity: l.quantity, happyHourPercent: hh }, channel),
      addons, taxPercent: item.taxRate?.ratePercent ?? defTax?.ratePercent ?? 0, stationId: item.stationId ?? item.category.stationId,
    };
  });
}

export async function getBranchCtx(s: Pick<Session, "restaurantId" | "branchId">) {
  if (!s.branchId) throw new ApiError(400, "Please choose a branch first.");
  const b = await prisma.branch.findFirst({ where: { id: s.branchId, restaurantId: s.restaurantId }, include: { restaurant: true } });
  if (!b) throw new ApiError(404, "Branch not found.");
  return { branch: b, features: resolveFeatures(b.features, b.restaurant.type as RestaurantTypeName) };
}

export async function loadOrder(s: Pick<Session, "restaurantId" | "branchId">, id: string) {
  const o = await prisma.order.findFirst({ where: { id, restaurantId: s.restaurantId, branchId: s.branchId ?? undefined }, include: ORDER_INCLUDE });
  if (!o) throw new ApiError(404, "Order not found.");
  return o;
}

export const CreateOrderSchema = z.object({
  type: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY", "ONLINE", "QR"]),
  tableId: z.string().nullable().optional(), customerName: z.string().max(80).optional(), customerPhone: z.string().max(15).optional(),
  guests: z.number().int().min(1).max(50).default(1), notes: z.string().max(300).optional(), items: z.array(LineSchema).default([]),
  send: z.boolean().default(false), hold: z.boolean().default(false), clientId: z.string().max(64).optional(),
  deliveryAddress: z.string().max(300).optional(), source: z.string().max(20).optional(), status: z.enum(["OPEN", "PENDING_APPROVAL"]).optional(),
  deliveryCharge: z.number().int().min(0).max(100000).optional(), deliveryZoneId: z.string().optional(), externalId: z.string().max(64).optional(),
});
type CreateIn = z.infer<typeof CreateOrderSchema>;

/** Create an order. Idempotent on clientId (offline sync sends the same clientId again). */
export async function createOrder(s: Pick<Session, "restaurantId" | "branchId" | "sub">, d: CreateIn) {
  if (d.clientId) {
    const existing = await prisma.order.findUnique({ where: { clientId: d.clientId } });
    if (existing) { if (existing.restaurantId !== s.restaurantId) throw new ApiError(409, "Duplicate order id."); return { order: await loadOrder({ ...s, branchId: existing.branchId }, existing.id), duplicate: true }; }
  }
  const { branch, features } = await getBranchCtx(s);
  if (d.type === "DINE_IN" && features.tables && !d.tableId) throw new ApiError(400, "Please choose a table for dine-in.");
  if (d.tableId) {
    const t = await prisma.diningTable.findFirst({ where: { id: d.tableId, branchId: branch.id } });
    if (!t) throw new ApiError(400, "Table not found.");
  }
  const lines = await resolveLines(s.restaurantId, d.type, d.items);
  const today = todayStr();
  const order = await prisma.$transaction(async (tx) => {
    let tokenNo: number | null = null;
    if (features.tokens && d.type !== "DINE_IN") {
      const b = await tx.branch.findUniqueOrThrow({ where: { id: branch.id } });
      const t = nextToken(b.tokenCounter, b.tokenDate, today);
      await tx.branch.update({ where: { id: branch.id }, data: { tokenCounter: t.token, tokenDate: t.date } });
      tokenNo = t.token;
    }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const orderNo = (await tx.order.count({ where: { branchId: branch.id, createdAt: { gte: start } } })) + 1;
    const o = await tx.order.create({
      data: {
        restaurantId: s.restaurantId, branchId: branch.id, orderNo, tokenNo, type: d.type, tableId: d.tableId ?? null, waiterId: s.sub || null,
        customerName: d.customerName, customerPhone: d.customerPhone, guests: d.guests, notes: d.notes, clientId: d.clientId, deliveryAddress: d.deliveryAddress,
        source: d.source ?? "POS", status: d.status ?? (d.hold ? "HELD" : "OPEN"), deliveryCharge: d.deliveryCharge ?? 0, deliveryZoneId: d.deliveryZoneId, externalId: d.externalId,
        ...(d.type === "DELIVERY" ? { delivery: { create: { history: [{ status: "PENDING", at: new Date().toISOString() }] } } } : {}),
        packingCharge: d.type === "DINE_IN" || d.type === "QR" ? 0 : (branch.settings as any)?.packingChargePerItem * lines.reduce((n, l) => n + l.quantity, 0) || 0,
        items: { create: lines.map((l) => ({ ...l, addons: l.addons as any })) },
      },
    });
    if (d.tableId) await tx.diningTable.update({ where: { id: d.tableId }, data: { status: "OCCUPIED" } });
    if (d.send && !d.hold && o.status === "OPEN") await sendKotTx(tx, o.id, branch.id);
    return o;
  });
  const full = await loadOrder({ restaurantId: s.restaurantId, branchId: branch.id }, order.id);
  emitToBranch(branch.id, "order:new", { id: full.id });
  if (d.tableId) emitToBranch(branch.id, "table:updated", { id: d.tableId });
  if (full.kots.length) emitToBranch(branch.id, "kot:new", { orderId: full.id });
  return { order: full, duplicate: false };
}

export async function addItems(s: Pick<Session, "restaurantId" | "branchId">, orderId: string, items: LineIn[], send: boolean) {
  const o = await loadOrder(s, orderId);
  if (!["OPEN", "HELD", "DRAFT", "PENDING_APPROVAL"].includes(o.status)) throw new ApiError(400, "This order is closed. Start a new order.");
  const lines = await resolveLines(s.restaurantId, o.type, items);
  const pack = o.type === "DINE_IN" || o.type === "QR" ? 0 : ((await prisma.branch.findUnique({ where: { id: o.branchId } }))?.settings as any)?.packingChargePerItem || 0;
  await prisma.$transaction(async (tx) => {
    await tx.orderItem.createMany({ data: lines.map((l) => ({ ...l, addons: l.addons as any, orderId })) });
    if (pack) await tx.order.update({ where: { id: orderId }, data: { packingCharge: { increment: pack * lines.reduce((n, l) => n + l.quantity, 0) } } });
    if (send && o.status === "OPEN") await sendKotTx(tx, orderId, o.branchId);
  });
  if (send) emitToBranch(o.branchId, "kot:new", { orderId });
  emitToBranch(o.branchId, "order:updated", { id: orderId });
  return loadOrder(s, orderId);
}

/** Put all unsent items on a new KOT (kitchen order ticket). Extra items later create another KOT. */
export async function sendKotTx(tx: Prisma.TransactionClient, orderId: string, branchId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  const pending = unsentItems(items);
  if (!pending.length) return null;
  const o = await tx.order.update({ where: { id: orderId }, data: { kotCounter: { increment: 1 } } });
  const kot = await tx.kot.create({ data: { orderId, kotNo: o.kotCounter } });
  await tx.orderItem.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { kotId: kot.id } });
  await onItemsSold(tx, branchId, pending.map((p) => p.id));
  return kot;
}
export async function sendKot(s: Pick<Session, "restaurantId" | "branchId">, orderId: string) {
  const o = await loadOrder(s, orderId);
  if (o.status === "HELD") await prisma.order.update({ where: { id: orderId }, data: { status: "OPEN" } });
  if (!["OPEN", "HELD"].includes(o.status)) throw new ApiError(400, "Order cannot be sent to the kitchen in this state.");
  const kot = await prisma.$transaction((tx) => sendKotTx(tx, orderId, o.branchId));
  if (!kot) throw new ApiError(400, "Nothing new to send to the kitchen.");
  emitToBranch(o.branchId, "kot:new", { orderId });
  emitToRoom(`order:${orderId}`, "order:updated", { id: orderId });
  return loadOrder(s, orderId);
}

/** Check a manager/owner PIN for approvals (complimentary items, big discounts). Returns the approver. */
export async function verifyApprover(restaurantId: string, pin?: string) {
  if (!pin || !/^\d{4}$/.test(pin)) throw new ApiError(403, "Manager PIN is required for this.");
  const approvers = await prisma.user.findMany({ where: { restaurantId, active: true, role: { in: ["OWNER", "MANAGER"] }, pinHash: { not: null } } });
  for (const a of approvers) if (await checkSecret(pin, a.pinHash)) return a;
  throw new ApiError(403, "Manager PIN is wrong.");
}
