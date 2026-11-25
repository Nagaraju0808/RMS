import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
import { emitToBranch } from "@/lib/realtime";

export const GET = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("orders.view"); const { id } = await params;
  return ok(await loadOrder(s, id));
});
/** Update order details (customer, guests, notes). */
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const o = await loadOrder(s, id);
  const d = await parseBody(req, z.object({ customerName: z.string().max(80).nullable(), customerPhone: z.string().max(15).nullable(), guests: z.number().int().min(1).max(50), notes: z.string().max(300).nullable(), deliveryAddress: z.string().max(300).nullable() }).partial());
  await prisma.order.update({ where: { id: o.id }, data: d });
  emitToBranch(o.branchId, "order:updated", { id });
  return ok(await loadOrder(s, id));
});
