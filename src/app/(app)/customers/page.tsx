"use client";
import * as React from "react";
import { Badge, Button, Card, Dialog, Input, Label, PageHeader, Select, Table, Tabs, Textarea, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { SEGMENTS } from "@/lib/loyalty";
import { useApp } from "@/components/app/AppContext";

export default function CustomersPage() {
  const [tab, setTab] = React.useState<"list" | "campaigns" | "feedback" | "loyalty">("list");
  return <div><PageHeader title="Customers & loyalty" />
    <Tabs value={tab} onChange={setTab} options={[{ value: "list", label: "Customers" }, { value: "campaigns", label: "Offers & campaigns" }, { value: "feedback", label: "Feedback" }, { value: "loyalty", label: "Loyalty rules" }]} />
    {tab === "list" && <List />}{tab === "campaigns" && <Campaigns />}{tab === "feedback" && <FeedbackTab />}{tab === "loyalty" && <Loyalty />}</div>;
}

function List() {
  const [q, setQ] = React.useState(""); const [list, setList] = React.useState<any[]>([]); const [sel, setSel] = React.useState<any>(null);
  const { toast, node } = useToast();
  const load = React.useCallback(() => api(`/api/customers?q=${encodeURIComponent(q)}`).then(setList), [q]);
  React.useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return <>
    <div className="mb-3 flex flex-wrap gap-2"><Input placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); api("/api/customers", { body: { phone: f.get("phone"), name: f.get("name") || undefined } }).then(() => { toast("Saved"); load(); }).catch((er) => toast(er.message, "err")); e.currentTarget.reset(); }}>
        <Input name="phone" placeholder="Phone" className="w-36" required /><Input name="name" placeholder="Name" className="w-36" /><Button variant="outline">Add</Button></form></div>
    <Table head={["Name", "Phone", "Visits", "Total spend", "Points", "Tier", "Last visit", ""]} rows={list.map((c) => [c.name || "–", c.phone, c.visits, rs(c.totalSpend), c.points, c.tier ? <Badge key="t" color="yellow">{c.tier.name}</Badge> : "–", c.lastVisitAt ? new Date(c.lastVisitAt).toLocaleDateString("en-IN") : "–",
      <Button key="v" size="sm" variant="outline" onClick={() => api(`/api/customers/${c.id}`).then(setSel)}>View</Button>])} empty="No customers yet. They are added automatically from phone numbers on orders." />
    {sel && <Dialog open onClose={() => setSel(null)} title={sel.name || sel.phone} wide>
      <div className="grid gap-3 sm:grid-cols-4">{[["Visits", sel.visits], ["Total spend", rs(sel.totalSpend)], ["Points", sel.points], ["No-shows", sel.noShows]].map(([l, v]) => <Card key={l as string} className="p-3 text-center"><div className="text-xs muted">{l}</div><div className="text-lg font-bold">{v}</div></Card>)}</div>
      <form className="mt-3 grid gap-2 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); api(`/api/customers/${sel.id}`, { method: "PUT", body: { name: f.get("name"), email: f.get("email"), birthday: f.get("bday"), anniversary: f.get("anni") } }).then(() => toast("Saved")).catch((er) => toast(er.message, "err")); }}>
        <Input name="name" defaultValue={sel.name || ""} placeholder="Name" /><Input name="email" defaultValue={sel.email || ""} placeholder="Email" />
        <Input name="bday" defaultValue={sel.birthday || ""} placeholder="Birthday MM-DD" /><Input name="anni" defaultValue={sel.anniversary || ""} placeholder="Anniversary MM-DD" /><Button className="sm:col-span-4">Save</Button></form>
      <h3 className="mt-4 font-semibold">Favourite dishes</h3><p className="text-sm">{sel.favourites.map((f: any) => `${f.name} (${f.qty})`).join(", ") || "–"}</p>
      <h3 className="mt-3 font-semibold">Visits</h3>{sel.orders.slice(0, 10).map((o: any) => <div key={o.id} className="text-sm">{new Date(o.createdAt).toLocaleDateString("en-IN")} · #{o.orderNo} · {rs(o.bills.reduce((a: number, b: any) => a + b.total, 0))} · {o.items.map((i: any) => i.name).join(", ").slice(0, 80)}</div>)}
      <h3 className="mt-3 font-semibold">Points history</h3>{sel.loyaltyTxns.map((t: any) => <div key={t.id} className="text-sm">{new Date(t.createdAt).toLocaleDateString("en-IN")} · {t.type} {t.points > 0 ? "+" : ""}{t.points} · {t.note}</div>)}
      {sel.feedback.length > 0 && <><h3 className="mt-3 font-semibold">Feedback</h3>{sel.feedback.map((f: any) => <div key={f.id} className="text-sm">{"★".repeat(f.rating)} {f.comment}</div>)}</>}
    </Dialog>}
    {node}
  </>;
}

function Campaigns() {
  const [d, setD] = React.useState<any>(null); const [tiers, setTiers] = React.useState<any[]>([]); const [withCoupon, setWithCoupon] = React.useState(true);
  const { toast, node } = useToast();
  const load = () => { api("/api/campaigns").then(setD); api("/api/settings").then((s) => setTiers(s.tiers)).catch(() => {}); };
  React.useEffect(() => { load(); }, []);
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card className="space-y-2"><h2 className="font-semibold">New offer</h2>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget);
        api("/api/campaigns", { body: { name: f.get("name"), channel: f.get("channel"), segment: f.get("segment"), message: f.get("message"), coupon: withCoupon ? { code: f.get("code"), type: f.get("ctype"), value: f.get("ctype") === "FLAT" ? Math.round(Number(f.get("cval")) * 100) : Number(f.get("cval")), validDays: Number(f.get("days") || 30) } : undefined } })
          .then((r) => { toast(`Sent to ${r.sent} customers (mock)`); load(); }).catch((er) => toast(er.message, "err")); }}>
        <Input name="name" placeholder="Campaign name" defaultValue="Birthday treat" required />
        <div className="grid grid-cols-2 gap-2"><Select name="segment">{Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}{tiers.map((t) => <option key={t.id} value={`TIER:${t.id}`}>Tier: {t.name}</option>)}</Select>
          <Select name="channel"><option value="WHATSAPP">WhatsApp</option><option value="SMS">SMS</option><option value="EMAIL">Email</option></Select></div>
        <Textarea name="message" rows={3} defaultValue="Happy birthday {name}! 🎂 Enjoy 20% off at {restaurant} with code {coupon}." required />
        <p className="text-xs muted">You can use {"{name}"}, {"{points}"}, {"{coupon}"}, {"{restaurant}"}.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={withCoupon} onChange={(e) => setWithCoupon(e.target.checked)} />Create a coupon code</label>
        {withCoupon && <div className="grid grid-cols-4 gap-2"><Input name="code" placeholder="CODE" defaultValue="BDAY20" /><Select name="ctype"><option value="PERCENT">%</option><option value="FLAT">₹</option></Select><Input name="cval" type="number" defaultValue={20} /><Input name="days" type="number" defaultValue={30} title="valid days" /></div>}
        <Button className="w-full">Send offer</Button></form></Card>
    <div className="space-y-3"><Card><h2 className="mb-2 font-semibold">Sent campaigns</h2>{d?.campaigns.map((c: any) => <div key={c.id} className="text-sm">{new Date(c.createdAt).toLocaleDateString("en-IN")} · <b>{c.name}</b> · {c.channel} · {c.sentCount} sent {c.couponCode && <Badge>{c.couponCode}</Badge>}</div>)}</Card>
      <Card><h2 className="mb-2 font-semibold">Message log (mock sender)</h2><div className="max-h-80 overflow-y-auto">{d?.log.map((m: any) => <div key={m.id} className="border-b border-app py-1 text-xs"><b>{m.channel}</b> → {m.to}: {m.body}</div>)}</div></Card></div>
    {node}
  </div>;
}

