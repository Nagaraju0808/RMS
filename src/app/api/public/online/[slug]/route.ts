import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { resolveFeatures, RestaurantTypeName } from "@/lib/features";
import { itemAvailable, priceFor } from "@/lib/menu";
import { LineSchema } from "@/lib/order-service";
import { placeOnlineOrder } from "@/lib/online-service";

async function load(slug: string) {
  const r = await prisma.restaurant.findUnique({ where: { slug }, include: { branches: { orderBy: { createdAt: "asc" } } } });
  if (!r) notFound("Restaurant");
  const branches = r.branches.filter((b) => resolveFeatures(b.features, r.type as RestaurantTypeName).onlineOrders);
  return { r, branches };
}
/** Public online-ordering menu (online prices) and delivery zones. ?branch=<id> */
export const GET = handler(async (req: NextRequest, { params }) => {
  if (!rateLimit(`online:${clientIp(req)}`, 60, 60_000)) throw new ApiError(429, "Too many requests.");
  const { r, branches } = await load((await params).slug);
  const branch = branches.find((b) => b.id === req.nextUrl.searchParams.get("branch")) ?? branches[0];
  if (!branch) throw new ApiError(404, "Online ordering is not available.");
  const [cats, items, groups, schedules, zones, taxes] = await Promise.all([
    prisma.category.findMany({ where: { restaurantId: r.id, active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.menuItem.findMany({ where: { restaurantId: r.id, active: true }, include: { variants: { orderBy: { sortOrder: "asc" } }, addonGroups: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    prisma.addonGroup.findMany({ where: { restaurantId: r.id }, include: { addons: { where: { inStock: true } } } }),
    prisma.menuSchedule.findMany({ where: { restaurantId: r.id } }),
    prisma.deliveryZone.findMany({ where: { branchId: branch.id } }),
    prisma.taxRate.findMany({ where: { restaurantId: r.id } }),
  ]);
  const def = taxes.find((t) => t.isDefault)?.ratePercent ?? 0;
  const features = resolveFeatures(branch.features, r.type as RestaurantTypeName);
  return ok({
    restaurant: { name: r.name, logoUrl: r.logoUrl }, branches: branches.map((b) => ({ id: b.id, name: b.name, address: b.address })), branchId: branch.id, delivery: features.delivery,
    zones: zones.map((z) => ({ name: z.name, pincodes: z.pincodes, charge: z.charge, minOrder: z.minOrder, etaMins: z.etaMins })),
    categories: cats.map((c) => ({ id: c.id, name: c.name, nameI18n: c.nameI18n })),
    items: items.map((i) => ({ id: i.id, categoryId: i.categoryId, name: i.name, description: i.description, imageUrl: i.imageUrl, foodType: i.foodType, price: priceFor(i, "ONLINE"), priceDineIn: priceFor(i, "ONLINE"), available: itemAvailable(i, schedules), taxPercent: taxes.find((t) => t.id === i.taxRateId)?.ratePercent ?? def, variants: i.variants.map((v) => ({ id: v.id, name: v.name, priceDineIn: priceFor(v, "ONLINE") })), addonGroupIds: i.addonGroups.map((g) => g.groupId) })),
    addonGroups: groups.map((g) => ({ id: g.id, name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, addons: g.addons.map((a) => ({ id: a.id, name: a.name, price: a.price, inStock: true })) })),
  });
});
export const POST = handler(async (req: NextRequest, { params }) => {
  if (!rateLimit(`onlineorder:${clientIp(req)}`, 5, 60_000)) throw new ApiError(429, "Too many orders. Please wait a minute.");
  const { r, branches } = await load((await params).slug);
  const d = await parseBody(req, z.object({ branchId: z.string(), mode: z.enum(["DELIVERY", "PICKUP"]), items: z.array(LineSchema).min(1).max(40), customerName: z.string().min(1).max(80), customerPhone: z.string().regex(/^\+?\d{10,13}$/, "Phone number looks wrong"), address: z.string().max(300).optional(), pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits").optional(), notes: z.string().max(300).optional(), clientId: z.string().max(64).optional() }));
  if (!branches.some((b) => b.id === d.branchId)) throw new ApiError(400, "This branch does not take online orders.");
  return ok(await placeOnlineOrder(r.id, d.branchId, d), 201);
});
