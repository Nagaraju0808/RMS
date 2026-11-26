import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
/** Merge bills: move all items of the other open orders into the first order, so they are billed together. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("billing.manage"); const branchId = requireBranch(s);
  const { orderIds } = await parseBody(req, z.object({ orderIds: z.array(z.string()).min(2).max(10) }));
  const orders = await prisma.order.findMany({ where: { id: { in: orderIds }, branchId, restaurantId: s.restaurantId, status: { in: ["OPEN", "HELD", "BILLED"] } }, include: { bills: true } });
  if (orders.length !== orderIds.length) throw new ApiError(400, "Some orders are closed or not found.");
  if (orders.some((o) => o.bills.some((b) => b.paid > 0))) throw new ApiError(400, "An order already has payments.");
  const [main, ...rest] = orderIds.map((id) => orders.find((o) => o.id === id)!);
  await prisma.$transaction(async (tx) => {
    for (const o of rest) {
      await tx.orderItem.updateMany({ where: { orderId: o.id }, data: { orderId: main.id } });
      await tx.kot.updateMany({ where: { orderId: o.id }, data: { orderId: main.id } });
      await tx.bill.updateMany({ where: { orderId: o.id }, data: { status: "VOID" } });
      await tx.order.update({ where: { id: o.id }, data: { status: "CANCELLED", cancelReason: `Merged into order #${main.orderNo}`, closedAt: new Date() } });
      if (o.tableId) await tx.diningTable.update({ where: { id: o.tableId }, data: { mergedIntoId: main.tableId, status: "OCCUPIED" } });
      await tx.order.update({ where: { id: main.id }, data: { packingCharge: { increment: o.packingCharge }, deliveryCharge: { increment: o.deliveryCharge } } });
    }
    await tx.bill.updateMany({ where: { orderId: main.id, paid: 0 }, data: { status: "VOID" } });
    await tx.order.update({ where: { id: main.id }, data: { status: "OPEN" } });
  });
  await audit(s, "MERGE_BILLS", "Order", main.id, { merged: rest.map((o) => o.orderNo) });
  return ok({ orderId: main.id });
});
