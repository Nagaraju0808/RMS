// Pure order logic (no database) – unit tested in tests/unit/orders.test.ts
import { priceFor, Channel } from "./menu";

export type AddonPick = { id: string; name: string; price: number };
export type LineInput = {
  item: { id: string; name: string; priceDineIn: number; priceTakeaway?: number | null; priceOnline?: number | null; inStock: boolean; active: boolean };
  variant?: { id: string; name: string; priceDineIn: number; priceTakeaway?: number | null; priceOnline?: number | null } | null;
  addons: AddonPick[];
  quantity: number;
  happyHourPercent?: number;
};
/** Server-side unit price: variant (or item) channel price + add-ons, minus happy-hour %. */
export function unitPrice(l: LineInput, channel: Channel): number {
  const base = priceFor(l.variant ?? l.item, channel);
  const disc = l.happyHourPercent ? Math.round((base * l.happyHourPercent) / 100) : 0;
  return base - disc + l.addons.reduce((s, a) => s + a.price, 0);
}
export function lineName(l: Pick<LineInput, "item" | "variant">) {
  return l.variant ? `${l.item.name} (${l.variant.name})` : l.item.name;
}

type Line = { unitPrice: number; quantity: number; complimentary?: boolean; status?: string };
export const isBillable = (l: Line) => !l.complimentary && l.status !== "CANCELLED";
export function subtotal(lines: Line[]): number {
  return lines.filter(isBillable).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
}

/** Discount amount in paise. Percent is a whole/decimal number (10 = 10%). Never more than the amount. */
export function discountAmount(amount: number, type: "PERCENT" | "FLAT" | null | undefined, value: number, maxDiscount?: number | null): number {
  if (!type || value <= 0 || amount <= 0) return 0;
  let d = type === "PERCENT" ? Math.round((amount * Math.min(value, 100)) / 100) : value;
  if (maxDiscount != null) d = Math.min(d, maxDiscount);
  return Math.min(d, amount);
}

export type CouponLike = { code: string; type: "PERCENT" | "FLAT"; value: number; minOrder: number; maxDiscount: number | null; validFrom: Date | null; validTo: Date | null; usageLimit: number | null; usedCount: number; active: boolean };
export function checkCoupon(c: CouponLike | null, amount: number, now = new Date()): { ok: true; discount: number } | { ok: false; error: string } {
  if (!c || !c.active) return { ok: false, error: "Coupon code is not valid." };
  if (c.validFrom && now < c.validFrom) return { ok: false, error: "Coupon is not active yet." };
  if (c.validTo && now > c.validTo) return { ok: false, error: "Coupon has expired." };
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) return { ok: false, error: "Coupon usage limit reached." };
  if (amount < c.minOrder) return { ok: false, error: `Minimum order for this coupon is ₹${(c.minOrder / 100).toFixed(0)}.` };
  return { ok: true, discount: discountAmount(amount, c.type, c.value, c.maxDiscount) };
}

/** Discounts above this percent need a manager/owner PIN when given by a cashier. */
export const DISCOUNT_APPROVAL_PERCENT = 10;
export function needsApproval(role: string, type: "PERCENT" | "FLAT", value: number, amount: number): boolean {
  if (role === "OWNER" || role === "MANAGER") return false;
  const pct = type === "PERCENT" ? value : amount > 0 ? (value / amount) * 100 : 100;
  return pct > DISCOUNT_APPROVAL_PERCENT;
}

/** Daily token numbers for quick-service: restart at 1 every day. */
export function nextToken(counter: number, lastDate: string | null, today: string): { token: number; date: string } {
  return lastDate === today ? { token: counter + 1, date: today } : { token: 1, date: today };
}
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Items not yet sent to the kitchen go on the next KOT. */
export function unsentItems<T extends { kotId: string | null; status: string }>(items: T[]): T[] {
  return items.filter((i) => !i.kotId && i.status !== "CANCELLED");
}
