import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { createOrder, CreateOrderSchema, ORDER_INCLUDE } from "@/lib/order-service";

/** List orders. ?status=OPEN,HELD  ?active=1 (not paid/cancelled)  ?type=TAKEAWAY  ?limit=50 */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.view"); const branchId = requireBranch(s);
  const sp = req.nextUrl.searchParams;
  const status = sp.get("status")?.split(",").filter(Boolean);
  const where: any = { restaurantId: s.restaurantId, branchId };
  if (status?.length) where.status = { in: status };
  else if (sp.get("active")) where.status = { in: ["OPEN", "HELD", "BILLED", "PENDING_APPROVAL"] };
  if (sp.get("type")) where.type = sp.get("type");
  if (s.role === "WAITER" && sp.get("mine")) where.waiterId = s.sub;
  const orders = await prisma.order.findMany({ where, include: ORDER_INCLUDE, orderBy: { createdAt: "desc" }, take: Math.min(Number(sp.get("limit") || 100), 500) });
  return ok(orders);
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.create");
  const d = await parseBody(req, CreateOrderSchema);
  const { order, duplicate } = await createOrder(s, d);
  return ok(order, duplicate ? 200 : 201);
});
