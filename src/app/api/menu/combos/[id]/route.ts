import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, requireSession } from "@/lib/api";
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("menu.manage"); const { id } = await params;
  const r = await prisma.combo.deleteMany({ where: { id, restaurantId: s.restaurantId } });
  if (!r.count) notFound("Combo");
  return ok({ ok: true });
});
