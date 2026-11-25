import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { DEFAULT_SETTINGS, defaultFeatures } from "@/lib/features";
import { audit } from "@/lib/audit";

const Body = z.object({
  name: z.string().min(1), logoUrl: z.string().nullable().optional(),
  type: z.enum(["FINE_DINING", "QSR", "CAFE", "CLOUD_KITCHEN", "BAR", "FOOD_TRUCK", "CHAIN"]),
  currency: z.string().length(3).default("INR"), languages: z.array(z.string()).min(1).default(["en"]),
  gstin: z.string().max(15).optional(), taxPercent: z.number().min(0).max(50).default(5), serviceChargePercent: z.number().min(0).max(30).default(0),
  stateCode: z.string().default("36"),
  branches: z.array(z.object({ name: z.string().min(1), address: z.string().optional() })).min(1),
});
/** Onboarding wizard: saves everything at once. Restaurant type switches features on/off. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("settings.manage");
  const d = await parseBody(req, Body);
  const features = defaultFeatures(d.type);
  const settings = { ...DEFAULT_SETTINGS, serviceChargePercent: d.serviceChargePercent };
  await prisma.$transaction(async (tx) => {
    await tx.restaurant.update({ where: { id: s.restaurantId }, data: { name: d.name, logoUrl: d.logoUrl, type: d.type, currency: d.currency, languages: d.languages, gstin: d.gstin, onboarded: true } });
    const existing = await tx.branch.findMany({ where: { restaurantId: s.restaurantId }, orderBy: { createdAt: "asc" } });
    for (const [i, b] of d.branches.entries()) {
      if (existing[i]) await tx.branch.update({ where: { id: existing[i].id }, data: { ...b, features, settings, stateCode: d.stateCode } });
      else await tx.branch.create({ data: { ...b, restaurantId: s.restaurantId, features, settings, stateCode: d.stateCode } });
    }
    await tx.taxRate.updateMany({ where: { restaurantId: s.restaurantId }, data: { isDefault: false } });
    const t = await tx.taxRate.findFirst({ where: { restaurantId: s.restaurantId, ratePercent: d.taxPercent } });
    if (t) await tx.taxRate.update({ where: { id: t.id }, data: { isDefault: true } });
    else await tx.taxRate.create({ data: { restaurantId: s.restaurantId, name: `GST ${d.taxPercent}%`, ratePercent: d.taxPercent, isDefault: true } });
  });
  await audit(s, "ONBOARDING", "Restaurant", s.restaurantId, { type: d.type, branches: d.branches.length });
  return ok({ ok: true, features });
});
