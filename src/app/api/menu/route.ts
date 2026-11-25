import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";

/** Full menu tree for the logged-in restaurant (staff). */
export const GET = handler(async () => {
  const s = await requireSession("menu.view");
  const rid = s.restaurantId;
  const [categories, items, addonGroups, combos, schedules, stations, taxRates] = await Promise.all([
    prisma.category.findMany({ where: { restaurantId: rid }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.menuItem.findMany({ where: { restaurantId: rid }, include: { variants: { orderBy: { sortOrder: "asc" } }, addonGroups: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.addonGroup.findMany({ where: { restaurantId: rid }, include: { addons: true } }),
    prisma.combo.findMany({ where: { restaurantId: rid }, include: { items: true } }),
    prisma.menuSchedule.findMany({ where: { restaurantId: rid } }),
    prisma.kitchenStation.findMany({ where: { restaurantId: rid } }),
    prisma.taxRate.findMany({ where: { restaurantId: rid } }),
  ]);
  return ok({ categories, items: items.map((i) => ({ ...i, addonGroupIds: i.addonGroups.map((g) => g.groupId) })), addonGroups, combos, schedules, stations, taxRates });
});
