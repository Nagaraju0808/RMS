import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
export const GET = handler(async () => {
  const s = await requireSession("menu.view");
  return ok(await prisma.kitchenStation.findMany({ where: { restaurantId: s.restaurantId } }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const { name } = await parseBody(req, z.object({ name: z.string().min(1) }));
  return ok(await prisma.kitchenStation.create({ data: { name, restaurantId: s.restaurantId } }), 201);
});
