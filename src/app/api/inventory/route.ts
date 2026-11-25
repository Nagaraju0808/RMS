import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";
import { expiringSoon, isLow } from "@/lib/inventory";
/** Stock list for the branch with low-stock and expiry flags. */
export const GET = handler(async () => {
  const s = await requireSession("inventory.view"); const branchId = requireBranch(s);
  const ings = await prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId }, include: { stock: { where: { branchId }, include: { batches: { where: { quantity: { gt: 0 } } } } } }, orderBy: { name: "asc" } });
  return ok(ings.map((i) => {
    const lvl = i.stock[0];
    const qty = lvl?.quantity ?? 0;
    return { id: i.id, name: i.name, unit: i.unit, costPerUnit: i.costPerUnit, reorderLevel: i.reorderLevel, quantity: qty, low: isLow(qty, i.reorderLevel), value: Math.round(i.unit === "PCS" ? qty * i.costPerUnit : (qty / 1000) * i.costPerUnit),
      expiring: expiringSoon(lvl?.batches ?? [], 3).map((b) => ({ quantity: b.quantity, expiryDate: b.expiryDate })) };
  }));
});
