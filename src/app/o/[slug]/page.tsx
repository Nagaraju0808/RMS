"use client";
import * as React from "react";
import { use } from "react";
import { Button, Card, Dialog, Input, Select, Tabs, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { FoodDot } from "@/components/app/FoodDot";
import { ItemPicker, PendingLine } from "@/components/pos/ItemPicker";
import { computeBill } from "@/lib/billing";

/** Restaurant's own online ordering website (delivery / pickup). */
export default function OnlineOrder({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [m, setM] = React.useState<any>(null); const [branch, setBranch] = React.useState("");
  const [mode, setMode] = React.useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [cart, setCart] = React.useState<PendingLine[]>([]); const [pick, setPick] = React.useState<any>(null);
  const [checkout, setCheckout] = React.useState(false); const [f, setF] = React.useState({ customerName: "", customerPhone: "", address: "", pincode: "", notes: "" });
  const [done, setDone] = React.useState<any>(null); const [err, setErr] = React.useState("");
  const { toast, node } = useToast();
  React.useEffect(() => { api(`/api/public/online/${slug}${branch ? `?branch=${branch}` : ""}`).then((d) => { setM(d); if (!d.delivery) setMode("PICKUP"); }).catch((e) => setErr(e.message)); }, [slug, branch]);
  if (done) return <div className="mx-auto max-w-md p-6 text-center"><h1 className="text-2xl font-bold">Order placed! #{done.orderNo}</h1>
    <p className="my-2">Total {rs(done.total)}</p>
    <a href={`/b/${done.billToken}`}><Button size="lg" className="w-full">Pay online now</Button></a>
    <p className="my-2 muted">or pay cash on {mode === "DELIVERY" ? "delivery" : "pickup"}</p>
    {done.trackToken && <a href={`/track/${done.trackToken}`} className="text-brand-600 underline">Track your order</a>}</div>;
  if (!m) return <p className="p-6">{err || "Loading…"}</p>;
  const zone = m.zones.find((z: any) => z.pincodes.includes(f.pincode));
  const sub = cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const bill = computeBill({ lines: cart, deliveryCharge: mode === "DELIVERY" && zone ? zone.charge : 0 });
  const add = (i: any) => { if (!i.available) return; if (i.variants.length || i.addonGroupIds.length) return setPick(i); setCart((c) => { const ex = c.find((l) => l.menuItemId === i.id && !l.variantId && !l.addonIds.length); return ex ? c.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { key: Math.random().toString(36).slice(2), menuItemId: i.id, variantId: null, addonIds: [], quantity: 1, name: i.name, unitPrice: i.price, taxPercent: i.taxPercent }]; }); };
  async function place() {
    setErr("");
    try { setDone(await api(`/api/public/online/${slug}`, { body: { branchId: m.branchId, mode, items: cart.map((l) => ({ menuItemId: l.menuItemId, variantId: l.variantId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes })), customerName: f.customerName, customerPhone: f.customerPhone, address: mode === "DELIVERY" ? f.address : undefined, pincode: mode === "DELIVERY" ? f.pincode : undefined, notes: f.notes || undefined, clientId: crypto.randomUUID() } })); }
    catch (e: any) { setErr(e.message); }
  }
  return <div className="mx-auto max-w-2xl p-4 pb-24">
    <h1 className="text-2xl font-bold">{m.restaurant.name}</h1>
    <div className="my-3 flex flex-wrap gap-2">{m.branches.length > 1 && <Select className="w-48" value={m.branchId} onChange={(e) => setBranch(e.target.value)}>{m.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
      <Tabs value={mode} onChange={setMode} options={[...(m.delivery ? [{ value: "DELIVERY" as const, label: "Delivery" }] : []), { value: "PICKUP" as const, label: "Pickup" }]} /></div>
    {m.categories.map((c: any) => { const its = m.items.filter((i: any) => i.categoryId === c.id); if (!its.length) return null; return <section key={c.id} className="mb-4"><h2 className="mb-2 text-lg font-semibold">{c.name}</h2>
      <div className="grid gap-2 sm:grid-cols-2">{its.map((i: any) => <Card key={i.id} className={`flex items-center justify-between gap-2 p-3 ${i.available ? "" : "opacity-50"}`}>
        <div><div className="flex items-center gap-2"><FoodDot t={i.foodType} /><b>{i.name}</b></div><div className="text-sm">{rs(i.price)}</div></div>
        <Button size="sm" variant="outline" disabled={!i.available} onClick={() => add(i)} aria-label={`Add ${i.name}`}>Add</Button></Card>)}</div></section>; })}
    {cart.length > 0 && <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl bg-card p-3 shadow-lg"><Button size="lg" className="w-full" onClick={() => setCheckout(true)}>Checkout ({cart.reduce((n, l) => n + l.quantity, 0)}) · {rs(sub)}</Button></div>}
    {checkout && <Dialog open onClose={() => setCheckout(false)} title="Checkout">
      <div className="space-y-2">
        {cart.map((l) => <div key={l.key} className="flex justify-between text-sm"><span>{l.quantity}× {l.name}</span><span>{rs(l.unitPrice * l.quantity)}</span></div>)}
        <Input placeholder="Name" value={f.customerName} onChange={(e) => setF({ ...f, customerName: e.target.value })} />
        <Input placeholder="Phone" inputMode="tel" value={f.customerPhone} onChange={(e) => setF({ ...f, customerPhone: e.target.value })} />
        {mode === "DELIVERY" && <><Input placeholder="Full address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <Input placeholder="Pincode" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })} />
          {f.pincode.length === 6 && <p className={`text-sm ${zone ? "text-green-700" : "text-red-600"}`}>{zone ? `Delivery ${rs(zone.charge)} · about ${zone.etaMins} min` : "Sorry, we don't deliver here yet."}</p>}</>}
        <Input placeholder="Notes for kitchen" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <div className="flex justify-between font-semibold"><span>Total (incl. tax{mode === "DELIVERY" ? " & delivery" : ""})</span><span>{rs(bill.total)}</span></div>
        <Button size="lg" className="w-full" onClick={place}>Place order</Button>
        {err && <p className="text-sm text-red-600">{err}</p>}
      </div></Dialog>}
    {pick && <ItemPicker item={pick} menu={m} channel="ONLINE" onAdd={(l) => setCart((c) => [...c, l])} onClose={() => setPick(null)} />}
    {node}
  </div>;
}
