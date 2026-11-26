import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { tableByToken } from "@/lib/public-table";
import { itemAvailable, priceFor } from "@/lib/menu";

/** Public QR menu for one table. Only safe fields are returned (no cost prices). */
export const GET = handler(async (req: NextRequest, { params }) => {
  const { token } = await params;
  const { table, restaurant, settings } = await tableByToken(token, req);
  const rid = restaurant.id;
  const [cats, items, groups, schedules, taxes] = await Promise.all([
    prisma.category.findMany({ where: { restaurantId: rid, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.menuItem.findMany({ where: { restaurantId: rid, active: true }, include: { variants: { orderBy: { sortOrder: "asc" } }, addonGroups: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    prisma.addonGroup.findMany({ where: { restaurantId: rid }, include: { addons: { where: { inStock: true } } } }),
    prisma.menuSchedule.findMany({ where: { restaurantId: rid } }),
    prisma.taxRate.findMany({ where: { restaurantId: rid } }),
  ]);
  const def = taxes.find((t) => t.isDefault)?.ratePercent ?? 0;
  return ok({
    restaurant: { name: restaurant.name, logoUrl: restaurant.logoUrl, languages: restaurant.languages, currency: restaurant.currency },
    table: { name: table.name }, settings: { serviceChargePercent: settings.serviceChargePercent, qrAutoAccept: settings.qrAutoAccept, roundOff: settings.roundOff, interState: settings.interState },
    categories: cats.map((c) => ({ id: c.id, name: c.name, nameI18n: c.nameI18n })),
    items: items.map((i) => ({
      id: i.id, categoryId: i.categoryId, name: i.name, nameI18n: i.nameI18n, description: i.description, imageUrl: i.imageUrl, foodType: i.foodType, spiceLevel: i.spiceLevel, allergens: i.allergens,
      price: priceFor(i, "QR"), available: itemAvailable(i, schedules), taxPercent: taxes.find((t) => t.id === i.taxRateId)?.ratePercent ?? def,
      variants: i.variants.map((v) => ({ id: v.id, name: v.name, priceDineIn: priceFor(v, "QR") })), addonGroupIds: i.addonGroups.map((g) => g.groupId), scheduleIds: i.scheduleIds, inStock: i.inStock, active: i.active, priceDineIn: priceFor(i, "QR"),
    })),
    addonGroups: groups.map((g) => ({ id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, addons: g.addons.map((a) => ({ id: a.id, name: a.name, price: a.price, inStock: a.inStock })) })),
    schedules: schedules.map((s) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, days: s.days, discountPercent: s.discountPercent })),
  });
});
