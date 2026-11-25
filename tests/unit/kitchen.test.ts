import { describe, it, expect } from "vitest";
import { canTransition, nextStatus, timerLevel, ticketStatus } from "@/lib/kitchen";
describe("kitchen flow", () => {
  it("moves one step forward", () => {
    expect(nextStatus("NEW")).toBe("PREPARING");
    expect(nextStatus("READY")).toBe("SERVED");
    expect(nextStatus("SERVED")).toBeNull();
    expect(canTransition("NEW", "PREPARING")).toBe(true);
    expect(canTransition("NEW", "READY")).toBe(true);
    expect(canTransition("NEW", "SERVED")).toBe(false);
    expect(canTransition("PREPARING", "NEW")).toBe(true); // undo
    expect(canTransition("SERVED", "READY")).toBe(false);
    expect(canTransition("CANCELLED", "PREPARING")).toBe(false);
  });
  it("timer colours", () => {
    const start = new Date(2026, 0, 1, 12, 0);
    expect(timerLevel(start, new Date(2026, 0, 1, 12, 5), 10, 20)).toBe("ok");
    expect(timerLevel(start, new Date(2026, 0, 1, 12, 12), 10, 20)).toBe("warn");
    expect(timerLevel(start, new Date(2026, 0, 1, 12, 25), 10, 20)).toBe("late");
  });
  it("ticket status is the slowest item", () => {
    expect(ticketStatus([{ status: "READY" }, { status: "PREPARING" }])).toBe("PREPARING");
    expect(ticketStatus([{ status: "READY" }, { status: "CANCELLED" }])).toBe("READY");
    expect(ticketStatus([{ status: "CANCELLED" }])).toBe("CANCELLED");
  });
});
