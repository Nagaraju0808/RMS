import { describe, it, expect } from "vitest";
import { computeBill, splitEqual, splitByItems, settle, billNumber, fyLabel, expectedCash } from "@/lib/billing";
import { receiptText, receiptBytes, padLine } from "@/lib/escpos";

const lines = [
  { id: "a", unitPrice: 25000, quantity: 1, taxPercent: 5 },
  { id: "b", unitPrice: 12000, quantity: 2, taxPercent: 5 },
  { id: "c", unitPrice: 8000, quantity: 1, taxPercent: 18 },
];
const inp = { lines, discount: { type: "PERCENT" as const, value: 10 }, serviceChargePercent: 5, packingCharge: 1500 };

describe("split equal", () => {
  it("parts add up to the full bill", () => {
    const full = computeBill(inp);
    for (const n of [2, 3, 7]) {
      const parts = splitEqual(full, n);
      for (const k of ["subtotal", "discount", "cgst", "sgst", "total", "roundOff"] as const) expect(parts.reduce((s, p) => s + p[k], 0)).toBe(full[k]);
    }
  });
  it("rejects bad part counts", () => { expect(() => splitEqual(computeBill(inp), 1)).toThrow(); });
});
describe("split by items / person", () => {
  it("each group pays for its own items; discount shared", () => {
    const [p1, p2] = splitByItems(inp, [["a"], ["b", "c"]]);
    expect(p1.subtotal).toBe(25000);
    expect(p2.subtotal).toBe(32000);
    expect(p1.discount + p2.discount).toBe(computeBill(inp).discount);
    expect(p1.packingCharge + p2.packingCharge).toBe(1500);
    expect(p2.taxGroups).toHaveLength(2);
  });
  it("every item must be assigned exactly once", () => {
    expect(() => splitByItems(inp, [["a"], ["b"]])).toThrow(/Every item/);
    expect(() => splitByItems(inp, [["a", "b"], ["b", "c"]])).toThrow(/two groups/);
  });
});
describe("payments", () => {
  it("split payment across modes with cash change", () => {
    expect(settle(10000, 0, [{ mode: "UPI", amount: 6000 }, { mode: "CASH", amount: 5000 }])).toEqual({ applied: 10000, change: 1000, remaining: 0 });
    expect(settle(10000, 4000, [{ mode: "CARD", amount: 3000 }])).toEqual({ applied: 3000, change: 0, remaining: 3000 });
    expect(() => settle(10000, 0, [{ mode: "CARD", amount: 12000 }])).toThrow();
  });
  it("expected cash", () => { expect(expectedCash(100000, 250000, 10000)).toBe(340000); });
});
describe("bill numbers", () => {
  it("uses Indian financial year", () => {
    expect(fyLabel(new Date(2026, 2, 31))).toBe("2526");
    expect(fyLabel(new Date(2026, 3, 1))).toBe("2627");
    expect(billNumber(42, new Date(2026, 5, 1))).toBe("2627/000042");
  });
});
describe("ESC/POS", () => {
  const r = { header: ["Spice Garden", "GSTIN 36AAA"], lines: [{ left: "2 x Butter Naan", right: "100.00" }], totals: [{ left: "TOTAL", right: "₹105.00" }], footer: ["Thank you"] };
  it("fits the paper width", () => {
    for (const w of [58, 80] as const) for (const line of receiptText(r, w).split("\n")) expect(line.length).toBeLessThanOrEqual(w === 58 ? 32 : 48);
    expect(padLine("A very long item name that does not fit at all", "1,000.00", 32).length).toBe(32);
  });
  it("starts with init and ends with cut", () => {
    const b = receiptBytes(r, 80);
    expect([b[0], b[1]]).toEqual([0x1b, 0x40]);
    expect(Array.from(b.slice(-4))).toEqual([0x1d, 0x56, 0x42, 0x00]);
    expect(Buffer.from(b).toString("latin1")).toContain("Rs105.00");
  });
});
