"use client";
import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge, Button, Card, Dialog, Input, Label, PageHeader, Select, Table, Tabs, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { computeBill } from "@/lib/billing";
import { useApp, useLive } from "@/components/app/AppContext";

export default function BillingPage() { return <Suspense><Billing /></Suspense>; }

function Billing() {
  const sp = useSearchParams();
  const orderId = sp.get("order");
  const [tab, setTab] = React.useState<"settle" | "bills" | "closing">("settle");
  if (orderId) return <OrderBilling orderId={orderId} />;
  return (
    <div>
      <PageHeader title="Billing" />
      <Tabs value={tab} onChange={setTab} options={[{ value: "settle", label: "To settle" }, { value: "bills", label: "Today's bills" }, { value: "closing", label: "Day-end closing" }]} />
      {tab === "settle" && <ToSettle />}
      {tab === "bills" && <TodayBills />}
      {tab === "closing" && <DayClosing />}
    </div>
  );
}

function ToSettle() {
  const [orders, setOrders] = React.useState<any[]>([]);
  const [sel, setSel] = React.useState<string[]>([]);
  const router = useRouter();
  const { toast, node } = useToast();
  const load = () => api("/api/orders?status=OPEN,BILLED,HELD").then(setOrders);
  React.useEffect(() => { load(); }, []);
  useLive("order:updated", load); useLive("order:new", load);
  return <>
    {sel.length >= 2 && <Button className="mb-2" onClick={() => api("/api/billing/merge", { body: { orderIds: sel } }).then((r) => router.push(`/billing?order=${r.orderId}`)).catch((e) => toast(e.message, "err"))}>Merge {sel.length} bills into one</Button>}
    <Table head={["", "#", "Table / customer", "Status", "Amount", ""]} rows={orders.map((o) => [
      <input key="c" type="checkbox" aria-label={`select ${o.orderNo}`} checked={sel.includes(o.id)} onChange={(e) => setSel(e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id))} />,
      o.orderNo, o.table?.name || o.customerName || o.type, <Badge key="s">{o.status}</Badge>,
      rs(o.bills.find((b: any) => b.status !== "VOID")?.total ?? computeBill({ lines: o.items, discount: o.discountType ? { type: o.discountType, value: o.discountValue } : null }).total),
      <Link key="l" href={`/billing?order=${o.id}`}><Button size="sm">Bill / Pay</Button></Link>])} empty="No open orders." />
    {node}
  </>;
}

function TodayBills() {
  const [bills, setBills] = React.useState<any[]>([]);
  React.useEffect(() => { api("/api/bills").then(setBills); }, []);
  return <Table head={["Bill no", "Order", "Total", "Paid", "Status", "Modes", ""]} rows={bills.map((b) => [b.billNo + (b.splitLabel ? ` (${b.splitLabel})` : ""), `#${b.order.orderNo} ${b.order.table?.name || b.order.customerName || ""}`, rs(b.total), rs(b.paid),
    <Badge key="s" color={b.status === "PAID" ? "green" : b.status === "VOID" ? "slate" : b.status === "REFUNDED" ? "red" : "yellow"}>{b.status}</Badge>, b.payments.map((p: any) => p.mode).join(", "),
    <Link key="o" href={`/billing?order=${b.orderId}`}><Button size="sm" variant="outline">Open</Button></Link>])} />;
}

