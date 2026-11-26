import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { DEFAULT_SETTINGS, defaultFeatures, RestaurantTypeName } from "@/lib/features";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("settings.manage");
  const d = await parseBody(req, z.object({ name: z.string().min(1), address: z.string().optional(), phone: z.string().optional(), stateCode: z.string().optional() }));
  const r = await prisma.restaurant.findUniqueOrThrow({ where: { id: s.restaurantId } });
  return ok(await prisma.branch.create({ data: { ...d, restaurantId: s.restaurantId, features: defaultFeatures(r.type as RestaurantTypeName), settings: DEFAULT_SETTINGS } }), 201);
});
