import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { getGateway } from "@/lib/services/payments";

export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.refund"); const { id } = await params;
  const d = await parseBody(req, z.object({ amount: z.number().int().min(1), mode: z.enum(["CASH", "CARD", "UPI", "WALLET", "ONLINE"]), reason: z.string().min(3, "Please give a reason").max(200) }));
  const bill = await prisma.bill.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { refunds: true, payments: true } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  const refunded = bill.refunds.reduce((a, r) => a + r.amount, 0);
  if (d.amount > bill.paid - refunded) throw new ApiError(400, `You can refund at most ₹${((bill.paid - refunded) / 100).toFixed(2)}.`);
  if (d.mode === "ONLINE") {
    const p = bill.payments.find((x) => x.mode === "ONLINE" && x.gatewayRef);
    if (!p) throw new ApiError(400, "No online payment found on this bill.");
    const r = await getGateway().refund(p.gatewayRef!, d.amount);
    if (!r.ok) throw new ApiError(502, "Payment gateway refund failed.");
  }
  await prisma.$transaction([
    prisma.refund.create({ data: { billId: id, amount: d.amount, mode: d.mode, reason: d.reason, userId: s.sub } }),
    prisma.bill.update({ where: { id }, data: { status: refunded + d.amount >= bill.paid ? "REFUNDED" : bill.status } }),
  ]);
  await audit(s, "REFUND", "Bill", id, { billNo: bill.billNo, amount: d.amount, mode: d.mode, reason: d.reason });
  return ok({ ok: true });
});