function DayClosing() {
  const [d, setD] = React.useState<any>(null);
  const [counted, setCounted] = React.useState(""); const [opening, setOpening] = React.useState("0");
  const { toast, node } = useToast();
  const load = () => api("/api/cash-closing").then(setD);
  React.useEffect(() => { load(); }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const expected = Math.round(Number(opening || 0) * 100) + d.cashIn - d.cashRefunds;
  const diff = Math.round(Number(counted || 0) * 100) - expected;
  return <div className="grid gap-4 md:grid-cols-2">
    <Card>
      <h2 className="mb-2 font-semibold">Today ({d.date})</h2>
      {d.byMode.map((m: any) => <div key={m.mode} className="flex justify-between"><span>{m.mode} ({m.count})</span><span>{rs(m.amount)}{m.tips ? ` + tips ${rs(m.tips)}` : ""}</span></div>)}
      {d.refunds.map((r: any) => <div key={r.mode} className="flex justify-between text-red-600"><span>Refund {r.mode}</span><span>−{rs(r.amount)}</span></div>)}
      {!d.byMode.length && <p className="muted">No payments yet today.</p>}
    </Card>
    <Card className="space-y-2">
      <h2 className="font-semibold">Count the cash drawer</h2>
      <Label>Opening cash (₹)</Label><Input type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
      <Label>Cash counted now (₹)</Label><Input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} />
      <div className="flex justify-between"><span>Expected in drawer</span><b>{rs(expected)}</b></div>
      {counted && <div className={`flex justify-between font-bold ${diff === 0 ? "text-green-600" : "text-red-600"}`}><span>{diff === 0 ? "Matches ✓" : diff > 0 ? "Extra cash" : "Short"}</span><span>{rs(Math.abs(diff))}</span></div>}
      <Button className="w-full" onClick={() => api("/api/cash-closing", { body: { openingCash: Math.round(Number(opening) * 100), countedCash: Math.round(Number(counted) * 100) } }).then(() => { toast("Day closed"); load(); }).catch((e) => toast(e.message, "err"))}>Save day-end closing</Button>
    </Card>
    <Card className="md:col-span-2"><h2 className="mb-2 font-semibold">Past closings</h2>
      {d.closings.map((c: any) => <div key={c.id} className="flex justify-between border-b border-app py-1 text-sm"><span>{c.date}</span><span>Expected {rs(c.expectedCash)} · Counted {rs(c.countedCash)} · <b className={c.difference ? "text-red-600" : "text-green-600"}>{c.difference >= 0 ? "+" : ""}{rs(c.difference)}</b></span></div>)}</Card>
    {node}
  </div>;
}

