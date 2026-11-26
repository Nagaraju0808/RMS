import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
export const GET = handler(async () => {
  const s = await requireSession("orders.discount");
  return ok(await prisma.coupon.findMany({ where: { restaurantId: s.restaurantId }, orderBy: { code: "asc" } }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("customers.manage");
  const d = await parseBody(req, z.object({ code: z.string().min(3).max(20).regex(/^[A-Za-z0-9]+$/), type: z.enum(["PERCENT", "FLAT"]), value: z.number().int().min(1), minOrder: z.number().int().min(0).default(0), maxDiscount: z.number().int().nullable().optional(), validTo: z.string().nullable().optional(), usageLimit: z.number().int().nullable().optional() }));
  return ok(await prisma.coupon.create({ data: { ...d, code: d.code.toUpperCase(), validTo: d.validTo ? new Date(d.validTo) : null, restaurantId: s.restaurantId } }), 201);
});
