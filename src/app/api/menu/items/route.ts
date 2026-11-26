import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { ItemInput } from "@/lib/schemas";
import { assertMenuRefs } from "@/lib/menu-server";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const { variants, addonGroupIds, nameI18n, ...d } = await parseBody(req, ItemInput);
  await assertMenuRefs(s.restaurantId, { ...d, addonGroupIds });
  const item = await prisma.menuItem.create({
    data: { ...d, nameI18n: nameI18n ?? {}, restaurantId: s.restaurantId,
      variants: { create: variants.map(({ id: _id, ...v }, i) => ({ ...v, sortOrder: i })) },
      addonGroups: { create: addonGroupIds.map((groupId) => ({ groupId })) } },
  });
  return ok(item, 201);
});
