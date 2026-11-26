"use client";
import * as React from "react";
import { Badge, Button, Card, PageHeader, Table, Tabs } from "@/components/ui";
import { BarChart } from "@/components/app/Charts";
import { api, rs } from "@/lib/client";

export default function SmartPage() {
  const [tab, setTab] = React.useState<"forecast" | "purchase" | "menu" | "reviews">("forecast");
  return <div><PageHeader title="Smart insights" />
    <p className="mb-3 text-sm muted">Built from your own sales, recipes and reviews. Explanations use AI only when it is switched on in settings (.env); otherwise plain rules are used.</p>
    <Tabs value={tab} onChange={setTab} options={[{ value: "forecast", label: "Sales forecast" }, { value: "purchase", label: "What to buy" }, { value: "menu", label: "Menu advice" }, { value: "reviews", label: "Review summary" }]} />
    {tab === "forecast" && <Forecast />}{tab === "purchase" && <Purchase />}{tab === "menu" && <Menu />}{tab === "reviews" && <Reviews />}</div>;
}
const Explain = ({ text, ai }: { text: string | null; ai?: boolean }) => text ? <Card className="mb-3"><p>{text}</p>{ai !== undefined && <p className="mt-1 text-xs muted">{ai ? "Written by AI from the numbers below." : "AI is off – summary from simple rules."}</p>}</Card> : null;

function Forecast() {
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api("/api/smart/forecast").then(setD); }, []);
  if (!d) return <p className="muted">Working out the forecast…</p>;
  return <div className="space-y-3"><Explain text={d.explanation} ai={d.aiUsed} />
    <Card><h2 className="mb-2 font-semibold">Dishes expected per day – next 7 days</h2>
      <BarChart label="Forecast dishes per day" data={d.days.map((x: any) => ({ ...x, day: new Date(x.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }) }))} x="day" y="qty" /></Card>
    <Table head={["Dish", "Next 7 days", "Trend (last 7 vs previous 7 days)", ...d.days.map((x: any) => new Date(x.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short" }))]}
      rows={d.items.map((i: any) => [i.name, <b key="t">{i.total}</b>, <span key="tr" className={i.trend > 0 ? "text-green-700" : i.trend < 0 ? "text-red-600" : ""}>{i.trend > 0 ? "▲" : i.trend < 0 ? "▼" : ""} {Math.abs(i.trend)}%</span>, ...i.days.map((x: any) => Math.round(x.qty))])} /></div>;
}
function Purchase() {
  const [days, setDays] = React.useState(2); const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api(`/api/smart/purchase?days=${days}`).then(setD); }, [days]);
  return <div className="space-y-3">
    <div className="flex items-center gap-2"><span>Buy for the next</span>{[1, 2, 3, 7].map((n) => <Button key={n} size="sm" variant={days === n ? "default" : "outline"} onClick={() => setDays(n)}>{n} day{n > 1 ? "s" : ""}</Button>)}</div>
    {d && <><p className="text-sm muted">{d.note} Estimated cost: <b>{rs(d.totalCost)}</b></p>
      <Table head={["Ingredient", "Expected use", "In stock", "Order", "Cost"]} rows={d.rows.map((r: any) => [r.name, fmt(r.expectedUse, r.unit), fmt(r.stock, r.unit), r.order ? <b key="o" className="text-brand-700">{r.orderText}</b> : <Badge key="o" color="green">enough</Badge>, r.cost ? rs(r.cost) : "–"])} /></>}
  </div>;
}
const fmt = (q: number, u: string) => (u === "PCS" ? `${q} pcs` : q >= 1000 ? `${(q / 1000).toFixed(1)} ${u === "G" ? "kg" : "L"}` : `${q} ${u === "G" ? "g" : "ml"}`);
function Menu() {
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api("/api/smart/menu").then(setD); }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const C: Record<string, string> = { Star: "green", Plowhorse: "blue", Puzzle: "yellow", Dog: "red" };
  return <div className="space-y-3"><Explain text={d.explanation} ai={d.aiUsed} />
    <div className="grid gap-3 md:grid-cols-2">{Object.entries(d.groups).map(([k, g]: any) => <Card key={k}><h2 className="font-semibold"><Badge color={C[k]}>{k}</Badge> {g.items.length} dishes</h2><p className="my-1 text-sm">{g.advice}</p>
      <div className="text-sm muted">{g.items.slice(0, 8).map((i: any) => `${i.name} (${i.qty} sold, ${i.foodCost}% food cost)`).join(" · ") || "–"}</div></Card>)}</div>
    <p className="text-xs muted">Popular = sold at least 70% of the average dish. Profitable = earns at least the average profit per plate (last 30 days).</p></div>;
}
function Reviews() {
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api("/api/smart/reviews").then(setD); }, []);
  if (!d) return <p className="muted">Reading reviews…</p>;
  return <div className="space-y-3"><Card><div className="text-sm muted">Last 30 days</div><div className="text-2xl font-bold">{d.average}★ from {d.count} ratings</div></Card>
    {d.aiPoints && <Card><h2 className="mb-1 font-semibold">AI summary</h2><ul className="list-disc pl-5">{d.aiPoints.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul></Card>}
    <Card><h2 className="mb-2 font-semibold">What customers talk about</h2>{d.points.map((p: any) => <div key={p.theme} className="flex justify-between py-1"><span>{p.theme}</span><span>{p.mentions} mentions <Badge color={p.sentiment === "positive" ? "green" : p.sentiment === "negative" ? "red" : "yellow"}>{p.sentiment}</Badge></span></div>)}</Card></div>;
}
