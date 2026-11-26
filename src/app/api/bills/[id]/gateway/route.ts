import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { getGateway } from "@/lib/services/payments";
import { recordPayments } from "@/lib/bill-service";

/** Online payment through the gateway (Razorpay test mode or mock). POST {} → create; POST {verify:{…}} → confirm. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const d = await parseBody(req, z.object({ verify: z.object({ orderId: z.string(), paymentId: z.string().optional(), signature: z.string().optional() }).optional() }));
  const bill = await prisma.bill.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  const g = getGateway();
  if (!d.verify) return ok(await g.createOrder(bill.total - bill.paid, bill.billNo));
  const v = await g.verify(d.verify);
  if (!v.ok) throw new ApiError(400, "Payment could not be verified.");
  return ok(await recordPayments(s.restaurantId, id, [{ mode: "ONLINE", amount: bill.total - bill.paid, gateway: g.name, gatewayRef: v.ref }]));
});
