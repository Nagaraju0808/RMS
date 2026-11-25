// Runs inside the payment transaction when an order becomes fully PAID:
// links/creates the customer from the phone number, updates visits/spend, earns loyalty points, updates tier.
import type { Prisma } from "@prisma/client";
import { normalizePhone, pointsEarned, tierFor } from "./loyalty";

export async function onOrderPaid(tx: Prisma.TransactionClient, orderId: string) {
  const o = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { bills: { where: { status: { not: "VOID" } } } } });
  if (!o.customerPhone && !o.customerId) return;
  const r = await tx.restaurant.findUniqueOrThrow({ where: { id: o.restaurantId }, include: { tiers: true } });
  let cust = o.customerId ? await tx.customer.findUnique({ where: { id: o.customerId } }) : null;
  if (!cust) {
    const phone = normalizePhone(o.customerPhone!);
    if (phone.length < 10) return;
    cust = await tx.customer.upsert({ where: { restaurantId_phone: { restaurantId: o.restaurantId, phone } }, update: { name: undefined }, create: { restaurantId: o.restaurantId, phone, name: o.customerName } });
    if (!cust.name && o.customerName) cust = await tx.customer.update({ where: { id: cust.id }, data: { name: o.customerName } });
    await tx.order.update({ where: { id: orderId }, data: { customerId: cust.id } });
  }
  const paid = o.bills.reduce((a, b) => a + b.paid, 0);
  const tier = cust.tierId ? r.tiers.find((t) => t.id === cust!.tierId) : null;
  const pts = pointsEarned(paid, r.loyaltyEarnPer100, tier?.earnMultiplier ?? 1);
  const totalSpend = cust.totalSpend + paid;
  await tx.customer.update({ where: { id: cust.id }, data: { visits: { increment: 1 }, totalSpend, lastVisitAt: new Date(), points: { increment: pts }, tierId: tierFor(totalSpend, r.tiers)?.id ?? cust.tierId } });
  if (pts > 0) await tx.loyaltyTxn.create({ data: { customerId: cust.id, type: "EARN", points: pts, orderId, note: `Order #${o.orderNo}` } });
}
