import { describe, it, expect } from "vitest";
import { can, navForRole } from "@/lib/roles";
import { defaultFeatures } from "@/lib/features";
import { rupeesToPaise, percentOf, formatMoney } from "@/lib/money";

describe("roles", () => {
  it("owner can manage settings, waiter cannot", () => {
    expect(can("OWNER", "settings.manage")).toBe(true);
    expect(can("WAITER", "settings.manage")).toBe(false);
  });
  it("extra permissions grant access", () => {
    expect(can("WAITER", "reports.view", ["reports.view"])).toBe(true);
  });
  it("chef sees kitchen but not billing", () => {
    const nav = navForRole("CHEF", defaultFeatures("FINE_DINING") as any).map((n) => n.href);
    expect(nav).toContain("/kitchen");
    expect(nav).not.toContain("/billing");
  });
  it("cloud kitchen hides tables", () => {
    const nav = navForRole("OWNER", defaultFeatures("CLOUD_KITCHEN") as any).map((n) => n.href);
    expect(nav).not.toContain("/tables");
    expect(nav).toContain("/deliveries");
  });
});
describe("money", () => {
  it("converts rupees to integer paise", () => {
    expect(rupeesToPaise(10.1)).toBe(1010);
    expect(rupeesToPaise("249.99")).toBe(24999);
  });
  it("percent rounds to whole paise", () => { expect(percentOf(999, 2.5)).toBe(25); });
  it("formats INR", () => { expect(formatMoney(123456)).toContain("1,234.56"); });
});
