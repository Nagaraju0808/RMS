import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { ComboInput } from "@/lib/schemas";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const { items, ...d } = await parseBody(req, ComboInput);
  const n = await prisma.menuItem.count({ where: { id: { in: items.map((i) => i.menuItemId) }, restaurantId: s.restaurantId } });
  if (n !== new Set(items.map((i) => i.menuItemId)).size) throw new ApiError(400, "Combo has an unknown item.");
  return ok(await prisma.combo.create({ data: { ...d, restaurantId: s.restaurantId, items: { create: items } } }), 201);
});
