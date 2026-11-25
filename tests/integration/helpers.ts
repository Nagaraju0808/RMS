import { prisma } from "@/lib/db";
import type { Session } from "@/lib/session";
export async function sessionFor(email: string): Promise<Session> {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  const branchId = u.branchId ?? (await prisma.branch.findFirstOrThrow({ where: { restaurantId: u.restaurantId }, orderBy: { createdAt: "asc" } })).id;
  return { sub: u.id, name: u.name, role: u.role, restaurantId: u.restaurantId, branchId, perms: [] };
}
export const item = (rid: string, name: string) => prisma.menuItem.findFirstOrThrow({ where: { restaurantId: rid, name }, include: { variants: true } });
export const stockOf = async (branchId: string, ingredient: string) => (await prisma.stockLevel.findFirstOrThrow({ where: { branchId, ingredient: { name: ingredient } } })).quantity;
