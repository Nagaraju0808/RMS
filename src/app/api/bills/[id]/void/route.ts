import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
/** Cancel an unpaid bill so the order can be changed (e.g. add items or change discount). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const { reason } = await parseBody(req, z.object({ reason: z.string().max(200).default("Re-bill") }));
  const bill = await prisma.bill.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { order: true } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  if (bill.paid > 0) throw new ApiError(400, "This bill has payments. Refund first.");
  await prisma.$transaction(async (tx) => {
    await tx.bill.updateMany({ where: { orderId: bill.orderId, paid: 0, status: { in: ["OPEN"] } }, data: { status: "VOID" } });
    const left = await tx.bill.count({ where: { orderId: bill.orderId, status: { not: "VOID" } } });
    if (!left) {
      await tx.order.update({ where: { id: bill.orderId }, data: { status: "OPEN" } });
      if (bill.order.tableId) await tx.diningTable.update({ where: { id: bill.order.tableId }, data: { status: "OCCUPIED" } });
      if (bill.order.couponCode) await tx.coupon.updateMany({ where: { restaurantId: s.restaurantId, code: bill.order.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
    }
  });
  await audit(s, "VOID_BILL", "Bill", id, { billNo: bill.billNo, reason });
  return ok({ ok: true });
});
