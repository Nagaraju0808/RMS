"use client";
import * as React from "react";
import Link from "next/link";
import { useApp, useLive } from "@/components/app/AppContext";
import { Card, PageHeader, Select } from "@/components/ui";
import { LineChart } from "@/components/app/Charts";
import { api, rs } from "@/lib/client";

function Stat({ label, value, change, sub }: { label: string; value: string; change?: number | null; sub?: string }) {
  return <Card><div className="text-sm muted">{label}</div><div className="text-3xl font-bold tabular-nums">{value}</div>
    {change !== undefined && <div className={`text-sm ${change == null ? "muted" : change >= 0 ? "text-green-700" : "text-red-600"}`}>{change == null ? "new vs last week" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change)}% vs same time last week`}</div>}
    {sub && <div className="text-sm muted">{sub}</div>}</Card>;
}
export default function Dashboard() {
  const { me } = useApp();
  const [branch, setBranch] = React.useState("");
  const [d, setD] = React.useState<any>(null);
  const load = React.useCallback(() => api(`/api/dashboard${branch ? `?branch=${branch}` : ""}`).then(setD).catch(() => {}), [branch]);
  React.useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useLive("order:updated", load); useLive("order:new", load);
  if (!me) return <p className="muted">Loading…</p>;
  if (!me.restaurant.onboarded && me.user.role === "OWNER") { if (typeof window !== "undefined") location.href = "/onboarding"; return null; }
  return (
    <div className="space-y-4">
      <PageHeader title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${me.user.name.split(" ")[0]}`}>
        {me.user.role === "OWNER" && me.branches.length > 1 && <Select aria-label="Branch filter" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-48"><option value="">All branches</option>{me.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
      </PageHeader>
      {!d ? <p className="muted">Loading…</p> : <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Today's sales" value={rs(d.today.sales)} change={d.change.sales} />
          <Stat label="Bills today" value={String(d.today.bills)} change={d.change.bills} />
          <Stat label="Average bill" value={rs(d.today.avgBill)} sub={`Last week: ${rs(d.lastWeek.avgBill)}`} />
          <Stat label="Tables occupied" value={`${d.tables.occupied} / ${d.tables.total}`} sub={`${d.openOrders} open orders · ${d.kitchenQueue} items cooking`} />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2"><h2 className="mb-2 font-semibold">Sales by hour – today vs same day last week</h2>
            <LineChart label="Sales by hour today compared with last week" money data={d.hourly.map((h: any) => ({ ...h, hour: `${String(h.hour).padStart(2, "0")}:00` }))} x="hour" series={[{ key: "today", label: "Today" }, { key: "lastWeek", label: "Last week" }]} /></Card>
          <Card><h2 className="mb-2 font-semibold">Top items today</h2>
            {d.topItems.length ? <ol className="space-y-1">{d.topItems.map((t: any, i: number) => <li key={t.name} className="flex justify-between"><span>{i + 1}. {t.name}</span><b className="tabular-nums">{t.qty}</b></li>)}</ol> : <p className="text-sm muted">No orders yet today.</p>}
            <Link href="/reports" className="mt-3 block text-sm text-brand-600">All reports →</Link></Card>
        </div>
      </>}
    </div>
  );
}
