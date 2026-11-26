import { describe, it, expect } from "vitest";
import { pctChange, parseRange, fillHours, sumBy, cell, menuClass } from "@/lib/report-utils";
describe("report helpers", () => {
  it("percent change", () => { expect(pctChange(120, 100)).toBe(20); expect(pctChange(0, 0)).toBe(0); expect(pctChange(5, 0)).toBeNull(); expect(pctChange(50, 200)).toBe(-75); });
  it("date range inclusive", () => {
    const r = parseRange("2026-01-01", "2026-01-31");
    expect((r.to.getTime() - r.from.getTime()) / 86400_000).toBe(31);
    expect(() => parseRange("2026-02-01", "2026-01-01")).toThrow();
    expect(() => parseRange("2024-01-01", "2026-01-01")).toThrow(/400/);
    const d = parseRange(null, null, new Date(2026, 0, 30, 15));
    expect(d.from.getDate()).toBe(1);
  });
  it("fills 24 hours", () => {
    const h = fillHours([{ hour: 13, orders: 20, sales: 5000 }], 10);
    expect(h).toHaveLength(24);
    expect(h[13]).toMatchObject({ hour: "13:00", orders: 20, avgOrdersPerDay: 2 });
    expect(h[0].orders).toBe(0);
  });
  it("totals and cells", () => {
    expect(sumBy([{ a: 100, b: "x" }, { a: 250 }], [{ key: "a", label: "A", type: "money" }, { key: "b", label: "B" }])).toEqual({ a: 350 });
    expect(cell(12345, "money")).toBe(123.45);
    expect(cell(12, "percent")).toBe("12%");
  });
  it("menu engineering classes", () => {
    expect(menuClass(100, 200, 50, 100)).toBe("Star");
    expect(menuClass(100, 50, 50, 100)).toBe("Plowhorse");
    expect(menuClass(10, 200, 50, 100)).toBe("Puzzle");
    expect(menuClass(10, 50, 50, 100)).toBe("Dog");
  });
});
