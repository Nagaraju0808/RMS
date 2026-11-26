import { describe, it, expect } from "vitest";
import { forecastItem, purchaseNeed, summarizeReviewsBasic, coOccurrence, parseVoiceOrder } from "@/lib/smart";
describe("forecast", () => {
  it("uses same-weekday average", () => {
    const start = new Date(2026, 5, 15); // Monday
    const daily: { date: string; qty: number }[] = [];
    for (let i = 1; i <= 28; i++) { const d = new Date(start); d.setDate(d.getDate() - i); daily.push({ date: d.toLocaleDateString("en-CA"), qty: d.getDay() === 6 ? 20 : 10 }); }
    const f = forecastItem(daily, start, 7);
    expect(f).toHaveLength(7);
    expect(f[0].qty).toBe(10); // Monday
    expect(f[5].qty).toBe(20); // Saturday
  });
  it("purchase need", () => {
    expect(purchaseNeed(10000, 4000, 20, 1000)).toBe(8000);
    expect(purchaseNeed(1000, 5000)).toBe(0);
  });
});
describe("reviews", () => {
  it("groups themes and sentiment", () => {
    const s = summarizeReviewsBasic([{ rating: 5, comment: "Loved the biryani, very tasty" }, { rating: 2, comment: "Food was cold and service slow" }, { rating: 4, comment: "Waiter was polite" }, { rating: 3, comment: null }]);
    expect(s.count).toBe(4);
    expect(s.points.find((p) => p.theme === "Food temperature")?.sentiment).toBe("negative");
    expect(s.points.find((p) => p.theme === "Staff behaviour")).toBeTruthy();
  });
});
describe("upsell", () => {
  it("finds items often ordered together", () => {
    const orders = [["biryani", "raita"], ["biryani", "raita", "coke"], ["biryani", "coke"], ["dosa", "coffee"], ["biryani", "raita"]];
    expect(coOccurrence(orders, ["biryani"])[0]).toEqual({ id: "raita", score: 0.75 });
  });
});
describe("voice order", () => {
  const items = [{ id: "n", name: "Butter Naan", variants: [] }, { id: "p", name: "Paneer Tikka", variants: [{ id: "h", name: "Half" }, { id: "f", name: "Full" }] }, { id: "c", name: "Filter Coffee", variants: [] }];
  it("parses quantities, items and sizes", () => {
    const r = parseVoiceOrder("Two butter naan and one paneer tikka half, 3 filter coffee and some unicorn", items);
    expect(r.items).toEqual([
      expect.objectContaining({ menuItemId: "n", quantity: 2 }),
      expect.objectContaining({ menuItemId: "p", variantId: "h", quantity: 1 }),
      expect.objectContaining({ menuItemId: "c", quantity: 3 }),
    ]);
    expect(r.unknown).toEqual(["some unicorn"]);
    const r2 = parseVoiceOrder("one chicken biryani full", [{ id: "c65", name: "Chicken 65", variants: [] }, { id: "b", name: "Hyderabadi Chicken Biryani", variants: [{ id: "f", name: "Full" }] }]);
    expect(r2.items[0]).toMatchObject({ menuItemId: "b", variantId: "f" });
  });
});
