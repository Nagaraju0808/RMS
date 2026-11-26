import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { emitToBranch } from "@/lib/realtime";
import { recordFeedback } from "@/lib/feedback";

/** Customer rating after the meal (one per order). */
export const POST = handler(async (req: NextRequest) => {
  if (!rateLimit(`fb:${clientIp(req)}`, 5, 60_000)) throw new ApiError(429, "Too many requests.");
  const d = await parseBody(req, z.object({ orderId: z.string(), rating: z.number().int().min(1).max(5), foodRating: z.number().int().min(1).max(5).optional(), serviceRating: z.number().int().min(1).max(5).optional(), comment: z.string().max(1000).optional() }));
  const o = await prisma.order.findUnique({ where: { id: d.orderId } });
  if (!o) throw new ApiError(404, "Order not found.");
  if (await prisma.feedback.findFirst({ where: { orderId: o.id } })) throw new ApiError(409, "Thanks! You already rated this meal.");
  const fb = await recordFeedback(o, d);
  if (d.rating <= 2) emitToBranch(o.branchId, "feedback:low", { rating: d.rating, comment: d.comment, orderNo: o.orderNo });
  return ok({ ok: true, id: fb.id }, 201);
});
