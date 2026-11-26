import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("settings.manage");
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(30), minSpend: z.number().int().min(0), earnMultiplier: z.number().min(1).max(5).default(1) }));
  return ok(await prisma.membershipTier.create({ data: { ...d, restaurantId: s.restaurantId } }), 201);
});
