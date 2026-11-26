import { Prisma } from "@prisma/client";
import { localTs } from "@/lib/sql-tz";
import { prisma } from "./db";
import { coOccurrence, forecastItem, trendPercent } from "./smart";
import { usageFor, Unit } from "./inventory";

/** Daily quantities per menu item for the last `days` days (paid orders). */
export async function dailyItemSales(branchIds: string[], days = 56) {
  const since = new Date(); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - days);
  return prisma.$queryRaw<{ id: string; name: string; date: string; qty: number }[]>`
    SELECT oi."menuItemId" AS id, m.name, to_char(${localTs('o."createdAt"')}, 'YYYY-MM-DD') AS date, SUM(oi.quantity)::int AS qty
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "MenuItem" m ON m.id = oi."menuItemId"
    WHERE o."branchId" IN (${Prisma.join(branchIds)}) AND o.status = 'PAID' AND oi.status <> 'CANCELLED' AND o."createdAt" >= ${since}
    GROUP BY 1, 2, 3`;
}
export async function forecastAll(branchIds: string[], days = 7) {
  const rows = await dailyItemSales(branchIds);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const byItem = new Map<string, { name: string; daily: { date: string; qty: number }[] }>();
  for (const r of rows) { const x = byItem.get(r.id) ?? { name: r.name, daily: [] }; x.daily.push({ date: r.date, qty: Number(r.qty) }); byItem.set(r.id, x); }
  return [...byItem.entries()].map(([id, x]) => {
    const f = forecastItem(x.daily, start, days);
    return { id, name: x.name, days: f, total: Math.round(f.reduce((a, d) => a + d.qty, 0)), trend: trendPercent(x.daily, start) };
  }).sort((a, b) => b.total - a.total);
}
/** Ingredient use expected from the item forecast (recipes, all sizes averaged as "no variant"). */
export async function forecastIngredientUse(restaurantId: string, forecast: { id: string; total: number }[]) {
  const items = await prisma.menuItem.findMany({ where: { restaurantId, id: { in: forecast.map((f) => f.id) } }, include: { recipe: { include: { ingredient: true } }, variants: true } });
  const use = new Map<string, number>();
  for (const f of forecast) {
    const it = items.find((i) => i.id === f.id); if (!it?.recipe.length) continue;
    const vId = it.variants[0]?.id ?? null; // most items sell their first size most often
    const u = usageFor(it.recipe.map((l) => ({ ...l, unit: l.unit as Unit })), it.recipe.map((l) => ({ id: l.ingredient.id, unit: l.ingredient.unit as Unit, costPerUnit: l.ingredient.costPerUnit })), vId, f.total);
    for (const [k, v] of u) use.set(k, (use.get(k) ?? 0) + v);
  }
  return use;
}
/** Items often ordered together with `ids` (last 60 days). */
export async function upsellFor(restaurantId: string, ids: string[]) {
  const since = new Date(Date.now() - 60 * 86400_000);
  const rows = await prisma.$queryRaw<{ o: string; m: string }[]>`
    SELECT oi."orderId" AS o, oi."menuItemId" AS m FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId"
    WHERE o."restaurantId" = ${restaurantId} AND o.status = 'PAID' AND o."createdAt" >= ${since}
      AND oi."orderId" IN (SELECT "orderId" FROM "OrderItem" WHERE "menuItemId" IN (${Prisma.join(ids)}))`;
  const orders = new Map<string, string[]>();
  for (const r of rows) orders.set(r.o, [...(orders.get(r.o) ?? []), r.m]);
  const avail = new Set((await prisma.menuItem.findMany({ where: { restaurantId, active: true, inStock: true }, select: { id: true } })).map((x) => x.id));
  return coOccurrence([...orders.values()], ids, 6).filter((x) => avail.has(x.id)).slice(0, 3);
}
