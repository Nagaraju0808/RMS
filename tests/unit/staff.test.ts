import { describe, it, expect } from "vitest";
import { workedSessions, totalHours, presentDays, salaryFor, splitTips, leaveDaysInMonth } from "@/lib/staff";
const d = (day: number, h: number, m = 0) => new Date(2026, 5, day, h, m);
describe("attendance", () => {
  it("pairs clock-in and clock-out", () => {
    const p = [{ type: "CLOCK_IN" as const, at: d(1, 9) }, { type: "CLOCK_OUT" as const, at: d(1, 17, 30) }, { type: "CLOCK_IN" as const, at: d(2, 10) }, { type: "CLOCK_OUT" as const, at: d(2, 14) }];
    expect(totalHours(p)).toBe(12.5);
    expect(presentDays(p)).toBe(2);
  });
  it("ignores double clock-in and caps forgotten clock-out", () => {
    const p = [{ type: "CLOCK_IN" as const, at: d(1, 9) }, { type: "CLOCK_IN" as const, at: d(1, 10) }, { type: "CLOCK_OUT" as const, at: d(1, 13) }, { type: "CLOCK_IN" as const, at: d(3, 8) }];
    const s = workedSessions(p, 14, d(10, 0));
    expect(s[0].hours).toBe(4);
    expect(s[1].hours).toBe(14);
  });
});
describe("salary and tips", () => {
  it("monthly staff are paid for present + leave days out of 26", () => {
    expect(salaryFor({ hourlyRate: 0, monthlySalary: 2600000 }, 0, 20, 3, 5000)).toEqual({ base: 2300000, tips: 5000, total: 2305000 });
    expect(salaryFor({ hourlyRate: 0, monthlySalary: 2600000 }, 0, 30, 0, 0).base).toBe(2600000);
  });
  it("hourly staff are paid by hours", () => { expect(salaryFor({ hourlyRate: 15000, monthlySalary: 0 }, 10.5, 2, 0, 0).base).toBe(157500); });
  it("tips split by hours and add up", () => {
    const t = splitTips(10000, { a: 8, b: 4, c: 0 });
    expect(t).toEqual({ a: 6667, b: 3333 });
  });
  it("leave days inside month", () => {
    expect(leaveDaysInMonth("2026-05-30", "2026-06-02", "2026-06")).toBe(2);
    expect(leaveDaysInMonth("2026-07-01", "2026-07-02", "2026-06")).toBe(0);
  });
});
