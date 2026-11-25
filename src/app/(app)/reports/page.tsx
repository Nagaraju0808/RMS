"use client";
import * as React from "react";
import { Button, Card, Input, PageHeader, Select, Tabs } from "@/components/ui";
import { BarChart } from "@/components/app/Charts";
import { api, rs } from "@/lib/client";
import { useApp } from "@/components/app/AppContext";

const NAMES = { sales: "Sales", items: "Item-wise", categories: "Category-wise", hourly: "Busy hours", payments: "Payment modes", discounts: "Discounts", cancellations: "Cancellations", gst: "GST", staff: "Staff", inventory: "Inventory & waste", profit: "Profit per dish", branches: "Branches" } as const;
type N = keyof typeof NAMES;
const d0 = (days: number) => new Date(Date.now() - days * 86400_000).toLocaleDateString("en-CA");
const show = (v: any, t?: string) => (v == null ? "" : t === "money" ? rs(Number(v)) : t === "percent" ? `${v}%` : typeof v === "number" ? v.toLocaleString("en-IN") : String(v));

export default function ReportsPage() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted ? <Reports /> : <p className="muted">Loading…</p>;
}
function Reports() {
  const { me } = useApp();
  const [name, setName] = React.useState<N>("sales");
  const [f, setF] = React.useState({ from: d0(29), to: d0(0), branch: "" });
  const [r, setR] = React.useState<any>(null); const [err, setErr] = React.useState(""); const [view, setView] = React.useState<"chart" | "table">("chart");
  const qs = new URLSearchParams({ from: f.from, to: f.to, ...(f.branch ? { branch: f.branch } : {}) }).toString();
  React.useEffect(() => { setErr(""); setR(null); api(`/api/reports/${name}?${qs}`).then(setR).catch((e) => setErr(e.message)); }, [name, qs]);
  const preset = (days: number) => setF({ ...f, from: d0(days - 1), to: d0(0) });
  const chartRows = r?.chart ? (r.chart.x === "day" || r.chart.x === "hour" ? r.rows : r.rows.slice(0, 15)) : [];
  return (
    <div>
      <PageHeader title="Reports" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input type="date" aria-label="From" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className="w-40" /><span>to</span>
        <Input type="date" aria-label="To" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className="w-40" />
        {[["Today", 1], ["7 days", 7], ["30 days", 30], ["90 days", 90]].map(([l, d]) => <Button key={l} size="sm" variant="outline" onClick={() => preset(d as number)}>{l}</Button>)}
        {me?.user.role === "OWNER" && me.branches.length > 1 && <Select aria-label="Branch" value={f.branch} onChange={(e) => setF({ ...f, branch: e.target.value })} className="w-44"><option value="">All branches</option>{me.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
        <div className="ml-auto flex gap-2"><a href={`/api/reports/${name}?${qs}&format=xlsx`}><Button variant="outline">⬇ Excel</Button></a><a href={`/api/reports/${name}?${qs}&format=pdf`} target="_blank"><Button variant="outline">⬇ PDF</Button></a></div>
      </div>
      <Tabs value={name} onChange={setName} options={Object.entries(NAMES).map(([value, label]) => ({ value: value as N, label }))} />
      {err && <p className="text-red-600">{err}</p>}
      {!r ? !err && <p className="muted">Loading…</p> : <div className="space-y-3">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{r.title}</h2><p className="text-sm muted">{r.subtitle}</p></div>
          {r.chart && <Tabs value={view} onChange={setView} options={[{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }]} />}</div>
        {r.totals && <div className="flex flex-wrap gap-3">{r.columns.filter((c: any) => c.key in r.totals && c.type === "money").slice(0, 4).map((c: any) => <Card key={c.key} className="min-w-40 p-3"><div className="text-xs muted">{c.label}</div><div className="text-xl font-bold tabular-nums">{show(r.totals[c.key], c.type)}</div></Card>)}</div>}
        {r.chart && view === "chart" && <Card><BarChart label={r.title} data={chartRows} x={r.chart.x} y={r.chart.y} money={r.columns.find((c: any) => c.key === r.chart.y)?.type === "money"} />{chartRows.length < r.rows.length && <p className="text-xs muted">Showing top 15. See the table for all.</p>}</Card>}
        {(!r.chart || view === "table") && <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-app">{r.columns.map((c: any) => <th key={c.key} className={`p-2 ${c.type === "money" || c.type === "number" ? "text-right" : "text-left"}`}>{c.label}</th>)}</tr></thead>
          <tbody>{r.rows.slice(0, 500).map((row: any, i: number) => <tr key={i} className="border-b border-app last:border-0">{r.columns.map((c: any) => <td key={c.key} className={`p-2 ${c.type === "money" || c.type === "number" ? "text-right tabular-nums" : ""}`}>{show(row[c.key], c.type)}</td>)}</tr>)}
            {r.totals && <tr className="font-bold">{r.columns.map((c: any, i: number) => <td key={c.key} className={`p-2 ${c.type === "money" || c.type === "number" ? "text-right" : ""}`}>{i === 0 ? "Total" : c.key in r.totals ? show(r.totals[c.key], c.type) : ""}</td>)}</tr>}
            {!r.rows.length && <tr><td className="p-4 muted" colSpan={r.columns.length}>No data for this period.</td></tr>}</tbody></table></div>}
      </div>}
    </div>
  );
}
