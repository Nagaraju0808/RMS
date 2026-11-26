import { describe, it, expect } from "vitest";
import { pointsEarned, maxRedeemablePoints, tierFor, inSegment, fillTemplate, normalizePhone } from "@/lib/loyalty";
describe("loyalty", () => {
  it("earns points per full ₹100", () => {
    expect(pointsEarned(54900, 5)).toBe(25);
    expect(pointsEarned(9999, 5)).toBe(0);
    expect(pointsEarned(100000, 5, 1.5)).toBe(75);
  });
  it("redeem at most half the bill", () => {
    expect(maxRedeemablePoints(1000, 20000, 100)).toBe(100);
    expect(maxRedeemablePoints(30, 20000, 100)).toBe(30);
    expect(maxRedeemablePoints(30, 20000, 0)).toBe(0);
  });
  it("tiers by spend", () => {
    const tiers = [{ id: "s", name: "Silver", minSpend: 500000, earnMultiplier: 1 }, { id: "g", name: "Gold", minSpend: 2000000, earnMultiplier: 1.5 }];
    expect(tierFor(100, tiers)).toBeNull();
    expect(tierFor(600000, tiers)?.name).toBe("Silver");
    expect(tierFor(3000000, tiers)?.name).toBe("Gold");
  });
  it("segments", () => {
    const now = new Date(2026, 5, 15);
    const c = { birthday: "06-15", anniversary: "01-01", lastVisitAt: new Date(2026, 2, 1), tierId: "g", visits: 6 };
    expect(inSegment(c, "BIRTHDAY_TODAY", now)).toBe(true);
    expect(inSegment(c, "BIRTHDAY_MONTH", now)).toBe(true);
    expect(inSegment(c, "ANNIVERSARY_TODAY", now)).toBe(false);
    expect(inSegment(c, "INACTIVE_30", now)).toBe(true);
    expect(inSegment(c, "INACTIVE_90", now)).toBe(true);
    expect(inSegment(c, "REGULAR", now)).toBe(true);
    expect(inSegment(c, "TIER:g", now)).toBe(true);
  });
  it("templates and phones", () => {
    expect(fillTemplate("Hi {name}, use {coupon} at {restaurant}", { name: "Asha", coupon: "BDAY20", restaurant: "Spice" })).toBe("Hi Asha, use BDAY20 at Spice");
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });
});