function OrderBilling({ orderId }: { orderId: string }) {
  const { me } = useApp();
  const [o, setO] = React.useState<any>(null);
  const [bill, setBill] = React.useState<any>(null);
  const [splitDlg, setSplitDlg] = React.useState(false);
  const [refundDlg, setRefundDlg] = React.useState(false);
  const [pays, setPays] = React.useState<{ mode: string; amount: string }[]>([]);
  const [width, setWidth] = React.useState<"80" | "58">("80");
  const { toast, node } = useToast();
  const load = React.useCallback(async () => {
    const ord = await api(`/api/orders/${orderId}`); setO(ord);
    const active = ord.bills.filter((b: any) => b.status !== "VOID");
    const cur = active.find((b: any) => b.status === "OPEN" || b.status === "PARTIALLY_PAID") || active[active.length - 1];
    setBill(cur ? await api(`/api/bills/${cur.id}`) : null);
  }, [orderId]);
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (bill) setPays([{ mode: "CASH", amount: ((bill.total - bill.paid) / 100).toFixed(2) }]); }, [bill?.id, bill?.paid]); // eslint-disable-line
  if (!o) return <p className="muted">Loading…</p>;
  const activeBills = o.bills.filter((b: any) => b.status !== "VOID");
  const run = (p: Promise<any>, msg: string) => p.then((r) => { toast(msg + (r?.change ? ` · Give change ${rs(r.change)}` : "")); load(); return r; }).catch((e) => toast(e.message, "err"));
  const makeBill = (split: any = { mode: "none" }) => run(api("/api/bills", { body: { orderId, split } }), "Bill created").then(() => setSplitDlg(false));
  const due = bill ? bill.total - bill.paid : 0;
  const entered = pays.reduce((s, p) => s + Math.round(Number(p.amount || 0) * 100), 0);
  return (
    <div>
      <PageHeader title={`Bill – Order #${o.orderNo}`}>
        <Link href={`/pos?order=${o.id}`}><Button variant="outline">Back to order</Button></Link>
        <Badge color={o.status === "PAID" ? "green" : "yellow"}>{o.status}</Badge>
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {activeBills.length > 1 && <div className="flex flex-wrap gap-2">{activeBills.map((b: any) => <Button key={b.id} variant={bill?.id === b.id ? "default" : "outline"} size="sm" onClick={async () => setBill(await api(`/api/bills/${b.id}`))}>{b.splitLabel || b.billNo} · {rs(b.total)} {b.status === "PAID" ? "✓" : ""}</Button>)}</div>}
          {!bill ? (
            <Card className="space-y-3">
              <p>No bill yet. Items: {o.items.filter((i: any) => i.status !== "CANCELLED").length}</p>
              <div className="flex flex-wrap gap-2"><Button size="lg" onClick={() => makeBill()}>Make bill</Button><Button size="lg" variant="outline" onClick={() => setSplitDlg(true)}>Split bill</Button></div>
            </Card>
          ) : (
            <Card>
              <pre className="mx-auto w-fit whitespace-pre font-mono text-xs leading-5" data-testid="receipt">{width === "80" ? bill.receipt80 : bill.receipt58}</pre>
            </Card>
          )}
        </div>
        {bill && <Card className="space-y-3">
          <div className="flex justify-between text-lg"><span>Total</span><b>{rs(bill.total)}</b></div>
          <div className="flex justify-between"><span>Paid</span><span>{rs(bill.paid)}</span></div>
          <div className="flex justify-between text-xl font-bold"><span>Due</span><span data-testid="due">{rs(due)}</span></div>
          {due > 0 && <>
            {pays.map((p, i) => (
              <div key={i} className="flex gap-2">
                <Select value={p.mode} onChange={(e) => setPays(pays.map((x, j) => (j === i ? { ...x, mode: e.target.value } : x)))} className="w-28"><option>CASH</option><option>CARD</option><option>UPI</option><option>WALLET</option></Select>
                <Input aria-label="Amount" type="number" step="0.01" value={p.amount} onChange={(e) => setPays(pays.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                {pays.length > 1 && <Button variant="ghost" onClick={() => setPays(pays.filter((_, j) => j !== i))}>✕</Button>}
              </div>))}
            <div className="flex flex-wrap gap-1">{["CASH", "CARD", "UPI"].map((m) => <Button key={m} size="sm" variant="outline" onClick={() => setPays([{ mode: m, amount: (due / 100).toFixed(2) }])}>All {m}</Button>)}
              <Button size="sm" variant="outline" onClick={() => setPays([...pays, { mode: "UPI", amount: "0" }])}>+ Split payment</Button></div>
            {entered > due && <p className="text-sm text-green-700">Change to give: {rs(entered - due)}</p>}
            <Button size="xl" variant="success" className="w-full" onClick={() => run(api(`/api/bills/${bill.id}/pay`, { body: { payments: pays.map((p) => ({ mode: p.mode, amount: Math.round(Number(p.amount) * 100) })) } }), "Payment saved")}>Take payment</Button>
            <Button variant="outline" className="w-full" onClick={async () => { const g = await api(`/api/bills/${bill.id}/gateway`, { body: {} }); if (g.mock) { if (confirm(`TEST MODE: simulate online payment of ${rs(g.amount)}?`)) run(api(`/api/bills/${bill.id}/gateway`, { body: { verify: { orderId: g.orderId } } }), "Online payment received"); } else toast("Open the Razorpay checkout on the customer page (/b/…) to pay online.", "err"); }}>Online payment (gateway – test mode)</Button>
          </>}
          {due === 0 && <p className="rounded-lg bg-green-100 p-2 text-center font-semibold text-green-800">Paid ✓</p>}
          <div className="border-t border-app pt-3">
            <div className="mb-2 flex items-center gap-2"><span className="text-sm">Paper</span><Select value={width} onChange={(e) => setWidth(e.target.value as any)} className="w-24"><option value="80">80mm</option><option value="58">58mm</option></Select></div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => { const w = window.open("", "_blank", "width=400,height=600"); if (w) { w.document.write(`<pre style="font:12px monospace">${(width === "80" ? bill.receipt80 : bill.receipt58).replace(/</g, "&lt;")}</pre>`); w.document.close(); w.print(); } }}>🖨 Browser print</Button>
              <a href={`/api/bills/${bill.id}/escpos?width=${width}`} className="contents"><Button variant="outline">Thermal (ESC/POS)</Button></a>
              <a href={`/api/bills/${bill.id}/pdf`} target="_blank" className="contents"><Button variant="outline">PDF bill</Button></a>
              <Button variant="outline" onClick={() => { const to = prompt("WhatsApp number / phone / email?"); if (!to) return; const ch = to.includes("@") ? "EMAIL" : confirm("Send by WhatsApp? (Cancel = SMS)") ? "WHATSAPP" : "SMS"; run(api(`/api/bills/${bill.id}/share`, { body: { channel: ch, to } }), `Bill sent by ${ch} (mock)`); }}>Share bill</Button>
            </div>
          </div>
          {bill.paid === 0 && <Button variant="ghost" className="w-full text-red-600" onClick={() => run(api(`/api/bills/${bill.id}/void`, { body: { reason: "Changes needed" } }), "Bill cancelled – you can edit the order")}>Cancel bill (to change order)</Button>}
          {bill.paid > 0 && me && ["OWNER", "MANAGER"].includes(me.user.role) && <Button variant="ghost" className="w-full text-red-600" onClick={() => setRefundDlg(true)}>Refund</Button>}
          {bill.refunds?.length > 0 && <div className="text-sm text-red-600">{bill.refunds.map((r: any) => <div key={r.id}>Refunded {rs(r.amount)} ({r.mode}) – {r.reason}</div>)}</div>}
        </Card>}
      </div>
      {splitDlg && <SplitDialog o={o} onClose={() => setSplitDlg(false)} onSplit={makeBill} />}
      {refundDlg && bill && <Dialog open onClose={() => setRefundDlg(false)} title="Refund">
        <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api(`/api/bills/${bill.id}/refund`, { body: { amount: Math.round(Number(f.get("amount")) * 100), mode: f.get("mode"), reason: f.get("reason") } }), "Refund saved").then(() => setRefundDlg(false)); }}>
          <Input name="amount" type="number" step="0.01" defaultValue={(bill.paid / 100).toFixed(2)} /><Select name="mode"><option>CASH</option><option>CARD</option><option>UPI</option><option>ONLINE</option></Select>
          <Input name="reason" placeholder="Reason" required /><Button variant="danger" className="w-full">Refund</Button></form></Dialog>}
      {node}
    </div>
  );
}

