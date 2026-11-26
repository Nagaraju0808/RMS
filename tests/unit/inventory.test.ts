import { describe, it, expect } from "vitest";
import { toBase, formatQty, costOf, usageFor, dishCost, foodCostPercent, isLow, expiringSoon, poStatus } from "@/lib/inventory";
const ings = [{ id: "rice", unit: "G" as const, costPerUnit: 8000 }, { id: "oil", unit: "ML" as const, costPerUnit: 18000 }, { id: "egg", unit: "PCS" as const, costPerUnit: 700 }];
describe("units", () => {
  it("converts to base", () => {
    expect(toBase(1.5, "KG", "G")).toBe(1500);
    expect(toBase(250, "ML", "ML")).toBe(250);
    expect(toBase(2, "L", "ML")).toBe(2000);
    expect(() => toBase(1, "KG", "PCS")).toThrow();
  });
  it("formats", () => { expect(formatQty(1500, "G")).toBe("1.5 kg"); expect(formatQty(300, "ML")).toBe("300 ml"); expect(formatQty(12, "PCS")).toBe("12 pcs"); });
  it("costs", () => { expect(costOf(250, "G", 8000)).toBe(2000); expect(costOf(3, "PCS", 700)).toBe(2100); });
});
describe("recipes and stock deduction", () => {
  const lines = [
    { ingredientId: "rice", variantId: null, quantity: 0.2, unit: "KG" as const },
    { ingredientId: "oil", variantId: null, quantity: 20, unit: "ML" as const },
    { ingredientId: "egg", variantId: "full", quantity: 2, unit: "PCS" as const },
    { ingredientId: "egg", variantId: "half", quantity: 1, unit: "PCS" as const },
  ];
  it("usage for quantity and variant", () => {
    const u = usageFor(lines, ings, "full", 3);
    expect(u.get("rice")).toBe(600);
    expect(u.get("oil")).toBe(60);
    expect(u.get("egg")).toBe(6);
    expect(usageFor(lines, ings, "half", 1).get("egg")).toBe(1);
  });
  it("dish cost and food cost %", () => {
    expect(dishCost(lines, ings, "full")).toBe(1600 + 360 + 1400);
    expect(foodCostPercent(3360, 12000)).toBe(28);
    expect(foodCostPercent(100, 0)).toBe(0);
  });
  it("low stock and expiry", () => {
    expect(isLow(500, 1000)).toBe(true); expect(isLow(500, 0)).toBe(false);
    const now = new Date(2026, 0, 1);
    const b = [{ expiryDate: new Date(2026, 0, 3), quantity: 5 }, { expiryDate: new Date(2026, 1, 1), quantity: 5 }, { expiryDate: null, quantity: 5 }];
    expect(expiringSoon(b, 3, now)).toHaveLength(1);
  });
  it("purchase order status", () => {
    expect(poStatus([{ quantity: 10, received: 0 }])).toBe("ORDERED");
    expect(poStatus([{ quantity: 10, received: 4 }, { quantity: 2, received: 2 }])).toBe("PARTIAL");
    expect(poStatus([{ quantity: 10, received: 10 }])).toBe("RECEIVED");
  });
});
