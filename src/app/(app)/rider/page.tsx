"use client";
import * as React from "react";
import { Badge, Button, Card, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useLive } from "@/components/app/AppContext";
const NEXT: Record<string, [string, string]> = { ASSIGNED: ["PICKED_UP", "Picked up from restaurant"], PICKED_UP: ["ON_THE_WAY", "Start ride"], ON_THE_WAY: ["DELIVERED", "Delivered"] };
export default function RiderPage() {
  const [list, setList] = React.useState<any[]>([]);
  const { toast, node } = useToast();
  const load = () => api("/api/rider").then(setList);
  React.useEffect(() => { load(); }, []);
  useLive("delivery:updated", load);
  const move = (orderId: string, status: string) => api(`/api/deliveries/${orderId}`, { body: { status } }).then(() => { toast("Updated"); load(); }).catch((e) => toast(e.message, "err"));
  return <div className="mx-auto max-w-md space-y-3">
    <h1 className="text-xl font-bold">My deliveries</h1>
    {list.length === 0 && <p className="muted">No deliveries assigned to you.</p>}
    {list.map((d) => { const bill = d.order.bills[0]; const due = bill ? bill.total - bill.paid : 0; return <Card key={d.id} className="space-y-2">
      <div className="flex justify-between"><b>Order #{d.order.orderNo}</b><Badge>{d.status}</Badge></div>
      <div>{d.order.customerName} · <a className="text-brand-600" href={`tel:${d.order.customerPhone}`}>{d.order.customerPhone}</a></div>
      <div className="text-sm">{d.order.deliveryAddress} <a className="text-brand-600 underline" target="_blank" href={`https://maps.google.com/?q=${encodeURIComponent(d.order.deliveryAddress || "")}`}>map</a></div>
      <div className="text-sm muted">{d.order.items.map((i: any) => `${i.quantity}× ${i.name}`).join(", ")}</div>
      {due > 0 ? <div className="font-semibold text-orange-600">Collect cash: {rs(due)}</div> : bill && <div className="text-green-700">Paid online</div>}
      {NEXT[d.status] && <Button size="lg" className="w-full" onClick={() => move(d.order.id, NEXT[d.status][0])}>{NEXT[d.status][1]}</Button>}
      {["ASSIGNED", "PICKED_UP", "ON_THE_WAY"].includes(d.status) && <Button variant="ghost" className="w-full text-red-600" onClick={() => confirm("Mark as failed delivery?") && move(d.order.id, "FAILED")}>Could not deliver</Button>}
    </Card>; })}
    {node}
  </div>;
}
