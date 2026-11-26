import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, requireSession } from "@/lib/api";
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("settings.manage"); const { id } = await params;
  const t = await prisma.taxRate.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!t) notFound("Tax rate");
  await prisma.menuItem.updateMany({ where: { taxRateId: id }, data: { taxRateId: null } });
  await prisma.taxRate.delete({ where: { id } });
  return ok({ ok: true });
});
