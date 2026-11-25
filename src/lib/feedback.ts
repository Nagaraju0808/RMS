import type { Order } from "@prisma/client";
import { prisma } from "./db";
export async function recordFeedback(o: Order, d: { rating: number; foodRating?: number; serviceRating?: number; comment?: string }) {
  return prisma.feedback.create({ data: { orderId: o.id, customerId: o.customerId, branchId: o.branchId, rating: d.rating, foodRating: d.foodRating, serviceRating: d.serviceRating, comment: d.comment } });
}
