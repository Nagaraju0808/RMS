"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, PageHeader, Select, Table, Tabs, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useApp, useLive } from "@/components/app/AppContext";

const C: Record<string, string> = { PENDING: "yellow", ASSIGNED: "blue", PICKED_UP: "purple", ON_THE_WAY: "orange", DELIVERED: "green", FAILED: "red" };
export default function DeliveriesPage() {
  const { me } = useApp();
  const [tab, setTab] = React.useState<"orders" | "zones">("orders");
  const [d, setD] = React.useState<any>(null);
  const [zones, setZones] = React.useState<any[]>([]);
  const { toast, node } = useToast();
  const load = React.useCallback(() => { api("/api/deliveries").then(setD); api("/api/delivery-zones").then(setZones); }, []);
  React.useEffect(() => { load(); }, [load]);
  useLive("delivery:updated", load); useLive("order:new", load);
  const run = (p: Promise<any>, m: string) => p.then(() => { toast(m); load(); }).catch((e) => toast(e.message, "err"));
  if (!d) return <p className="muted">Loading…</p>;
  return (
    <div>
      <PageHeader title="Deliveries">
        {me && <a href={`/o/${me.restaurant.slug}`} target="_blank"><Button variant="outline">Online order page ↗</Button></a>}
        <Button variant="outline" onClick={() => run(api("/api/aggregator/simulate", { body: { platform: "SWIGGY" } }), "Mock Swiggy order received")}>Simulate Swiggy order</Button>
        <Button variant="outline" onClick={() => run(api("/api/aggregator/simulate", { body: { platform: "ZOMATO" } }), "Mock Zomato order received")}>Simulate Zomato order</Button>
      </PageHeader>
      <Tabs value={tab} onChange={setTab} options={[{ value: "orders", label: "Delivery orders" }, { value: "zones", label: "Delivery zones" }]} />
      {tab === "orders" ? <Table head={["#", "Customer", "Address", "Amount", "Status", "Rider", ""]} rows={d.orders.map((o: any) => [
        o.orderNo, <div key="c">{o.customerName}<div className="text-xs muted">{o.customerPhone} · {o.source}</div></div>, <span key="a" className="text-sm">{o.deliveryAddress}</span>,
        rs(o.bills.find((b: any) => b.status !== "VOID")?.total ?? 0), <Badge key="s" color={C[o.delivery?.status]}>{o.delivery?.status}</Badge>,
        <Select key="r" className="w-36" value={o.delivery?.riderId || ""} onChange={(e) => e.target.value && run(api(`/api/deliveries/${o.id}`, { body: { status: "ASSIGNED", riderId: e.target.value } }), "Rider assigned")}>
          <option value="">Assign…</option>{d.riders.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>,
        <a key="t" href={`/track/${o.delivery?.trackToken}`} target="_blank" className="text-sm text-brand-600 underline">tracking</a>])} empty="No delivery orders today." />
      : <Card>
        <form className="mb-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/delivery-zones", { body: { name: f.get("name"), pincodes: String(f.get("pins")).split(/[ ,]+/).filter(Boolean), charge: Math.round(Number(f.get("charge")) * 100), minOrder: Math.round(Number(f.get("min") || 0) * 100), etaMins: Number(f.get("eta") || 40) } }), "Zone added"); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="Zone name" className="w-36" required /><Input name="pins" placeholder="Pincodes (500034, 500033)" className="w-64" required />
          <Input name="charge" type="number" placeholder="Charge ₹" className="w-28" required /><Input name="min" type="number" placeholder="Min order ₹" className="w-32" /><Input name="eta" type="number" placeholder="ETA min" className="w-24" /><Button>Add zone</Button></form>
        {zones.map((z) => <div key={z.id} className="flex justify-between border-b border-app py-2 text-sm"><span><b>{z.name}</b> · {z.pincodes.join(", ")} · charge {rs(z.charge)} · min {rs(z.minOrder)} · {z.etaMins} min</span>
          <Button size="sm" variant="ghost" aria-label="Delete zone" onClick={() => run(api(`/api/delivery-zones/${z.id}`, { method: "DELETE" }), "Deleted")}><Trash2 size={15} /></Button></div>)}
      </Card>}
      {node}
    </div>
  );
}
