"use client";
import * as React from "react";
import Link from "next/link";
import { Badge, Button, PageHeader, Table, Tabs } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useLive } from "@/components/app/AppContext";
import { computeBill } from "@/lib/billing";

const C: Record<string, string> = { OPEN: "blue", HELD: "yellow", PENDING_APPROVAL: "orange", BILLED: "purple", PAID: "green", CANCELLED: "red" };
export default function OrdersPage() {
  const [tab, setTab] = React.useState<"active" | "PAID" | "CANCELLED" | "PENDING_APPROVAL">("active");
  const [orders, setOrders] = React.useState<any[]>([]);
  const load = React.useCallback(() => api(tab === "active" ? "/api/orders?active=1" : `/api/orders?status=${tab}&limit=100`).then(setOrders), [tab]);
  React.useEffect(() => { load(); }, [load]);
  useLive("order:new", load); useLive("order:updated", load); useLive("qr:pending", load);
  const approve = (id: string, accept: boolean) => api(`/api/orders/${id}/approve`, { body: { accept } }).then(load);
  return (
    <div>
      <PageHeader title="Orders"><Link href="/pos"><Button>+ New order</Button></Link></PageHeader>
      <Tabs value={tab} onChange={setTab} options={[{ value: "active", label: "Active" }, { value: "PENDING_APPROVAL", label: "QR approval" }, { value: "PAID", label: "Paid" }, { value: "CANCELLED", label: "Cancelled" }]} />
      <Table head={["#", "Type", "Table / customer", "Items", "Total", "Status", "Time", ""]} rows={orders.map((o) => [
        <b key="n">{o.orderNo}{o.tokenNo ? ` · T${o.tokenNo}` : ""}</b>, o.type.replace("_", "-") + (o.source !== "POS" ? ` (${o.source})` : ""), o.table?.name || o.customerName || "–",
        o.items.filter((i: any) => i.status !== "CANCELLED").map((i: any) => `${i.quantity}× ${i.name}`).join(", ").slice(0, 80),
        rs(o.bills.find((b: any) => b.status !== "VOID")?.total ?? computeBill({ lines: o.items, discount: o.discountType ? { type: o.discountType, value: o.discountValue } : null }).total),
        <Badge key="s" color={C[o.status]}>{o.status}</Badge>, new Date(o.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        o.status === "PENDING_APPROVAL" ? <div key="a" className="flex gap-1"><Button size="sm" variant="success" onClick={() => approve(o.id, true)}>Accept</Button><Button size="sm" variant="danger" onClick={() => approve(o.id, false)}>Reject</Button></div>
          : <Link key="a" href={["PAID", "CANCELLED"].includes(o.status) ? `/billing?order=${o.id}` : `/pos?order=${o.id}`}><Button size="sm" variant="outline">Open</Button></Link>,
      ])} />
    </div>
  );
}
