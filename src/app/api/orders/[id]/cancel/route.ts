import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
import { audit } from "@/lib/audit";
import { emitToBranch } from "@/lib/realtime";
import { onItemsCancelled } from "@/lib/stock-hooks";

export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.cancel"); const { id } = await params;
  const { reason } = await parseBody(req, z.object({ reason: z.string().min(3, "Please give a reason (at least 3 letters)").max(200) }));
  const o = await loadOrder(s, id);
  if (["PAID", "CANCELLED"].includes(o.status)) throw new ApiError(400, "This order is already closed.");
  if (o.bills.some((b) => b.paid > 0)) throw new ApiError(400, "This order has payments. Refund them first.");
  await prisma.$transaction(async (tx) => {
    const sent = o.items.filter((i) => i.kotId && i.status !== "CANCELLED").map((i) => i.id);
    await tx.orderItem.updateMany({ where: { orderId: id, status: { not: "CANCELLED" } }, data: { status: "CANCELLED", cancelReason: reason } });
    await onItemsCancelled(tx, o.branchId, sent);
    await tx.bill.updateMany({ where: { orderId: id }, data: { status: "VOID" } });
    await tx.order.update({ where: { id }, data: { status: "CANCELLED", cancelReason: reason, closedAt: new Date() } });
    if (o.tableId) await tx.diningTable.update({ where: { id: o.tableId }, data: { status: "FREE", mergedIntoId: null } });
    if (o.tableId) await tx.diningTable.updateMany({ where: { mergedIntoId: o.tableId }, data: { status: "FREE", mergedIntoId: null } });
  });
  await audit(s, "CANCEL_ORDER", "Order", id, { orderNo: o.orderNo, reason, items: o.items.length });
  emitToBranch(o.branchId, "order:updated", { id });
  emitToBranch(o.branchId, "item:status", { orderId: id });
  if (o.tableId) emitToBranch(o.branchId, "table:updated", { id: o.tableId });
  return ok(await loadOrder(s, id));
});
