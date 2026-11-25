import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";
/** Delivery orders of the last 24 hours + delivery people. */
export const GET = handler(async () => {
  const s = await requireSession("delivery.manage"); const branchId = requireBranch(s);
  const [orders, riders] = await Promise.all([
    prisma.order.findMany({ where: { branchId, restaurantId: s.restaurantId, type: "DELIVERY", createdAt: { gte: new Date(Date.now() - 86400_000) } }, include: { delivery: { include: { rider: { select: { id: true, name: true } } } }, items: true, bills: true }, orderBy: { createdAt: "desc" } }),
    prisma.user.findMany({ where: { restaurantId: s.restaurantId, role: "DELIVERY", active: true, OR: [{ branchId }, { branchId: null }] }, select: { id: true, name: true, phone: true } }),
  ]);
  return ok({ orders, riders });
});
