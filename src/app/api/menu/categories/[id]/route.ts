import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { CategoryInput } from "@/lib/schemas";
import { audit } from "@/lib/audit";
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const d = await parseBody(req, CategoryInput.partial());
  const r = await prisma.category.updateMany({ where: { id, restaurantId: s.restaurantId }, data: d as any });
  if (!r.count) notFound("Category");
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const c = await prisma.category.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { _count: { select: { items: true } } } });
  if (!c) notFound("Category");
  if (c._count.items) { await prisma.category.update({ where: { id }, data: { active: false } }); return ok({ ok: true, archived: true }); }
  await prisma.category.delete({ where: { id } });
  await audit(s, "DELETE", "Category", id, { name: c.name });
  return ok({ ok: true });
});
