import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { defaultFeatures, resolveFeatures, resolveSettings, RestaurantTypeName } from "@/lib/features";
import { audit } from "@/lib/audit";

export const GET = handler(async () => {
  const s = await requireSession("branch.manage");
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId }, include: { branches: { orderBy: { createdAt: "asc" } }, taxRates: true, tiers: true } });
  return ok({ ...r, branches: r.branches.map((b) => ({ ...b, features: resolveFeatures(b.features, r.type as RestaurantTypeName), settings: resolveSettings(b.settings) })) });
});
const Body = z.object({
  name: z.string().min(1).max(100).optional(), logoUrl: z.string().max(500).nullable().optional(),
  type: z.enum(["FINE_DINING", "QSR", "CAFE", "CLOUD_KITCHEN", "BAR", "FOOD_TRUCK", "CHAIN"]).optional(),
  currency: z.string().length(3).optional(), country: z.string().length(2).optional(), languages: z.array(z.string()).min(1).optional(),
  gstin: z.string().max(15).nullable().optional(), applyTypeDefaults: z.boolean().optional(),
  loyaltyEarnPer100: z.number().int().min(0).optional(), loyaltyPointValue: z.number().int().min(0).optional(),
});
export const PUT = handler(async (req: NextRequest) => {
  const s = await requireSession("settings.manage");
  const { applyTypeDefaults, ...d } = await parseBody(req, Body);
  await prisma.restaurant.update({ where: { id: s.restaurantId }, data: d });
  if (d.type && applyTypeDefaults) await prisma.branch.updateMany({ where: { restaurantId: s.restaurantId }, data: { features: defaultFeatures(d.type) } });
  await audit(s, "SETTINGS_CHANGE", "Restaurant", s.restaurantId, d);
  return ok({ ok: true });
});
