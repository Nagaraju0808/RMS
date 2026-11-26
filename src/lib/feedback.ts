import type { Order } from "@prisma/client";
import { prisma } from "./db";
import { sendMessage } from "./services/messaging";
/** Save a rating. Ratings of 2★ or less also message the branch managers/owner (mock sender) – the live alert is sent by the caller. */
export async function recordFeedback(o: Order, d: { rating: number; foodRating?: number; serviceRating?: number; comment?: string }) {
  const fb = await prisma.feedback.create({ data: { orderId: o.id, customerId: o.customerId, branchId: o.branchId, rating: d.rating, foodRating: d.foodRating, serviceRating: d.serviceRating, comment: d.comment } });
  if (d.rating <= 2) {
    const managers = await prisma.user.findMany({ where: { restaurantId: o.restaurantId, active: true, phone: { not: null }, OR: [{ role: "OWNER" }, { role: "MANAGER", branchId: o.branchId }] } });
    for (const m of managers) await sendMessage(o.restaurantId, "WHATSAPP", m.phone!, `Low rating ${d.rating} of 5 on order #${o.orderNo}: ${d.comment ?? "(no comment)"}`);
  }
  return fb;
}
