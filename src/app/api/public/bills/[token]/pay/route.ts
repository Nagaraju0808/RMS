import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody } from "@/lib/api";
import { getGateway } from "@/lib/services/payments";
import { recordPayments } from "@/lib/bill-service";
import { clientIp, rateLimit } from "@/lib/ratelimit";
/** Customer pays from their phone. POST {} → create gateway order; POST {verify} → confirm and mark paid. */
export const POST = handler(async (req: NextRequest, { params }) => {
  if (!rateLimit(`pubpay:${clientIp(req)}`, 30, 60_000)) throw new ApiError(429, "Too many requests.");
  const { token } = await params;
  const d = await parseBody(req, z.object({ verify: z.object({ orderId: z.string(), paymentId: z.string().optional(), signature: z.string().optional() }).optional(), tip: z.number().int().min(0).max(1_000_000).optional() }));
  const bill = await prisma.bill.findUnique({ where: { publicToken: token } });
  if (!bill || bill.status === "VOID") throw new ApiError(404, "Bill not found.");
  if (bill.paid >= bill.total) throw new ApiError(400, "This bill is already paid.");
  const g = getGateway();
  if (!d.verify) return ok(await g.createOrder(bill.total - bill.paid, bill.billNo));
  const v = await g.verify(d.verify);
  if (!v.ok) throw new ApiError(400, "Payment could not be verified.");
  return ok(await recordPayments(bill.restaurantId, bill.id, [{ mode: "ONLINE", amount: bill.total - bill.paid, tip: d.tip, gateway: g.name, gatewayRef: v.ref }]));
});
