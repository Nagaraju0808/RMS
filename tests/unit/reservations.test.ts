import { describe, it, expect } from "vitest";
import { clashes, suggestTable, estimateWaitMins, deliveryQuote, canMoveDelivery } from "@/lib/reservations";
const at = (h: number, m = 0) => new Date(2026, 5, 1, h, m);
describe("reservations", () => {
  it("detects clashes on the same table", () => {
    expect(clashes({ tableId: "t1", dateTime: at(19), status: "BOOKED" }, { id: "x", tableId: "t1", dateTime: at(19, 30), status: "BOOKED" }, 90)).toBe(true);
    expect(clashes({ tableId: "t1", dateTime: at(19), status: "BOOKED" }, { id: "x", tableId: "t1", dateTime: at(21), status: "BOOKED" }, 90)).toBe(false);
    expect(clashes({ tableId: "t1", dateTime: at(19), status: "BOOKED" }, { id: "x", tableId: "t1", dateTime: at(19), status: "CANCELLED" }, 90)).toBe(false);
    expect(clashes({ tableId: "t1", dateTime: at(19), status: "BOOKED" }, { id: "x", tableId: "t2", dateTime: at(19), status: "BOOKED" }, 90)).toBe(false);
  });
  it("suggests smallest free table that fits", () => {
    const tables = [{ id: "big", seats: 8 }, { id: "small", seats: 2 }, { id: "mid", seats: 4 }];
    expect(suggestTable(3, at(20), tables, [], 90)?.id).toBe("mid");
    expect(suggestTable(3, at(20), tables, [{ id: "b", tableId: "mid", dateTime: at(20), status: "BOOKED" }], 90)?.id).toBe("big");
    expect(suggestTable(10, at(20), tables, [], 90)).toBeNull();
  });
  it("estimates wait", () => {
    expect(estimateWaitMins(0, 4, 1, 60)).toBe(0);
    expect(estimateWaitMins(3, 2, 0, 60)).toBe(60);
    expect(estimateWaitMins(0, 2, 0, 60)).toBe(30);
  });
});
describe("delivery", () => {
  const zones = [{ id: "z", name: "Near", pincodes: ["500034"], charge: 3000, minOrder: 20000, etaMins: 30 }];
  it("quotes by pincode", () => {
    expect(deliveryQuote(zones, "500034", 25000)).toMatchObject({ ok: true, charge: 3000 });
    expect(deliveryQuote(zones, "500034", 10000)).toMatchObject({ ok: false });
    expect(deliveryQuote(zones, "110001", 25000)).toMatchObject({ ok: false });
  });
  it("status flow", () => {
    expect(canMoveDelivery("ASSIGNED", "PICKED_UP")).toBe(true);
    expect(canMoveDelivery("ASSIGNED", "DELIVERED")).toBe(false);
    expect(canMoveDelivery("ON_THE_WAY", "FAILED")).toBe(true);
    expect(canMoveDelivery("DELIVERED", "FAILED")).toBe(false);
  });
});
