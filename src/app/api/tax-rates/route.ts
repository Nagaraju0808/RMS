import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("settings.manage");
  const d = await parseBody(req, z.object({ name: z.string().min(1), ratePercent: z.number().min(0).max(50), hsnSac: z.string().optional(), isDefault: z.boolean().optional() }));
  if (d.isDefault) await prisma.taxRate.updateMany({ where: { restaurantId: s.restaurantId }, data: { isDefault: false } });
  return ok(await prisma.taxRate.create({ data: { ...d, restaurantId: s.restaurantId } }), 201);
});
