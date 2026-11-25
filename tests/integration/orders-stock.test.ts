import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { addItems, createOrder, loadOrder } from "@/lib/order-service";
import { createBills, recordPayments } from "@/lib/bill-service";
import { onItemsCancelled } from "@/lib/stock-hooks";
import { sessionFor, item, stockOf } from "./helpers";

describe("orders → stock → bill (database)", () => {
  it("deducts stock by recipe on KOT and returns it on cancel", async () => {
    const s = await sessionFor("cashier@demo.com");
    const biryani = await item(s.restaurantId, "Hyderabadi Chicken Biryani");
    const full = biryani.variants.find((v) => v.name === "Full")!;
    const before = await stockOf(s.branchId!, "Chicken");
    const { order } = await createOrder(s, { type: "TAKEAWAY", items: [{ menuItemId: biryani.id, variantId: full.id, quantity: 2, addonIds: [] }], send: true, hold: false, guests: 1 });
    expect(await stockOf(s.branchId!, "Chicken")).toBe(before - 500);
    await prisma.$transaction((tx) => onItemsCancelled(tx, s.branchId!, order.items.map((i) => i.id)));
    expect(await stockOf(s.branchId!, "Chicken")).toBe(before);
    await prisma.$transaction((tx) => onItemsCancelled(tx, s.branchId!, order.items.map((i) => i.id))); // twice = no double return
    expect(await stockOf(s.branchId!, "Chicken")).toBe(before);
  });
  it("unsent (held) items do not touch stock", async () => {
    const s = await sessionFor("cashier@demo.com");
    const naan = await item(s.restaurantId, "Butter Naan");
    const before = await stockOf(s.branchId!, "Wheat flour (maida)");
    await createOrder(s, { type: "TAKEAWAY", items: [{ menuItemId: naan.id, quantity: 3, addonIds: [] }], send: false, hold: true, guests: 1 });
    expect(await stockOf(s.branchId!, "Wheat flour (maida)")).toBe(before);
  });
  it("prices come from the server, second KOT for extra items, bill + split payment closes order", async () => {
    const s = await sessionFor("cashier@demo.com");
    const table = await prisma.diningTable.findFirstOrThrow({ where: { branchId: s.branchId!, status: "FREE" } });
    const dosa = await item(s.restaurantId, "Masala Dosa");
    const { order } = await createOrder(s, { type: "DINE_IN", tableId: table.id, items: [{ menuItemId: dosa.id, quantity: 2, addonIds: [] }], send: true, hold: false, guests: 2 });
    expect(order.items[0].unitPrice).toBe(dosa.priceDineIn);
    const o2 = await addItems(s, order.id, [{ menuItemId: dosa.id, quantity: 1, addonIds: [] }], true);
    expect(o2.kots).toHaveLength(2);
    const [bill] = await createBills(s, order.id, { mode: "none" });
    expect(bill.subtotal).toBe(dosa.priceDineIn * 3);
    expect(bill.cgst).toBe(bill.sgst);
    const r = await recordPayments(s.restaurantId, bill.id, [{ mode: "UPI", amount: 10000 }, { mode: "CASH", amount: bill.total }]);
    expect(r.orderPaid).toBe(true);
    expect(r.change).toBe(10000);
    expect((await loadOrder(s, order.id)).status).toBe("PAID");
    expect((await prisma.diningTable.findUniqueOrThrow({ where: { id: table.id } })).status).toBe("CLEANING");
  });
  it("one restaurant cannot load another restaurant's order", async () => {
    const s = await sessionFor("cashier@demo.com");
    const other = await sessionFor("owner@other.com");
    const naan = await item(s.restaurantId, "Butter Naan");
    const { order } = await createOrder(s, { type: "TAKEAWAY", items: [{ menuItemId: naan.id, quantity: 1, addonIds: [] }], send: false, hold: false, guests: 1 });
    await expect(loadOrder(other, order.id)).rejects.toThrow(/not found/);
    await expect(createOrder(other, { type: "TAKEAWAY", items: [{ menuItemId: naan.id, quantity: 1, addonIds: [] }], send: false, hold: false, guests: 1 })).rejects.toThrow(/not on the menu/);
  });
});
