// Loyalty and CRM rules (pure, unit-tested).
/** Points earned: `earnPer100` points for every full ₹100 paid, times the tier multiplier. */
export function pointsEarned(paidPaise: number, earnPer100: number, multiplier = 1): number {
  return Math.floor(Math.floor(paidPaise / 10000) * earnPer100 * multiplier);
}
/** Value of points in paise (pointValue = paise per point). */
export const pointsValue = (points: number, pointValue: number) => points * pointValue;
/** Points can pay at most `maxPercent` of the bill. */
export function maxRedeemablePoints(balance: number, billTotal: number, pointValue: number, maxPercent = 50): number {
  if (pointValue <= 0) return 0;
  return Math.max(0, Math.min(balance, Math.floor((billTotal * maxPercent) / 100 / pointValue)));
}
export type Tier = { id: string; name: string; minSpend: number; earnMultiplier: number };
export function tierFor(totalSpend: number, tiers: Tier[]): Tier | null {
  return [...tiers].sort((a, b) => b.minSpend - a.minSpend).find((t) => totalSpend >= t.minSpend) ?? null;
}
export type Cust = { birthday: string | null; anniversary: string | null; lastVisitAt: Date | null; tierId: string | null; visits: number };
const mmdd = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Segments for campaigns: ALL, BIRTHDAY_TODAY, BIRTHDAY_MONTH, ANNIVERSARY_TODAY, INACTIVE_30, INACTIVE_90, NEW, REGULAR, TIER:<id> */
export function inSegment(c: Cust, segment: string, now = new Date()): boolean {
  const days = (d: Date | null) => (d ? (now.getTime() - d.getTime()) / 86400_000 : Infinity);
  switch (true) {
    case segment === "ALL": return true;
    case segment === "BIRTHDAY_TODAY": return c.birthday === mmdd(now);
    case segment === "BIRTHDAY_MONTH": return !!c.birthday && c.birthday.slice(0, 2) === mmdd(now).slice(0, 2);
    case segment === "ANNIVERSARY_TODAY": return c.anniversary === mmdd(now);
    case segment === "INACTIVE_30": return days(c.lastVisitAt) > 30;
    case segment === "INACTIVE_90": return days(c.lastVisitAt) > 90;
    case segment === "NEW": return c.visits <= 1;
    case segment === "REGULAR": return c.visits >= 5;
    case segment.startsWith("TIER:"): return c.tierId === segment.slice(5);
    default: return false;
  }
}
export const SEGMENTS = { ALL: "All customers", BIRTHDAY_TODAY: "Birthday today", BIRTHDAY_MONTH: "Birthday this month", ANNIVERSARY_TODAY: "Anniversary today", INACTIVE_30: "Not visited in 30 days", INACTIVE_90: "Not visited in 90 days", NEW: "New (1 visit)", REGULAR: "Regulars (5+ visits)" } as const;
/** Fill {name}, {points}, {coupon} in a campaign message. */
export function fillTemplate(msg: string, v: { name?: string | null; points?: number; coupon?: string | null; restaurant: string }) {
  return msg.replace(/\{name\}/g, v.name || "friend").replace(/\{points\}/g, String(v.points ?? 0)).replace(/\{coupon\}/g, v.coupon || "").replace(/\{restaurant\}/g, v.restaurant);
}
export function normalizePhone(p: string): string {
  const d = p.replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 11 && d.startsWith("0") ? d.slice(1) : d;
}
