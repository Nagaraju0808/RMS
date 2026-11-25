import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, requireSession } from "@/lib/api";
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("settings.manage"); const { id } = await params;
  const t = await prisma.membershipTier.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!t) notFound("Tier");
  await prisma.customer.updateMany({ where: { tierId: id }, data: { tierId: null } });
  await prisma.membershipTier.delete({ where: { id } });
  return ok({ ok: true });
});
