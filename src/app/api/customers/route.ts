import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { inSegment, normalizePhone } from "@/lib/loyalty";
/** Customer list. ?q= search name/phone, ?segment= campaign segment. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("customers.manage");
  const q = req.nextUrl.searchParams.get("q")?.trim(); const seg = req.nextUrl.searchParams.get("segment");
  const list = await prisma.customer.findMany({ where: { restaurantId: s.restaurantId, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] } : {}) }, include: { tier: true }, orderBy: { totalSpend: "desc" }, take: 500 });
  return ok(seg ? list.filter((c) => inSegment(c, seg)) : list);
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("customers.manage");
  const d = await parseBody(req, z.object({ phone: z.string().min(10).max(15), name: z.string().max(80).optional(), email: z.string().email().optional().or(z.literal("")), birthday: z.string().regex(/^\d{2}-\d{2}$/, "Use MM-DD").optional().or(z.literal("")), anniversary: z.string().regex(/^\d{2}-\d{2}$/, "Use MM-DD").optional().or(z.literal("")) }));
  const phone = normalizePhone(d.phone);
  const data = { name: d.name, email: d.email || null, birthday: d.birthday || null, anniversary: d.anniversary || null };
  return ok(await prisma.customer.upsert({ where: { restaurantId_phone: { restaurantId: s.restaurantId, phone } }, update: data, create: { ...data, phone, restaurantId: s.restaurantId } }), 201);
});