function FeedbackTab() {
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api("/api/feedback").then(setD); }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const max = Math.max(1, ...d.distribution);
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-4">{[["Ratings (30 days)", d.count], ["Average", d.avg ?? "–"], ["Food", d.food ?? "–"], ["Service", d.service ?? "–"]].map(([l, v]) => <Card key={l as string} className="text-center"><div className="text-sm muted">{l}</div><div className="text-2xl font-bold">{v}{typeof v === "number" && l !== "Ratings (30 days)" ? "★" : ""}</div></Card>)}</div>
    <Card><h2 className="mb-2 font-semibold">Stars</h2>{[5, 4, 3, 2, 1].map((n) => <div key={n} className="flex items-center gap-2 text-sm"><span className="w-8">{n}★</span><div className="h-4 rounded bg-yellow-400" style={{ width: `${(d.distribution[n - 1] / max) * 70}%` }} /><span>{d.distribution[n - 1]}</span></div>)}</Card>
    {d.low.length > 0 && <Card className="border-red-300"><h2 className="mb-2 font-semibold text-red-600">Low ratings – please follow up</h2>{d.low.map((f: any) => <div key={f.id} className="text-sm">{"★".repeat(f.rating)} #{f.order?.orderNo} {f.customer?.name} {f.customer?.phone} – {f.comment}</div>)}</Card>}
    <Table head={["When", "Stars", "Food", "Service", "Comment", "Customer"]} rows={d.recent.map((f: any) => [new Date(f.createdAt).toLocaleDateString("en-IN"), "★".repeat(f.rating), f.foodRating ?? "–", f.serviceRating ?? "–", f.comment, f.customer?.name || f.customer?.phone || "–"])} />
  </div>;
}

function Loyalty() {
  const { me } = useApp();
  const [s, setS] = React.useState<any>(null); const [coupons, setCoupons] = React.useState<any[]>([]);
  const { toast, node } = useToast();
  const load = () => { api("/api/settings").then(setS).catch(() => {}); api("/api/coupons").then(setCoupons); };
  React.useEffect(() => { load(); }, []);
  if (!s) return <p className="muted">Only the owner can change loyalty rules.</p>;
  const save = (url: string, body: any, method = "POST") => api(url, { method, body }).then(() => { toast("Saved"); load(); }).catch((e) => toast(e.message, "err"));
  const owner = me?.user.role === "OWNER";
  return <div className="grid gap-4 lg:grid-cols-2">
    <Card className="space-y-2"><h2 className="font-semibold">Earn & redeem</h2>
      <Label>Points earned for every ₹100 paid</Label><Input type="number" disabled={!owner} defaultValue={s.loyaltyEarnPer100} onBlur={(e) => save("/api/settings", { loyaltyEarnPer100: Number(e.target.value) }, "PUT")} />
      <Label>Value of 1 point (₹)</Label><Input type="number" step="0.01" disabled={!owner} defaultValue={s.loyaltyPointValue / 100} onBlur={(e) => save("/api/settings", { loyaltyPointValue: Math.round(Number(e.target.value) * 100) }, "PUT")} />
      <p className="text-xs muted">Customers can pay up to 50% of an order with points (from the Billing screen).</p></Card>
    <Card className="space-y-2"><h2 className="font-semibold">Membership tiers</h2>
      {s.tiers.map((t: any) => <div key={t.id} className="flex justify-between text-sm"><span><b>{t.name}</b> – spend {rs(t.minSpend)}+ · earn ×{t.earnMultiplier}</span>{owner && <button onClick={() => save(`/api/tiers/${t.id}`, undefined, "DELETE")}>🗑</button>}</div>)}
      {owner && <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save("/api/tiers", { name: f.get("name"), minSpend: Math.round(Number(f.get("min")) * 100), earnMultiplier: Number(f.get("mul") || 1) }); }}>
        <Input name="name" placeholder="Gold" className="w-28" required /><Input name="min" type="number" placeholder="Spend ₹" className="w-28" required /><Input name="mul" type="number" step="0.1" placeholder="×" className="w-16" /><Button>Add</Button></form>}</Card>
    <Card className="space-y-2 lg:col-span-2"><h2 className="font-semibold">Coupons</h2>
      {coupons.map((c) => <div key={c.id} className="text-sm"><b>{c.code}</b> · {c.type === "PERCENT" ? `${c.value}%` : rs(c.value)} off · min {rs(c.minOrder)} · used {c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""} {c.validTo && `· till ${new Date(c.validTo).toLocaleDateString("en-IN")}`}</div>)}
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const t = f.get("type"); save("/api/coupons", { code: f.get("code"), type: t, value: t === "FLAT" ? Math.round(Number(f.get("value")) * 100) : Number(f.get("value")), minOrder: Math.round(Number(f.get("min") || 0) * 100), usageLimit: f.get("limit") ? Number(f.get("limit")) : null }); }}>
        <Input name="code" placeholder="CODE" className="w-32" required /><Select name="type" className="w-24"><option value="PERCENT">%</option><option value="FLAT">₹</option></Select><Input name="value" type="number" placeholder="Value" className="w-24" required />
        <Input name="min" type="number" placeholder="Min order ₹" className="w-32" /><Input name="limit" type="number" placeholder="Max uses" className="w-28" /><Button>Add coupon</Button></form></Card>
    {node}
  </div>;
}
