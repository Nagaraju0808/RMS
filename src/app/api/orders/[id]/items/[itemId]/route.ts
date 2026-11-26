import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
import { audit } from "@/lib/audit";
import { emitToBranch } from "@/lib/realtime";
import { onItemsCancelled } from "@/lib/stock-hooks";
import { can } from "@/lib/roles";

/** Change quantity/notes of an unsent item, or cancel an item (sent items need a reason + cancel permission). */
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id, itemId } = await params;
  const o = await loadOrder(s, id);
  const it = o.items.find((i) => i.id === itemId);
  if (!it) throw new ApiError(404, "Item not found.");
  if (!["OPEN", "HELD", "PENDING_APPROVAL"].includes(o.status)) throw new ApiError(400, "This order is closed.");
  const d = await parseBody(req, z.object({ quantity: z.number().int().min(1).max(99).optional(), notes: z.string().max(200).optional(), cancel: z.boolean().optional(), reason: z.string().max(200).optional() }));
  if (d.cancel) {
    if (it.kotId) {
      if (!can(s.role, "orders.cancel", s.perms)) throw new ApiError(403, "Only cashier or manager can cancel items already sent to the kitchen.");
      if (!d.reason?.trim()) throw new ApiError(400, "Please give a reason for cancelling.");
      await prisma.$transaction(async (tx) => {
        await tx.orderItem.update({ where: { id: itemId }, data: { status: "CANCELLED", cancelReason: d.reason } });
        await onItemsCancelled(tx, o.branchId, [itemId]);
      });
      await audit(s, "CANCEL_ITEM", "OrderItem", itemId, { order: o.orderNo, item: it.name, qty: it.quantity, reason: d.reason });
    } else await prisma.orderItem.delete({ where: { id: itemId } });
  } else {
    if (it.kotId && d.quantity && d.quantity !== it.quantity) throw new ApiError(400, "Item already sent to kitchen – cancel it and add again instead.");
    await prisma.orderItem.update({ where: { id: itemId }, data: { quantity: d.quantity, notes: d.notes } });
  }
  emitToBranch(o.branchId, "order:updated", { id });
  if (it.kotId) emitToBranch(o.branchId, "item:status", { id: itemId });
  return ok(await loadOrder(s, id));
});
