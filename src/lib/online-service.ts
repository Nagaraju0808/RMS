import { prisma } from "./db";
import { ApiError } from "./api";
import { createOrder, LineIn, resolveLines } from "./order-service";
import { createBills } from "./bill-service";
import { deliveryQuote } from "./reservations";
import { subtotal } from "./orders";
import { AGGREGATORS } from "./services/aggregators";
import { audit } from "./audit";

const sys = (restaurantId: string, branchId: string) => ({ sub: "", name: "Online", role: "SYSTEM", restaurantId, branchId, perms: [] as string[] });

/** Order from the restaurant's own website: delivery or pickup. Goes straight to the kitchen and a bill is made. */
export async function placeOnlineOrder(restaurantId: string, branchId: string, d: { mode: "DELIVERY" | "PICKUP"; items: LineIn[]; customerName: string; customerPhone: string; address?: string; pincode?: string; notes?: string; clientId?: string }) {
  const lines = await resolveLines(restaurantId, "ONLINE", d.items);
  let deliveryCharge = 0, zoneId: string | undefined;
  if (d.mode === "DELIVERY") {
    if (!d.address || !d.pincode) throw new ApiError(400, "Address and pincode are needed for delivery.");
    const q = deliveryQuote(await prisma.deliveryZone.findMany({ where: { branchId } }), d.pincode, subtotal(lines));
    if (!q.ok) throw new ApiError(400, q.error);
    deliveryCharge = q.charge; zoneId = q.zone.id;
  }
  const s = sys(restaurantId, branchId);
  const { order, duplicate } = await createOrder(s, { type: d.mode === "DELIVERY" ? "DELIVERY" : "ONLINE", items: d.items, customerName: d.customerName, customerPhone: d.customerPhone, deliveryAddress: d.mode === "DELIVERY" ? `${d.address}, ${d.pincode}` : undefined, notes: d.notes, guests: 1, send: true, hold: false, source: "ONLINE", deliveryCharge, deliveryZoneId: zoneId, clientId: d.clientId });
  const bills = duplicate ? order.bills.filter((b) => b.status !== "VOID") : await createBills(s, order.id, { mode: "none" });
  return { orderId: order.id, orderNo: order.orderNo, trackToken: order.delivery?.trackToken ?? null, billToken: bills[0]?.publicToken, total: bills[0]?.total };
}

/** Order pushed by an aggregator (Swiggy/Zomato…). Items are matched by our menu item id or by exact name. */
export async function ingestAggregatorOrder(platform: string, restaurantId: string, branchId: string, body: unknown) {
  const agg = AGGREGATORS[platform.toUpperCase()];
  if (!agg) throw new ApiError(404, "Unknown platform.");
  let n;
  try { n = agg.parseOrder(body); } catch (e: any) { throw new ApiError(400, e.message); }
  const existing = await prisma.order.findFirst({ where: { restaurantId, source: agg.name, externalId: n.externalId } });
  if (existing) return { orderId: existing.id, duplicate: true };
  const menu = await prisma.menuItem.findMany({ where: { restaurantId, active: true }, select: { id: true, name: true } });
  const items: LineIn[] = n.items.map((i) => {
    const m = menu.find((x) => x.id === i.menuItemId) ?? menu.find((x) => x.name.toLowerCase() === i.externalItemName.toLowerCase());
    if (!m) throw new ApiError(400, `Item "${i.externalItemName}" is not mapped to our menu.`);
    return { menuItemId: m.id, quantity: i.quantity, addonIds: [] };
  });
  const { order } = await createOrder(sys(restaurantId, branchId), { type: "ONLINE", items, customerName: n.customerName, customerPhone: n.customerPhone, notes: n.notes, guests: 1, send: true, hold: false, source: agg.name, externalId: n.externalId });
  await agg.updateStatus(n.externalId, "ACCEPTED");
  await audit(null, "AGGREGATOR_ORDER", "Order", order.id, { platform: agg.name, externalId: n.externalId }, restaurantId);
  return { orderId: order.id, duplicate: false };
}
