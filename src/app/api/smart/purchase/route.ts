import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";
import { forecastAll, forecastIngredientUse } from "@/lib/smart-server";
import { purchaseNeed } from "@/lib/smart";
import { costOf, formatQty, Unit } from "@/lib/inventory";
/** "Order 12 kg chicken": forecast use (next N days, default 2) + 20% safety − stock now. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("ai.use"); const branchId = requireBranch(s);
  const days = Math.min(14, Math.max(1, Number(req.nextUrl.searchParams.get("days") || 2)));
  const fc = await forecastAll([branchId], days);
  const use = await forecastIngredientUse(s.restaurantId, fc);
  const ings = await prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId }, include: { stock: { where: { branchId } } } });
  const rows = ings.map((i) => {
    const u = use.get(i.id) ?? 0, stock = i.stock[0]?.quantity ?? 0, unit = i.unit as Unit;
    const need = purchaseNeed(u, stock, 20, unit === "PCS" ? 1 : 500);
    return { id: i.id, name: i.name, unit, expectedUse: Math.round(u), stock: Math.round(stock), order: need, orderText: need ? formatQty(need, unit) : "", cost: costOf(need, unit, i.costPerUnit) };
  }).filter((r) => r.expectedUse > 0).sort((a, b) => b.order - a.order);
  return ok({ days, rows, totalCost: rows.reduce((a, r) => a + r.cost, 0), note: `Based on the next ${days} day(s) of forecast sales and each dish's recipe, plus 20% extra for safety.` });
});
