import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { createOrder } from "@/lib/order-service";
import { createBills, recordPayments } from "@/lib/bill-service";
import { sessionFor, item } from "./helpers";

describe("customers & loyalty (database)", () => {
  it("paying an order with a phone number creates the customer and earns points", async () => {
    const s = await sessionFor("cashier@demo.com");
    const pbm = await item(s.restaurantId, "Paneer Butter Masala");
    const phone = "98" + String(Date.now()).slice(-8);
    const { order } = await createOrder(s, { type: "TAKEAWAY", customerPhone: "+91 " + phone, customerName: "Loyal Lata", items: [{ menuItemId: pbm.id, quantity: 4, addonIds: [] }], send: true, hold: false, guests: 1 });
    const [bill] = await createBills(s, order.id, { mode: "none" });
    await recordPayments(s.restaurantId, bill.id, [{ mode: "CARD", amount: bill.total }]);
    const c = await prisma.customer.findUniqueOrThrow({ where: { restaurantId_phone: { restaurantId: s.restaurantId, phone } } });
    expect(c.name).toBe("Loyal Lata");
    expect(c.visits).toBe(1);
    expect(c.totalSpend).toBe(bill.total);
    expect(c.points).toBe(Math.floor(bill.total / 10000) * 5);
    expect(await prisma.loyaltyTxn.count({ where: { customerId: c.id, type: "EARN" } })).toBe(1);
  });
});
