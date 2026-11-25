import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { MockGateway, RazorpayGateway } from "@/lib/services/payments";
describe("payment gateways", () => {
  it("mock gateway creates and verifies", async () => {
    const g = new MockGateway();
    const o = await g.createOrder(10000, "bill1");
    expect((await g.verify({ orderId: o.orderId })).ok).toBe(true);
    expect((await g.verify({ orderId: "fake" })).ok).toBe(false);
  });
  it("razorpay refuses live keys", () => { expect(() => new RazorpayGateway("rzp_live_x", "s")).toThrow(/TEST/); });
  it("razorpay signature check", async () => {
    const g = new RazorpayGateway("rzp_test_x", "secret");
    const sig = crypto.createHmac("sha256", "secret").update("order_1|pay_1").digest("hex");
    expect((await g.verify({ orderId: "order_1", paymentId: "pay_1", signature: sig })).ok).toBe(true);
    expect((await g.verify({ orderId: "order_1", paymentId: "pay_1", signature: sig.replace(/.$/, "0") === sig ? sig.replace(/.$/, "1") : sig.replace(/.$/, "0") })).ok).toBe(false);
  });
});
