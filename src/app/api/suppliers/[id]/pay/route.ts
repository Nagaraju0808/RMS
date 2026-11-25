import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
/** Record a payment to a supplier (oldest unpaid POs are marked paid first). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("inventory.manage"); const { id } = await params;
  const d = await parseBody(req, z.object({ amount: z.number().int().min(1), mode: z.enum(["CASH", "CARD", "UPI", "WALLET", "ONLINE"]) }));
  const sup = await prisma.supplier.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { purchaseOrders: { where: { status: { in: ["RECEIVED", "PARTIAL"] } }, orderBy: { createdAt: "asc" } } } });
  if (!sup) notFound("Supplier");
  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.create({ data: { supplierId: id, amount: d.amount, mode: d.mode } });
    let left = d.amount;
    for (const po of sup.purchaseOrders) { if (left <= 0) break; const pay = Math.min(left, po.total - po.paid); if (pay > 0) { await tx.purchaseOrder.update({ where: { id: po.id }, data: { paid: { increment: pay } } }); left -= pay; } }
  });
  await audit(s, "SUPPLIER_PAYMENT", "Supplier", id, d);
  return ok({ ok: true });
});
