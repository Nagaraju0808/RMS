import { prisma } from "./db";
import { ApiError } from "./api";
import { toBase, Unit } from "./inventory";
/** Add/remove stock with a reason. qty is in `unit` (converted to the ingredient's base unit). */
export async function moveStock(restaurantId: string, branchId: string, userId: string, d: { ingredientId: string; type: "PURCHASE" | "WASTAGE" | "ADJUSTMENT"; quantity: number; unit: Unit; reason?: string; expiryDate?: Date | null; refId?: string }) {
  const ing = await prisma.ingredient.findFirst({ where: { id: d.ingredientId, restaurantId } });
  if (!ing) throw new ApiError(404, "Ingredient not found.");
  let q: number;
  try { q = toBase(d.quantity, d.unit, ing.unit as Unit); } catch (e: any) { throw new ApiError(400, e.message); }
  const signed = d.type === "WASTAGE" ? -Math.abs(q) : d.type === "PURCHASE" ? Math.abs(q) : q;
  return prisma.$transaction(async (tx) => {
    const lvl = await tx.stockLevel.upsert({ where: { branchId_ingredientId: { branchId, ingredientId: ing.id } }, update: { quantity: { increment: signed } }, create: { branchId, ingredientId: ing.id, quantity: signed } });
    await tx.stockMove.create({ data: { stockLevelId: lvl.id, type: d.type, quantity: signed, reason: d.reason, userId, refId: d.refId } });
    if (d.type === "PURCHASE") await tx.stockBatch.create({ data: { stockLevelId: lvl.id, quantity: signed, expiryDate: d.expiryDate ?? null } });
    if (signed < 0) { // use up oldest batches first (FIFO) so expiry tracking stays right
      let left = -signed;
      for (const b of await tx.stockBatch.findMany({ where: { stockLevelId: lvl.id, quantity: { gt: 0 } }, orderBy: [{ expiryDate: "asc" }, { receivedAt: "asc" }] })) {
        if (left <= 0) break; const take = Math.min(b.quantity, left); left -= take;
        await tx.stockBatch.update({ where: { id: b.id }, data: { quantity: b.quantity - take } });
      }
    }
    return lvl;
  });
}
