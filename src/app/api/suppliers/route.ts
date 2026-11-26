import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
/** Suppliers with amount due (ordered/received POs total − paid). */
export const GET = handler(async () => {
  const s = await requireSession("inventory.manage");
  const sup = await prisma.supplier.findMany({ where: { restaurantId: s.restaurantId }, include: { purchaseOrders: { where: { status: { in: ["RECEIVED", "PARTIAL"] } } }, payments: true }, orderBy: { name: "asc" } });
  return ok(sup.map((x) => {
    const billed = x.purchaseOrders.reduce((a, p) => a + p.total, 0), paid = x.payments.reduce((a, p) => a + p.amount, 0);
    const overdue = x.purchaseOrders.some((p) => p.dueDate && p.dueDate < new Date() && p.paid < p.total);
    return { id: x.id, name: x.name, phone: x.phone, email: x.email, gstin: x.gstin, billed, paid, due: billed - paid, overdue };
  }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("inventory.manage");
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(100), phone: z.string().max(15).optional(), email: z.string().email().optional().or(z.literal("")), gstin: z.string().max(15).optional() }));
  return ok(await prisma.supplier.create({ data: { ...d, email: d.email || null, restaurantId: s.restaurantId } }), 201);
});
