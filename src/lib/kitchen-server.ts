import { prisma } from "./db";
import { ApiError } from "./api";
import { Session } from "./session";
import { canTransition, KStatus, timestampsFor } from "./kitchen";
import { emitToBranch, emitToRoom } from "./realtime";

export async function setItemsStatus(s: Session, itemIds: string[], to: KStatus) {
  const items = await prisma.orderItem.findMany({ where: { id: { in: itemIds }, order: { restaurantId: s.restaurantId, branchId: s.branchId ?? undefined } }, include: { order: { include: { table: true } } } });
  if (!items.length) throw new ApiError(404, "Item not found.");
  const movable = items.filter((i) => i.kotId && canTransition(i.status as KStatus, to));
  if (!movable.length) throw new ApiError(400, `Cannot change to ${to}.`);
  await prisma.orderItem.updateMany({ where: { id: { in: movable.map((i) => i.id) } }, data: { status: to, ...timestampsFor(to) } });
  const branchId = items[0].order.branchId;
  emitToBranch(branchId, "item:status", { ids: movable.map((i) => i.id), status: to });
  for (const orderId of new Set(movable.map((i) => i.orderId))) emitToRoom(`order:${orderId}`, "order:updated", { id: orderId });
  if (to === "READY") {
    for (const i of movable) emitToBranch(branchId, "item:ready", { id: i.id, name: `${i.quantity}× ${i.name}`, table: i.order.table?.name ?? (i.order.tokenNo ? `Token ${i.order.tokenNo}` : `Order #${i.order.orderNo}`), waiterId: i.order.waiterId });
  }
  return { updated: movable.length };
}