function SplitDialog({ o, onClose, onSplit }: any) {
  const [mode, setMode] = React.useState<"equal" | "items">("equal");
  const [parts, setParts] = React.useState(2);
  const items = o.items.filter((i: any) => i.status !== "CANCELLED" && !i.complimentary);
  const [assign, setAssign] = React.useState<Record<string, number>>(Object.fromEntries(items.map((i: any) => [i.id, 0])));
  return <Dialog open onClose={onClose} title="Split bill" wide>
    <Tabs value={mode} onChange={setMode} options={[{ value: "equal", label: "Equal split" }, { value: "items", label: "By item / person" }]} />
    {mode === "equal" ? <div className="space-y-3"><Label>Number of people</Label>
      <div className="flex gap-2">{[2, 3, 4, 5, 6].map((n) => <Button key={n} variant={parts === n ? "default" : "outline"} onClick={() => setParts(n)}>{n}</Button>)}</div>
      <Button className="w-full" onClick={() => onSplit({ mode: "equal", parts })}>Split into {parts} bills</Button></div>
      : <div className="space-y-2"><Label>People</Label>
        <div className="flex gap-2">{[2, 3, 4].map((n) => <Button key={n} variant={parts === n ? "default" : "outline"} onClick={() => setParts(n)}>{n}</Button>)}</div>
        {items.map((i: any) => <div key={i.id} className="flex items-center justify-between gap-2 border-b border-app py-1"><span>{i.quantity}× {i.name} · {rs(i.unitPrice * i.quantity)}</span>
          <div className="flex gap-1">{Array.from({ length: parts }, (_, p) => <button key={p} onClick={() => setAssign({ ...assign, [i.id]: p })} className={`h-8 w-8 rounded ${assign[i.id] === p ? "bg-brand-600 text-white" : "border border-app"}`}>{p + 1}</button>)}</div></div>)}
        <Button className="w-full" onClick={() => { const groups = Array.from({ length: parts }, (_, p) => items.filter((i: any) => assign[i.id] === p).map((i: any) => i.id)).filter((g) => g.length); onSplit({ mode: "items", groups, labels: groups.map((_, k) => `Person ${k + 1}`) }); }}>Make separate bills</Button></div>}
  </Dialog>;
}
