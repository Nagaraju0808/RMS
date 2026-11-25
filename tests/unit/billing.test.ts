import { describe, it, expect } from "vitest";
import { computeBill, allocate } from "@/lib/billing";

describe("allocate", () => {
  it("parts always add up", () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocate(1000, [300, 700]).reduce((a, b) => a + b)).toBe(1000);
    expect(allocate(5, [0, 0])).toEqual([0, 0]);
  });
});
describe("computeBill", () => {
  it("simple 5% GST split into CGST + SGST", () => {
    const b = computeBill({ lines: [{ unitPrice: 10000, quantity: 2, taxPercent: 5 }], roundOff: true });
    expect(b.subtotal).toBe(20000);
    expect(b.cgst).toBe(500);
    expect(b.sgst).toBe(500);
    expect(b.total).toBe(21000);
    expect(b.roundOff).toBe(0);
  });
  it("IGST for inter-state", () => {
    const b = computeBill({ lines: [{ unitPrice: 10000, quantity: 1, taxPercent: 18 }], interState: true });
    expect(b.igst).toBe(1800); expect(b.cgst).toBe(0); expect(b.total).toBe(11800);
  });
  it("discount before tax, service charge taxed", () => {
    const b = computeBill({ lines: [{ unitPrice: 50000, quantity: 1, taxPercent: 5 }], discount: { type: "PERCENT", value: 10 }, serviceChargePercent: 10, roundOff: false });
    expect(b.discount).toBe(5000);
    expect(b.serviceCharge).toBe(4500);
    expect(b.taxable).toBe(49500);
    expect(b.cgst).toBe(1238); // 49500 * 2.5% = 1237.5 → 1238
    expect(b.total).toBe(49500 + 1238 * 2);
  });
  it("round off to nearest rupee", () => {
    const b = computeBill({ lines: [{ unitPrice: 11000, quantity: 1, taxPercent: 5 }] }); // 110 + 5.50 = 115.50
    expect(b.total).toBe(11600);
    expect(b.roundOff).toBe(50);
    const c = computeBill({ lines: [{ unitPrice: 10900, quantity: 1, taxPercent: 5 }] }); // 109 + 5.46 (2.73*2) = 114.46
    expect(c.total).toBe(11400);
    expect(c.roundOff).toBe(-46);
  });
  it("mixed tax rates keep separate groups", () => {
    const b = computeBill({ lines: [{ unitPrice: 10000, quantity: 1, taxPercent: 5 }, { unitPrice: 10000, quantity: 1, taxPercent: 18 }], discount: { type: "FLAT", value: 2000 }, roundOff: false });
    expect(b.taxGroups).toHaveLength(2);
    expect(b.taxGroups[0]).toMatchObject({ ratePercent: 5, taxable: 9000, cgst: 225 });
    expect(b.taxGroups[1]).toMatchObject({ ratePercent: 18, taxable: 9000, cgst: 810 });
    expect(b.total).toBe(18000 + 450 + 1620);
  });
  it("complimentary and cancelled items are free", () => {
    const b = computeBill({ lines: [{ unitPrice: 10000, quantity: 1, taxPercent: 5 }, { unitPrice: 9999, quantity: 3, taxPercent: 5, complimentary: true }, { unitPrice: 5000, quantity: 1, taxPercent: 5, status: "CANCELLED" }] });
    expect(b.subtotal).toBe(10000);
    expect(b.total).toBe(10500);
  });
  it("packing and delivery charges are taxed with the food", () => {
    const b = computeBill({ lines: [{ unitPrice: 20000, quantity: 1, taxPercent: 5 }], packingCharge: 2000, deliveryCharge: 3000, roundOff: false });
    expect(b.taxable).toBe(25000); expect(b.tax).toBe(1250); expect(b.total).toBe(26250);
  });
  it("zero-tax and empty bills", () => {
    expect(computeBill({ lines: [] }).total).toBe(0);
    expect(computeBill({ lines: [{ unitPrice: 5000, quantity: 2, taxPercent: 0 }] }).total).toBe(10000);
  });
  it("discount override for split bills and cannot exceed subtotal", () => {
    expect(computeBill({ lines: [{ unitPrice: 1000, quantity: 1, taxPercent: 0 }], discountOverride: 5000 }).discount).toBe(1000);
  });
  it("total always equals parts", () => {
    for (let i = 0; i < 200; i++) {
      const lines = Array.from({ length: 1 + (i % 5) }, (_, k) => ({ unitPrice: 1000 + ((i * 7919 + k * 104729) % 50000), quantity: 1 + (k % 3), taxPercent: [0, 5, 12, 18][(i + k) % 4] }));
      const b = computeBill({ lines, discount: { type: "PERCENT", value: i % 30 }, serviceChargePercent: i % 3 === 0 ? 5 : 0, packingCharge: i % 2 ? 1000 : 0 });
      expect(b.total).toBe(b.subtotal - b.discount + b.serviceCharge + b.packingCharge + b.deliveryCharge + b.tax + b.roundOff);
      expect(b.cgst).toBe(b.sgst);
      expect(b.total % 100).toBe(0);
    }
  });
});
