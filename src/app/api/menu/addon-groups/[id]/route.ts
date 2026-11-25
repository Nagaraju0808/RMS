import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { AddonGroupInput } from "@/lib/schemas";
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const { addons, ...d } = await parseBody(req, AddonGroupInput);
  if (!(await prisma.addonGroup.findFirst({ where: { id, restaurantId: s.restaurantId } }))) notFound("Add-on group");
  await prisma.$transaction([prisma.addon.deleteMany({ where: { groupId: id } }), prisma.addonGroup.update({ where: { id }, data: { ...d, addons: { create: addons } } })]);
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const r = await prisma.addonGroup.deleteMany({ where: { id, restaurantId: s.restaurantId } });
  if (!r.count) notFound("Add-on group");
  return ok({ ok: true });
});
