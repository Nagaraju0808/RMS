import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, requireBranch, requireSession } from "@/lib/api";
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("branch.manage"); const branchId = requireBranch(s); const { id } = await params;
  const r = await prisma.deliveryZone.deleteMany({ where: { id, branchId } });
  if (!r.count) notFound("Zone");
  return ok({ ok: true });
});
