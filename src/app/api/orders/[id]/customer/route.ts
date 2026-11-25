import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
import { normalizePhone } from "@/lib/loyalty";
/** Attach a customer (by phone) to an order: returns their profile so the cashier can see points. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const d = await parseBody(req, z.object({ phone: z.string().min(10).max(15), name: z.string().max(80).optional() }));
  const o = await loadOrder(s, id);
  const phone = normalizePhone(d.phone);
  const c = await prisma.customer.upsert({ where: { restaurantId_phone: { restaurantId: s.restaurantId, phone } }, update: d.name ? { name: d.name } : {}, create: { restaurantId: s.restaurantId, phone, name: d.name } });
  await prisma.order.update({ where: { id: o.id }, data: { customerId: c.id, customerPhone: phone, customerName: d.name ?? o.customerName ?? c.name } });
  return ok({ customer: c, order: await loadOrder(s, id) });
});
