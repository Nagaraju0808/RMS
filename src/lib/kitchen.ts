// Kitchen display logic (pure, unit-tested).
export const FLOW = ["NEW", "PREPARING", "READY", "SERVED"] as const;
export type KStatus = (typeof FLOW)[number] | "CANCELLED";

export function canTransition(from: KStatus, to: KStatus): boolean {
  if (from === "CANCELLED" || from === "SERVED") return false;
  const a = FLOW.indexOf(from as any), b = FLOW.indexOf(to as any);
  if (a < 0 || b < 0) return false;
  // one step forward, NEW→READY shortcut for quick items, or undo one step (mis-tap)
  return b === a + 1 || (from === "NEW" && to === "READY") || b === a - 1;
}
export function nextStatus(s: KStatus): KStatus | null {
  const i = FLOW.indexOf(s as any);
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null;
}
/** Colour of an order timer: normal → warn (orange) → late (red). */
export function timerLevel(startedAt: Date | string, now: Date, warnMins: number, lateMins: number): "ok" | "warn" | "late" {
  const mins = (now.getTime() - new Date(startedAt).getTime()) / 60000;
  return mins >= lateMins ? "late" : mins >= warnMins ? "warn" : "ok";
}
/** Ticket status = the "slowest" active item. */
export function ticketStatus(items: { status: string }[]): KStatus {
  const active = items.filter((i) => i.status !== "CANCELLED");
  if (!active.length) return "CANCELLED";
  for (const s of FLOW) if (active.some((i) => i.status === s)) return s;
  return "SERVED";
}
export function timestampsFor(to: KStatus, now = new Date()) {
  return to === "PREPARING" ? { startedAt: now } : to === "READY" ? { readyAt: now } : to === "SERVED" ? { servedAt: now } : { startedAt: null, readyAt: null };
}
