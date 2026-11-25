import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { toBase, Unit } from "@/lib/inventory";
import { audit } from "@/lib/audit";
/** Physical stock count: sets the real quantity and records the difference. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("inventory.manage"); const branchId = requireBranch(s);
  const { counts } = await parseBody(req, z.object({ counts: z.array(z.object({ ingredientId: z.string(), quantity: z.number().min(0), unit: z.enum(["G", "KG", "ML", "L", "PCS"]) })).min(1) }));
  const ings = await prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId, id: { in: counts.map((c) => c.ingredientId) } } });
  const diffs: { name: string; diff: number }[] = [];
  await prisma.$transaction(async (tx) => {
    for (const c of counts) {
      const ing = ings.find((i) => i.id === c.ingredientId); if (!ing) continue;
      const real = toBase(c.quantity, c.unit, ing.unit as Unit);
      const lvl = await tx.stockLevel.upsert({ where: { branchId_ingredientId: { branchId, ingredientId: ing.id } }, update: {}, create: { branchId, ingredientId: ing.id, quantity: 0 } });
      const diff = real - lvl.quantity;
      await tx.stockLevel.update({ where: { id: lvl.id }, data: { quantity: real } });
      if (diff !== 0) { await tx.stockMove.create({ data: { stockLevelId: lvl.id, type: "COUNT", quantity: diff, reason: "Stock count", userId: s.sub } }); diffs.push({ name: ing.name, diff }); }
    }
  });
  await audit(s, "STOCK_COUNT", "Stock", null, { diffs });
  return ok({ diffs });
});
