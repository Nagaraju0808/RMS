import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder, verifyApprover } from "@/lib/order-service";
import { audit } from "@/lib/audit";
import { APPROVER_ROLES } from "@/lib/roles";

/** Mark an item complimentary (free). Always needs a manager/owner (their own login, or their PIN). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const d = await parseBody(req, z.object({ itemId: z.string(), complimentary: z.boolean(), managerPin: z.string().optional(), reason: z.string().max(200).optional() }));
  const o = await loadOrder(s, id);
  const it = o.items.find((i) => i.id === d.itemId);
  if (!it) throw new ApiError(404, "Item not found.");
  const approver = APPROVER_ROLES.includes(s.role as any) ? s.name : (await verifyApprover(s.restaurantId, d.managerPin)).name;
  await prisma.orderItem.update({ where: { id: it.id }, data: { complimentary: d.complimentary } });
  await audit(s, d.complimentary ? "COMPLIMENTARY" : "COMPLIMENTARY_REMOVED", "OrderItem", it.id, { orderNo: o.orderNo, item: it.name, value: it.unitPrice * it.quantity, approvedBy: approver, reason: d.reason });
  return ok(await loadOrder(s, id));
});
