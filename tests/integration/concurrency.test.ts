import { describe, it, expect } from "vitest";
import { createOrder } from "@/lib/order-service";
import { sessionFor, item } from "./helpers";

describe("orders sent at the same moment (database)", () => {
  it("never get the same order number", async () => {
    const s = await sessionFor("cashier@demo.com");
    const naan = await item(s.restaurantId, "Butter Naan");
    const res = await Promise.all(Array.from({ length: 25 }, () => createOrder(s, { type: "TAKEAWAY", items: [{ menuItemId: naan.id, quantity: 1, addonIds: [] }], send: true, hold: false, guests: 1, clientId: crypto.randomUUID() })));
    const nos = res.map((r) => r.order.orderNo);
    expect(new Set(nos).size).toBe(25);
  });
  it("the same clientId sent twice at once creates one order", async () => {
    const s = await sessionFor("cashier@demo.com");
    const naan = await item(s.restaurantId, "Butter Naan");
    const clientId = crypto.randomUUID();
    const body = { type: "TAKEAWAY" as const, items: [{ menuItemId: naan.id, quantity: 1, addonIds: [] }], send: false, hold: false, guests: 1, clientId };
    const [a, b] = await Promise.all([createOrder(s, body), createOrder(s, body)]);
    expect(a.order.id).toBe(b.order.id); // both callers get the one order; no error, no second order
  });
});
