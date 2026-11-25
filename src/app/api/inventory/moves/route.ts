import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";
export const GET = handler(async () => {
  const s = await requireSession("inventory.view"); const branchId = requireBranch(s);
  return ok(await prisma.stockMove.findMany({ where: { stockLevel: { branchId } }, include: { stockLevel: { include: { ingredient: { select: { name: true, unit: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 }));
});
