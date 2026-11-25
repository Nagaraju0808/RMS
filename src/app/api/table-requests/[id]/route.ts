import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, requireBranch, requireSession } from "@/lib/api";
import { emitToBranch } from "@/lib/realtime";
/** Staff marks a call-waiter / bill request as done. */
export const POST = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const branchId = requireBranch(s); const { id } = await params;
  const r = await prisma.tableRequest.updateMany({ where: { id, table: { branchId } }, data: { resolved: true } });
  if (!r.count) notFound("Request");
  emitToBranch(branchId, "table:updated", {});
  return ok({ ok: true });
});
