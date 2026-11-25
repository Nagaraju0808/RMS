import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { fillTemplate, inSegment } from "@/lib/loyalty";
import { sendMessage } from "@/lib/services/messaging";
import { audit } from "@/lib/audit";
export const GET = handler(async () => {
  const s = await requireSession("customers.manage");
  const [campaigns, log] = await Promise.all([prisma.campaign.findMany({ where: { restaurantId: s.restaurantId }, orderBy: { createdAt: "desc" } }), prisma.messageLog.findMany({ where: { restaurantId: s.restaurantId }, orderBy: { createdAt: "desc" }, take: 50 })]);
  return ok({ campaigns, log });
});
/** Send an offer to a customer group (SMS/WhatsApp/email – mock provider). Can create a coupon for it. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("customers.manage");
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(80), channel: z.enum(["SMS", "WHATSAPP", "EMAIL"]), segment: z.string().min(1), message: z.string().min(5).max(500), coupon: z.object({ code: z.string().regex(/^[A-Za-z0-9]{3,20}$/), type: z.enum(["PERCENT", "FLAT"]), value: z.number().int().min(1), validDays: z.number().int().min(1).max(365).default(30) }).optional() }));
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId } });
  const customers = (await prisma.customer.findMany({ where: { restaurantId: s.restaurantId } })).filter((c) => inSegment(c, d.segment));
  if (!customers.length) throw new ApiError(400, "No customers in this group.");
  const camp = await prisma.campaign.create({ data: { restaurantId: s.restaurantId, name: d.name, channel: d.channel, segment: d.segment, message: d.message, couponCode: d.coupon?.code.toUpperCase() } });
  if (d.coupon) await prisma.coupon.upsert({ where: { restaurantId_code: { restaurantId: s.restaurantId, code: d.coupon.code.toUpperCase() } }, update: { active: true, validTo: new Date(Date.now() + d.coupon.validDays * 86400_000) }, create: { restaurantId: s.restaurantId, code: d.coupon.code.toUpperCase(), type: d.coupon.type, value: d.coupon.value, validTo: new Date(Date.now() + d.coupon.validDays * 86400_000), campaignId: camp.id } });
  let sent = 0;
  for (const c of customers) {
    const to = d.channel === "EMAIL" ? c.email : c.phone; if (!to) continue;
    await sendMessage(s.restaurantId, d.channel, to, fillTemplate(d.message, { name: c.name, points: c.points, coupon: d.coupon?.code.toUpperCase(), restaurant: r.name })); sent++;
  }
  await prisma.campaign.update({ where: { id: camp.id }, data: { sentCount: sent } });
  await audit(s, "CAMPAIGN_SENT", "Campaign", camp.id, { segment: d.segment, sent });
  return ok({ sent }, 201);
});
