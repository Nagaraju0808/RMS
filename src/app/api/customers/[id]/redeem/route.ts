import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
import { maxRedeemablePoints, pointsValue } from "@/lib/loyalty";
import { subtotal } from "@/lib/orders";
import { audit } from "@/lib/audit";
/** Use loyalty points as a flat discount on an open order (before the bill is made). Max 50% of the order. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const { orderId, points } = await parseBody(req, z.object({ orderId: z.string(), points: z.number().int().min(1) }));
  const c = await prisma.customer.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { restaurant: true } });
  if (!c) notFound("Customer");
  const o = await loadOrder(s, orderId);
  if (!["OPEN", "HELD"].includes(o.status) || o.bills.some((b) => b.status !== "VOID")) throw new ApiError(400, "Redeem points before making the bill.");
  if (o.discountType) throw new ApiError(400, "This order already has a discount.");
  const max = maxRedeemablePoints(c.points, subtotal(o.items), c.restaurant.loyaltyPointValue);
  if (points > max) throw new ApiError(400, `You can use at most ${max} points on this order.`);
  const value = pointsValue(points, c.restaurant.loyaltyPointValue);
  await prisma.$transaction([
    prisma.customer.update({ where: { id }, data: { points: { decrement: points } } }),
    prisma.loyaltyTxn.create({ data: { customerId: id, type: "REDEEM", points: -points, orderId, note: `Order #${o.orderNo}` } }),
    prisma.order.update({ where: { id: orderId }, data: { customerId: id, customerPhone: o.customerPhone ?? c.phone, customerName: o.customerName ?? c.name, discountType: "FLAT", discountValue: value, discountReason: `Loyalty: ${points} points` } }),
  ]);
  await audit(s, "DISCOUNT", "Order", orderId, { loyaltyPoints: points, amount: value });
  return ok(await loadOrder(s, orderId));
});
