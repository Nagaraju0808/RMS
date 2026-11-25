// Payment gateway interface. Default = mock (always succeeds). Razorpay runs in TEST mode only.
import crypto from "crypto";

export type GatewayOrder = { gateway: string; orderId: string; amount: number; currency: string; keyId?: string; mock?: boolean };
export interface PaymentGateway {
  name: string;
  createOrder(amount: number, receipt: string, currency?: string): Promise<GatewayOrder>;
  /** Verify the payment the customer completed. Returns the gateway payment reference. */
  verify(p: { orderId: string; paymentId?: string; signature?: string }): Promise<{ ok: boolean; ref: string }>;
  refund(paymentRef: string, amount: number): Promise<{ ok: boolean; ref: string }>;
}

export class MockGateway implements PaymentGateway {
  name = "mock";
  async createOrder(amount: number, receipt: string, currency = "INR") {
    return { gateway: this.name, orderId: `mock_order_${receipt}_${Date.now()}`, amount, currency, mock: true };
  }
  async verify(p: { orderId: string; paymentId?: string }) {
    return { ok: p.orderId.startsWith("mock_order_"), ref: p.paymentId || `mock_pay_${Date.now()}` };
  }
  async refund(paymentRef: string) { return { ok: true, ref: `mock_refund_${paymentRef}` }; }
}

export class RazorpayGateway implements PaymentGateway {
  name = "razorpay";
  constructor(private keyId: string, private keySecret: string) {
    if (!keyId.startsWith("rzp_test_")) throw new Error("Only Razorpay TEST keys (rzp_test_…) are allowed.");
  }
  private auth() { return "Basic " + Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64"); }
  async createOrder(amount: number, receipt: string, currency = "INR") {
    const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", headers: { Authorization: this.auth(), "Content-Type": "application/json" }, body: JSON.stringify({ amount, currency, receipt: receipt.slice(0, 40) }) });
    if (!r.ok) throw new Error("Razorpay could not create the payment.");
    const d = await r.json();
    return { gateway: this.name, orderId: d.id, amount, currency, keyId: this.keyId };
  }
  async verify(p: { orderId: string; paymentId?: string; signature?: string }) {
    const expected = crypto.createHmac("sha256", this.keySecret).update(`${p.orderId}|${p.paymentId}`).digest("hex");
    const ok = !!p.signature && p.signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(p.signature));
    return { ok, ref: p.paymentId || "" };
  }
  async refund(paymentRef: string, amount: number) {
    const r = await fetch(`https://api.razorpay.com/v1/payments/${paymentRef}/refund`, { method: "POST", headers: { Authorization: this.auth(), "Content-Type": "application/json" }, body: JSON.stringify({ amount }) });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, ref: d.id || "" };
  }
}

export function getGateway(): PaymentGateway {
  if (process.env.PAYMENT_GATEWAY === "razorpay" && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
    return new RazorpayGateway(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET);
  return new MockGateway();
}
