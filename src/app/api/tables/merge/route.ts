import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { emitToBranch } from "@/lib/realtime";
import { audit } from "@/lib/audit";

/** Merge table A into table B: A's open order items move into B's open order (or A's order moves to B). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.create"); const branchId = requireBranch(s);
  const { fromTableId, toTableId } = await parseBody(req, z.object({ fromTableId: z.string(), toTableId: z.string() }));
  if (fromTableId === toTableId) throw new ApiError(400, "Choose two different tables.");
  const [a, b] = await Promise.all([prisma.diningTable.findFirst({ where: { id: fromTableId, branchId } }), prisma.diningTable.findFirst({ where: { id: toTableId, branchId } })]);
  if (!a || !b) throw new ApiError(404, "Table not found.");
  const active = { status: { in: ["OPEN", "HELD"] as any } };
  const [oa, ob] = await Promise.all([prisma.order.findFirst({ where: { tableId: a.id, ...active } }), prisma.order.findFirst({ where: { tableId: b.id, ...active } })]);
  await prisma.$transaction(async (tx) => {
    if (oa && ob) {
      await tx.orderItem.updateMany({ where: { orderId: oa.id }, data: { orderId: ob.id } });
      await tx.kot.updateMany({ where: { orderId: oa.id }, data: { orderId: ob.id } });
      await tx.order.update({ where: { id: ob.id }, data: { guests: ob.guests + oa.guests } });
      await tx.order.update({ where: { id: oa.id }, data: { status: "CANCELLED", cancelReason: `Merged into table ${b.name}`, closedAt: new Date() } });
    } else if (oa) await tx.order.update({ where: { id: oa.id }, data: { tableId: b.id } });
    await tx.diningTable.update({ where: { id: a.id }, data: { mergedIntoId: b.id, status: "OCCUPIED" } });
    await tx.diningTable.update({ where: { id: b.id }, data: { status: "OCCUPIED" } });
  });
  await audit(s, "MERGE_TABLES", "DiningTable", b.id, { from: a.name, to: b.name });
  emitToBranch(branchId, "table:updated", {});
  return ok({ ok: true, orderId: ob?.id ?? oa?.id ?? null });
});
