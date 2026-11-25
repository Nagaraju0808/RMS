import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
import { dishCost, foodCostPercent, Unit } from "@/lib/inventory";
/** Cost of each dish from its recipe, and food cost % of the dine-in price. */
export const GET = handler(async () => {
  const s = await requireSession("inventory.view");
  const [items, ings] = await Promise.all([
    prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId, active: true }, include: { recipe: true, variants: true, category: true }, orderBy: { name: "asc" } }),
    prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId } }),
  ]);
  const info = ings.map((i) => ({ id: i.id, unit: i.unit as Unit, costPerUnit: i.costPerUnit }));
  return ok(items.flatMap((it) => {
    const rows = it.variants.length ? it.variants.map((v) => ({ v, price: v.priceDineIn })) : [{ v: null as any, price: it.priceDineIn }];
    return rows.map(({ v, price }) => {
      const hasRecipe = it.recipe.length > 0;
      const cost = hasRecipe ? dishCost(it.recipe.map((l) => ({ ...l, unit: l.unit as Unit })), info, v?.id ?? null) : it.costPrice;
      return { menuItemId: it.id, name: v ? `${it.name} (${v.name})` : it.name, category: it.category.name, price, cost, foodCostPercent: foodCostPercent(cost, price), fromRecipe: hasRecipe, profit: price - cost };
    });
  }));
});
