import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { emitToBranch } from "@/lib/realtime";
import { audit } from "@/lib/audit";

/** Move an order to another (free) table. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.create"); const branchId = requireBranch(s);
  const { orderId, toTableId } = await parseBody(req, z.object({ orderId: z.string(), toTableId: z.string() }));
  const o = await prisma.order.findFirst({ where: { id: orderId, branchId } });
  const t = await prisma.diningTable.findFirst({ where: { id: toTableId, branchId } });
  if (!o || !t) throw new ApiError(404, "Order or table not found.");
  const busy = await prisma.order.count({ where: { tableId: t.id, status: { in: ["OPEN", "HELD", "BILLED"] } } });
  if (busy) throw new ApiError(400, `Table ${t.name} already has an order. Use merge instead.`);
  await prisma.$transaction([
    prisma.order.update({ where: { id: o.id }, data: { tableId: t.id } }),
    prisma.diningTable.update({ where: { id: t.id }, data: { status: "OCCUPIED" } }),
    ...(o.tableId ? [prisma.diningTable.update({ where: { id: o.tableId }, data: { status: "CLEANING" } })] : []),
  ]);
  await audit(s, "MOVE_TABLE", "Order", o.id, { from: o.tableId, to: t.name });
  emitToBranch(branchId, "table:updated", {});
  return ok({ ok: true });
});
