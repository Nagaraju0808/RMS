import { describe, it, expect } from "vitest";
import { priceFor, scheduleActive, itemAvailable, parseMenuRows, menuToRows, happyHourPercent } from "@/lib/menu";

describe("priceFor", () => {
  const p = { priceDineIn: 20000, priceTakeaway: 18000, priceOnline: null };
  it("uses channel prices with fallback", () => {
    expect(priceFor(p, "DINE_IN")).toBe(20000);
    expect(priceFor(p, "TAKEAWAY")).toBe(18000);
    expect(priceFor(p, "ONLINE")).toBe(20000);
    expect(priceFor(p, "QR")).toBe(20000);
  });
});
describe("schedules", () => {
  const breakfast = { id: "b", startTime: "07:00", endTime: "11:00", days: [0, 1, 2, 3, 4, 5, 6] };
  const late = { id: "l", startTime: "22:00", endTime: "02:00", days: [5] }; // Friday night
  it("breakfast window", () => {
    expect(scheduleActive(breakfast, new Date(2026, 0, 5, 8, 30))).toBe(true);
    expect(scheduleActive(breakfast, new Date(2026, 0, 5, 11, 0))).toBe(false);
  });
  it("window crossing midnight belongs to the start day", () => {
    expect(scheduleActive(late, new Date(2026, 0, 2, 23, 0))).toBe(true); // Fri 23:00
    expect(scheduleActive(late, new Date(2026, 0, 3, 1, 0))).toBe(true); // Sat 01:00
    expect(scheduleActive(late, new Date(2026, 0, 4, 1, 0))).toBe(false); // Sun 01:00
  });
  it("item availability respects stock and schedules", () => {
    const at = new Date(2026, 0, 5, 9, 0);
    expect(itemAvailable({ scheduleIds: [], inStock: true, active: true }, [], at)).toBe(true);
    expect(itemAvailable({ scheduleIds: [], inStock: false, active: true }, [], at)).toBe(false);
    expect(itemAvailable({ scheduleIds: ["b"], inStock: true, active: true }, [breakfast], at)).toBe(true);
    expect(itemAvailable({ scheduleIds: ["b"], inStock: true, active: true }, [breakfast], new Date(2026, 0, 5, 14, 0))).toBe(false);
  });
  it("happy hour discount", () => {
    const hh = { id: "h", startTime: "17:00", endTime: "19:00", days: [0, 1, 2, 3, 4, 5, 6], discountPercent: 20 };
    expect(happyHourPercent(["h"], [hh], new Date(2026, 0, 5, 18, 0))).toBe(20);
    expect(happyHourPercent(["h"], [hh], new Date(2026, 0, 5, 20, 0))).toBe(0);
  });
});
describe("CSV import/export", () => {
  it("parses valid rows and reports bad rows with line numbers", () => {
    const { items, errors } = parseMenuRows([
      { category: "Starters", name: "Paneer Tikka", foodType: "veg", priceDineIn: "249.50", variants: "Half:150|Full:249.5", allergens: "dairy" },
      { category: "Starters", name: "", priceDineIn: "100" },
      { category: "Mains", name: "X", priceDineIn: "abc" },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].priceDineIn).toBe(24950);
    expect(items[0].variants[0]).toEqual({ name: "Half", priceDineIn: 15000 });
    expect(errors[0]).toMatch(/Line 3/);
    expect(errors[1]).toMatch(/Line 4/);
  });
  it("round-trips", () => {
    const rows = menuToRows([{ name: "Dosa", foodType: "VEG", spiceLevel: 1, allergens: [], priceDineIn: 9000, inStock: true, category: { name: "South" }, variants: [] }]);
    const { items } = parseMenuRows(rows);
    expect(items[0]).toMatchObject({ name: "Dosa", priceDineIn: 9000, category: "South" });
  });
});
