// Reservations, waitlist and delivery helpers (pure, unit-tested).
export type Booking = { id?: string; tableId: string | null; dateTime: Date; status: string };
const ACTIVE = ["BOOKED", "CONFIRMED", "SEATED"];

/** Two bookings on the same table clash if they start within `durationMins` of each other. */
export function clashes(a: Booking, b: Booking, durationMins: number): boolean {
  if (!a.tableId || a.tableId !== b.tableId || a.id === b.id || !ACTIVE.includes(b.status)) return false;
  return Math.abs(a.dateTime.getTime() - b.dateTime.getTime()) < durationMins * 60_000;
}
export function findClash<T extends Booking>(candidate: Booking, existing: T[], durationMins: number): T | null {
  return existing.find((e) => clashes(candidate, e, durationMins)) ?? null;
}
/** Pick the smallest free table that fits the party at that time. */
export function suggestTable(guests: number, at: Date, tables: { id: string; seats: number }[], bookings: Booking[], durationMins: number) {
  return [...tables].filter((t) => t.seats >= guests).sort((a, b) => a.seats - b.seats)
    .find((t) => !findClash({ tableId: t.id, dateTime: at, status: "BOOKED" }, bookings, durationMins)) ?? null;
}
/** Rough wait estimate for a walk-in: groups ahead share the tables that fit; each turn takes avg minutes. */
export function estimateWaitMins(groupsAhead: number, fittingTables: number, freeFittingTables: number, avgTableMins: number): number {
  if (freeFittingTables > groupsAhead) return 0;
  const tables = Math.max(1, fittingTables);
  return Math.ceil((groupsAhead + 1 - freeFittingTables) / tables) * Math.round(avgTableMins / 2);
}

// ── Delivery ──
export type Zone = { id: string; name: string; pincodes: string[]; charge: number; minOrder: number; etaMins: number };
export function zoneForPincode(zones: Zone[], pincode: string): Zone | null {
  const p = pincode.trim();
  return zones.find((z) => z.pincodes.includes(p)) ?? null;
}
export function deliveryQuote(zones: Zone[], pincode: string, subtotal: number): { ok: true; zone: Zone; charge: number } | { ok: false; error: string } {
  const z = zoneForPincode(zones, pincode);
  if (!z) return { ok: false, error: "Sorry, we do not deliver to this pincode yet." };
  if (subtotal < z.minOrder) return { ok: false, error: `Minimum order for ${z.name} is ₹${(z.minOrder / 100).toFixed(0)}.` };
  return { ok: true, zone: z, charge: z.charge };
}
export const DELIVERY_FLOW = ["PENDING", "ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"] as const;
export function canMoveDelivery(from: string, to: string): boolean {
  if (to === "FAILED") return !["DELIVERED", "FAILED"].includes(from);
  const a = DELIVERY_FLOW.indexOf(from as any), b = DELIVERY_FLOW.indexOf(to as any);
  return a >= 0 && b === a + 1;
}
