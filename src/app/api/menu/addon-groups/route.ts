import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { AddonGroupInput } from "@/lib/schemas";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const { addons, ...d } = await parseBody(req, AddonGroupInput);
  return ok(await prisma.addonGroup.create({ data: { ...d, restaurantId: s.restaurantId, addons: { create: addons } } }), 201);
});
