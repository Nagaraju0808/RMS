import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
/** Deliveries assigned to the logged-in rider. */
export const GET = handler(async () => {
  const s = await requireSession("delivery.ride");
  return ok(await prisma.delivery.findMany({ where: { riderId: s.sub, order: { restaurantId: s.restaurantId }, OR: [{ status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } }, { updatedAt: { gte: new Date(Date.now() - 12 * 3600_000) } }] }, include: { order: { include: { items: { where: { status: { not: "CANCELLED" } } }, bills: { where: { status: { not: "VOID" } } } } } }, orderBy: { updatedAt: "desc" } }));
});
