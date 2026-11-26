// Stock moves automatically: items sent to the kitchen (sold) reduce stock by their recipe;
// cancelled items put it back. Runs inside the order transaction.
import type { Prisma } from "@prisma/client";
import { usageFor, isLow, Unit } from "./inventory";
import { emitToBranch } from "./realtime";

export async function onItemsSold(tx: Prisma.TransactionClient, branchId: string, itemIds: string[]) {
  if (!itemIds.length) return;
  const items = await tx.orderItem.findMany({ where: { id: { in: itemIds } }, include: { menuItem: { include: { recipe: { include: { ingredient: true } } } } } });
  const low: string[] = [];
  for (const it of items) {
    const lines = it.menuItem.recipe;
    if (!lines.length) continue;
    const usage = usageFor(lines.map((l) => ({ ...l, unit: l.unit as Unit })), lines.map((l) => ({ id: l.ingredient.id, unit: l.ingredient.unit as Unit, costPerUnit: l.ingredient.costPerUnit })), it.variantId, it.quantity);
    for (const [ingredientId, qty] of usage) {
      const lvl = await tx.stockLevel.upsert({ where: { branchId_ingredientId: { branchId, ingredientId } }, update: { quantity: { decrement: qty } }, create: { branchId, ingredientId, quantity: -qty } });
      await tx.stockMove.create({ data: { stockLevelId: lvl.id, type: "SALE", quantity: -qty, refId: it.id, reason: it.name } });
      const ing = lines.find((l) => l.ingredientId === ingredientId)!.ingredient;
      if (isLow(lvl.quantity, ing.reorderLevel) && !isLow(lvl.quantity + qty, ing.reorderLevel)) low.push(ing.name);
    }
  }
  for (const name of low) emitToBranch(branchId, "stock:low", { name });
}

export async function onItemsCancelled(tx: Prisma.TransactionClient, _branchId: string, itemIds: string[]) {
  if (!itemIds.length) return;
  const sales = await tx.stockMove.findMany({ where: { type: "SALE", refId: { in: itemIds } } });
  const returned = await tx.stockMove.findMany({ where: { type: "CANCEL_RETURN", refId: { in: itemIds } }, select: { refId: true, stockLevelId: true } });
  for (const m of sales) {
    if (returned.some((r) => r.refId === m.refId && r.stockLevelId === m.stockLevelId)) continue; // already returned once
    await tx.stockLevel.update({ where: { id: m.stockLevelId }, data: { quantity: { increment: -m.quantity } } });
    await tx.stockMove.create({ data: { stockLevelId: m.stockLevelId, type: "CANCEL_RETURN", quantity: -m.quantity, refId: m.refId, reason: "Item cancelled" } });
  }
}
