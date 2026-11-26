// Staff maths (pure, unit-tested): hours from clock-in/out, salary, tip sharing.
import { allocate } from "./billing";
export type Punch = { type: "CLOCK_IN" | "CLOCK_OUT"; at: Date };

/** Pair clock-in with the next clock-out. A missing clock-out is capped at `maxShiftHours`. */
export function workedSessions(punches: Punch[], maxShiftHours = 14, now = new Date()): { start: Date; end: Date; hours: number }[] {
  const sorted = [...punches].sort((a, b) => a.at.getTime() - b.at.getTime());
  const out: { start: Date; end: Date; hours: number }[] = [];
  let start: Date | null = null;
  for (const p of sorted) {
    if (p.type === "CLOCK_IN") { if (!start) start = p.at; }
    else if (start) { out.push({ start, end: p.at, hours: (p.at.getTime() - start.getTime()) / 3600_000 }); start = null; }
  }
  if (start) { const end = new Date(Math.min(now.getTime(), start.getTime() + maxShiftHours * 3600_000)); out.push({ start, end, hours: (end.getTime() - start.getTime()) / 3600_000 }); }
  return out;
}
export const totalHours = (p: Punch[], now?: Date) => Math.round(workedSessions(p, 14, now).reduce((a, s) => a + s.hours, 0) * 100) / 100;
export function presentDays(p: Punch[]): number {
  return new Set(p.filter((x) => x.type === "CLOCK_IN").map((x) => x.at.toLocaleDateString("en-CA"))).size;
}
/** Days in a leave range that fall inside the month. */
export function leaveDaysInMonth(from: string, to: string, month: string): number {
  const [y, m] = month.split("-").map(Number);
  const ms = new Date(y, m - 1, 1), me = new Date(y, m, 0);
  const a = new Date(Math.max(new Date(from + "T00:00:00").getTime(), ms.getTime())), b = new Date(Math.min(new Date(to + "T00:00:00").getTime(), me.getTime()));
  return b < a ? 0 : Math.round((b.getTime() - a.getTime()) / 86400_000) + 1;
}
export const FULL_MONTH_DAYS = 26; // working days that earn a full monthly salary
/**
 * Simple salary: hourly staff → hours × rate. Monthly staff → salary × (present + approved leave days) / 26, max 100%.
 * Tips are added on top.
 */
export function salaryFor(u: { hourlyRate: number; monthlySalary: number }, hours: number, present: number, leave: number, tips: number) {
  const base = u.monthlySalary > 0 ? Math.round((u.monthlySalary * Math.min(FULL_MONTH_DAYS, present + leave)) / FULL_MONTH_DAYS) : Math.round(hours * u.hourlyRate);
  return { base, tips, total: base + tips };
}
/** Share the tip pool by hours worked (rounding-safe). */
export function splitTips(pool: number, hoursByUser: Record<string, number>): Record<string, number> {
  const ids = Object.keys(hoursByUser).filter((k) => hoursByUser[k] > 0);
  const parts = allocate(pool, ids.map((k) => Math.round(hoursByUser[k] * 100)));
  return Object.fromEntries(ids.map((k, i) => [k, parts[i]]));
}
