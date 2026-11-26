import { prisma } from "./db";
import { ApiError } from "./api";
import { canMoveDelivery } from "./reservations";
import { emitToBranch, emitToRoom } from "./realtime";
import { sendMessage } from "./services/messaging";

export async function moveDelivery(restaurantId: string, orderId: string, to: string, by: { id: string; role: string; name: string }, riderId?: string) {
  const o = await prisma.order.findFirst({ where: { id: orderId, restaurantId }, include: { delivery: true } });
  if (!o?.delivery) throw new ApiError(404, "Delivery not found.");
  const d = o.delivery;
  if (by.role === "DELIVERY" && d.riderId !== by.id) throw new ApiError(403, "This delivery is not assigned to you.");
  if (to === "ASSIGNED") {
    if (!riderId) throw new ApiError(400, "Choose a delivery person.");
    const rider = await prisma.user.findFirst({ where: { id: riderId, restaurantId, role: "DELIVERY", active: true } });
    if (!rider) throw new ApiError(400, "Delivery person not found.");
    if (!["PENDING", "ASSIGNED"].includes(d.status)) throw new ApiError(400, "Already picked up.");
  } else if (!canMoveDelivery(d.status, to)) throw new ApiError(400, `Cannot change from ${d.status} to ${to}.`);
  const history = [...((d.history as any[]) || []), { status: to, at: new Date().toISOString(), by: by.name }];
  await prisma.delivery.update({ where: { id: d.id }, data: { status: to as any, riderId: to === "ASSIGNED" ? riderId : undefined, history } });
  if (to === "ON_THE_WAY" && o.customerPhone) await sendMessage(restaurantId, "SMS", o.customerPhone, `Your order #${o.orderNo} is on the way! Track: /track/${d.trackToken}`);
  emitToBranch(o.branchId, "delivery:updated", { orderId });
  emitToRoom(`delivery:${d.trackToken}`, "delivery:updated", { status: to });
  return { ok: true };
}
