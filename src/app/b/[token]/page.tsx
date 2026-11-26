"use client";
import * as React from "react";
import { use } from "react";
import { Button, Card } from "@/components/ui";
import { api, rs } from "@/lib/client";

export default function PublicBill({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [b, setB] = React.useState<any>(null); const [err, setErr] = React.useState(""); const [msg, setMsg] = React.useState("");
  const load = () => api(`/api/public/bills/${token}`).then(setB).catch((e) => setErr(e.message));
  React.useEffect(() => { load(); }, []); // eslint-disable-line
  async function pay() {
    try {
      const g = await api(`/api/public/bills/${token}/pay`, { body: {} });
      if (g.mock) { await api(`/api/public/bills/${token}/pay`, { body: { verify: { orderId: g.orderId } } }); setMsg("Payment successful (test mode). Thank you!"); load(); return; }
      const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => new (window as any).Razorpay({ key: g.keyId, amount: g.amount, currency: g.currency, order_id: g.orderId, name: b.restaurant,
        handler: async (r: any) => { await api(`/api/public/bills/${token}/pay`, { body: { verify: { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature } } }); setMsg("Payment successful. Thank you!"); load(); } }).open();
      document.body.appendChild(s);
    } catch (e: any) { setErr(e.message); }
  }
  if (err) return <p className="p-6 text-red-600">{err}</p>;
  if (!b) return <p className="p-6 muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-2 text-xl font-bold">{b.restaurant}</h1>
      <Card><pre className="overflow-x-auto whitespace-pre font-mono text-xs">{b.receipt}</pre></Card>
      {b.paid < b.total ? <Button size="lg" className="mt-4 w-full" onClick={pay}>Pay {rs(b.total - b.paid)} online</Button> : <p className="mt-4 rounded-lg bg-green-100 p-3 text-center font-semibold text-green-800">Paid in full</p>}
      {msg && <p className="mt-2 text-center text-green-700">{msg}</p>}
      <a href={`/t/feedback?order=${b.orderId}`} className="mt-4 block text-center text-brand-600">Rate your meal</a>
    </div>
  );
}
