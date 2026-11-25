import { describe, it, expect } from "vitest";
import { unitPrice, subtotal, discountAmount, checkCoupon, needsApproval, nextToken, unsentItems, lineName } from "@/lib/orders";

const item = { id: "i", name: "Biryani", priceDineIn: 32000, priceTakeaway: 30000, priceOnline: 35000, inStock: true, active: true };
describe("unitPrice", () => {
  it("uses variant price for the channel plus add-ons", () => {
    const variant = { id: "v", name: "Half", priceDineIn: 22000, priceTakeaway: null, priceOnline: 24000 };
    expect(unitPrice({ item, variant, addons: [{ id: "a", name: "Raita", price: 3000 }], quantity: 1 }, "DINE_IN")).toBe(25000);
    expect(unitPrice({ item, variant, addons: [], quantity: 1 }, "TAKEAWAY")).toBe(22000);
    expect(unitPrice({ item, variant, addons: [], quantity: 1 }, "ONLINE")).toBe(24000);
    expect(lineName({ item, variant })).toBe("Biryani (Half)");
  });
  it("applies happy hour to base price only", () => {
    expect(unitPrice({ item, addons: [{ id: "a", name: "x", price: 1000 }], quantity: 1, happyHourPercent: 20 }, "DINE_IN")).toBe(32000 - 6400 + 1000);
  });
});
describe("subtotal", () => {
  it("skips complimentary and cancelled lines", () => {
    expect(subtotal([{ unitPrice: 100, quantity: 3 }, { unitPrice: 500, quantity: 1, complimentary: true }, { unitPrice: 200, quantity: 1, status: "CANCELLED" }])).toBe(300);
  });
});
describe("discounts", () => {
  it("percent and flat", () => {
    expect(discountAmount(10000, "PERCENT", 10)).toBe(1000);
    expect(discountAmount(10000, "FLAT", 2500)).toBe(2500);
    expect(discountAmount(1000, "FLAT", 2500)).toBe(1000); // never above amount
    expect(discountAmount(10000, "PERCENT", 50, 2000)).toBe(2000); // capped
    expect(discountAmount(999, "PERCENT", 33.3)).toBe(333);
  });
  it("coupon checks", () => {
    const c = { code: "X", type: "PERCENT" as const, value: 20, minOrder: 50000, maxDiscount: 15000, validFrom: null, validTo: new Date(2030, 0, 1), usageLimit: 10, usedCount: 0, active: true };
    expect(checkCoupon(c, 40000)).toMatchObject({ ok: false });
    expect(checkCoupon(c, 100000)).toEqual({ ok: true, discount: 15000 });
    expect(checkCoupon({ ...c, usedCount: 10 }, 100000)).toMatchObject({ ok: false, error: expect.stringContaining("limit") });
    expect(checkCoupon({ ...c, validTo: new Date(2020, 0, 1) }, 100000)).toMatchObject({ ok: false });
    expect(checkCoupon(null, 100000)).toMatchObject({ ok: false });
  });
  it("big cashier discounts need approval", () => {
    expect(needsApproval("CASHIER", "PERCENT", 15, 10000)).toBe(true);
    expect(needsApproval("CASHIER", "PERCENT", 10, 10000)).toBe(false);
    expect(needsApproval("CASHIER", "FLAT", 2000, 10000)).toBe(true);
    expect(needsApproval("MANAGER", "PERCENT", 50, 10000)).toBe(false);
  });
});
describe("tokens and KOT", () => {
  it("token restarts each day", () => {
    expect(nextToken(41, "2026-01-01", "2026-01-01")).toEqual({ token: 42, date: "2026-01-01" });
    expect(nextToken(41, "2026-01-01", "2026-01-02")).toEqual({ token: 1, date: "2026-01-02" });
  });
  it("only unsent, active items go to the next KOT", () => {
    const items = [{ kotId: "k1", status: "NEW" }, { kotId: null, status: "NEW" }, { kotId: null, status: "CANCELLED" }];
    expect(unsentItems(items)).toHaveLength(1);
  });
});
