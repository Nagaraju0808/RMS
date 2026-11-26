"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Badge, Button, Card, Dialog, Input, Label, PageHeader, Select, Table, Tabs, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { formatQty } from "@/lib/inventory";
import { useApp } from "@/components/app/AppContext";

const UNITS: Record<string, string[]> = { G: ["KG", "G"], ML: ["L", "ML"], PCS: ["PCS"] };
const per = (u: string) => (u === "G" ? "kg" : u === "ML" ? "litre" : "piece");
type T = "stock" | "recipes" | "po" | "suppliers" | "cost" | "moves";

export default function InventoryPage() {
  const { me } = useApp();
  const canManage = !!me && ["OWNER", "MANAGER"].includes(me.user.role);
  const [tab, setTab] = React.useState<T>("stock");
  const [stock, setStock] = React.useState<any[]>([]);
  const { toast, node } = useToast();
  const loadStock = React.useCallback(() => api("/api/inventory").then(setStock), []);
  React.useEffect(() => { loadStock(); }, [loadStock]);
  const run = (p: Promise<any>, m: string, after?: () => void) => p.then((r) => { toast(m); loadStock(); after?.(); return r; }).catch((e) => toast(e.message, "err"));
  const opts: { value: T; label: string }[] = [{ value: "stock", label: "Stock" }, { value: "recipes", label: "Recipes" }, { value: "cost", label: "Food cost" }, { value: "moves", label: "History" }];
  if (canManage) opts.splice(2, 0, { value: "po", label: "Purchase orders" }, { value: "suppliers", label: "Suppliers" });
  return (
    <div>
      <PageHeader title="Inventory" />
      <Tabs value={tab} onChange={setTab} options={opts} />
      {tab === "stock" && <StockTab stock={stock} run={run} canManage={canManage} />}
      {tab === "recipes" && <RecipesTab stock={stock} run={run} canManage={canManage} />}
      {tab === "po" && <POTab stock={stock} run={run} />}
      {tab === "suppliers" && <SuppliersTab run={run} />}
      {tab === "cost" && <CostTab />}
      {tab === "moves" && <MovesTab />}
      {node}
    </div>
  );
}

function StockTab({ stock, run, canManage }: any) {
  const [adj, setAdj] = React.useState<any>(null);
  const [counting, setCounting] = React.useState(false);
  const [counts, setCounts] = React.useState<Record<string, string>>({});
  const low = stock.filter((s: any) => s.low);
  return <>
    {low.length > 0 && <Card className="mb-3 border-red-400 bg-red-50 dark:bg-red-950/30"><b className="text-red-700">Low stock:</b> {low.map((s: any) => s.name).join(", ")}</Card>}
    {stock.some((s: any) => s.expiring.length) && <Card className="mb-3 border-orange-400 bg-orange-50 dark:bg-orange-950/30"><b className="text-orange-700">Expiring in 3 days:</b> {stock.filter((s: any) => s.expiring.length).map((s: any) => `${s.name} (${s.expiring.map((b: any) => new Date(b.expiryDate).toLocaleDateString("en-IN")).join(", ")})`).join("; ")}</Card>}
    {canManage && <div className="mb-3 flex flex-wrap gap-2">
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/inventory/ingredients", { body: { name: f.get("name"), unit: f.get("unit"), costPerUnit: Math.round(Number(f.get("cost")) * 100), reorderLevel: Number(f.get("reorder") || 0) * (f.get("unit") === "PCS" ? 1 : 1000) } }), "Ingredient added"); e.currentTarget.reset(); }}>
        <Input name="name" placeholder="New ingredient" className="w-40" required /><Select name="unit" className="w-36"><option value="G">kg / g</option><option value="ML">litre / ml</option><option value="PCS">pieces</option></Select>
        <Input name="cost" type="number" step="0.01" placeholder="Cost ₹ per kg/L/pc" className="w-40" /><Input name="reorder" type="number" step="0.01" placeholder="Reorder at (kg/L/pc)" className="w-44" /><Button>Add</Button></form>
      <Button variant="outline" onClick={() => setCounting(!counting)}>{counting ? "Cancel count" : "Stock count"}</Button>
      {counting && <Button onClick={() => run(api("/api/inventory/count", { body: { counts: Object.entries(counts).filter(([, v]) => v !== "").map(([id, v]) => { const s = stock.find((x: any) => x.id === id); return { ingredientId: id, quantity: Number(v), unit: UNITS[s.unit][0] }; }) } }), "Count saved").then(() => { setCounting(false); setCounts({}); })}>Save count</Button>}
    </div>}
    <Table head={["Ingredient", "In stock", "Reorder at", "Cost", "Value", "", ""]} rows={stock.map((s: any) => [
      <b key="n">{s.name}</b>, <span key="q" className={s.low ? "font-bold text-red-600" : ""}>{formatQty(s.quantity, s.unit)}</span>, formatQty(s.reorderLevel, s.unit), `${rs(s.costPerUnit)}/${per(s.unit)}`, rs(s.value),
      counting ? <Input key="c" className="w-28" type="number" step="0.01" placeholder={UNITS[s.unit][0].toLowerCase()} value={counts[s.id] ?? ""} onChange={(e) => setCounts({ ...counts, [s.id]: e.target.value })} /> : s.low ? <Badge key="l" color="red">LOW</Badge> : null,
      canManage && <Button key="a" size="sm" variant="outline" onClick={() => setAdj(s)}>Stock in / wastage</Button>])} />
    {adj && <Dialog open onClose={() => setAdj(null)} title={adj.name}>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/inventory/adjust", { body: { ingredientId: adj.id, type: f.get("type"), quantity: Number(f.get("qty")), unit: f.get("unit"), reason: f.get("reason") || undefined, expiryDate: f.get("expiry") || undefined } }), "Saved", () => setAdj(null)); }}>
        <Select name="type"><option value="PURCHASE">Stock in (purchase)</option><option value="WASTAGE">Wastage</option><option value="ADJUSTMENT">Adjustment (+/−)</option></Select>
        <div className="flex gap-2"><Input name="qty" type="number" step="0.001" placeholder="Quantity" required /><Select name="unit" className="w-24">{UNITS[adj.unit].map((u) => <option key={u}>{u}</option>)}</Select></div>
        <Select name="reason"><option value="">Reason…</option>{["Spoiled", "Expired", "Burnt / cooking mistake", "Spilled", "Staff meal", "Customer return"].map((r) => <option key={r}>{r}</option>)}</Select>
        <Label>Expiry date (stock in)</Label><Input name="expiry" type="date" /><Button className="w-full">Save</Button></form></Dialog>}
  </>;
}

function RecipesTab({ stock, run, canManage }: any) {
  const [menu, setMenu] = React.useState<any>(null); const [sel, setSel] = React.useState<any>(null); const [lines, setLines] = React.useState<any[]>([]);
  React.useEffect(() => { api("/api/menu").then(setMenu); }, []);
  const open = async (id: string) => { const it = await api(`/api/recipes/${id}`); setSel(it); setLines(it.recipe.map((l: any) => ({ ...l }))); };
  if (!menu) return <p className="muted">Loading…</p>;
  return <div className="grid gap-4 md:grid-cols-[260px_1fr]">
    <Card className="max-h-[70vh] overflow-y-auto p-2">{menu.items.filter((i: any) => i.active).map((i: any) => <button key={i.id} onClick={() => open(i.id)} className={`block w-full rounded px-2 py-1.5 text-left text-sm ${sel?.id === i.id ? "bg-brand-600 text-white" : "hover:bg-black/5"}`}>{i.name}</button>)}</Card>
    {sel ? <Card className="space-y-2"><h2 className="font-semibold">Recipe: {sel.name} (per 1 portion)</h2>
      {lines.map((l, i) => { const ing = stock.find((s: any) => s.id === l.ingredientId); return <div key={i} className="flex flex-wrap gap-2">
        <Select className="w-48" value={l.ingredientId} onChange={(e) => { const s = stock.find((x: any) => x.id === e.target.value); setLines(lines.map((x, j) => (j === i ? { ...x, ingredientId: e.target.value, unit: UNITS[s.unit][1] } : x))); }}>{stock.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Input className="w-24" type="number" step="0.001" value={l.quantity} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, quantity: Number(e.target.value) } : x)))} />
        <Select className="w-20" value={l.unit} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}>{(UNITS[ing?.unit] || ["G"]).map((u) => <option key={u}>{u}</option>)}</Select>
        {sel.variants.length > 0 && <Select className="w-32" value={l.variantId || ""} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, variantId: e.target.value || null } : x)))}><option value="">All sizes</option>{sel.variants.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>}
        <Button variant="ghost" aria-label="Remove line" onClick={() => setLines(lines.filter((_, j) => j !== i))}><X size={16} /></Button></div>; })}
      {canManage && <div className="flex gap-2"><Button variant="outline" onClick={() => stock[0] && setLines([...lines, { ingredientId: stock[0].id, quantity: 100, unit: UNITS[stock[0].unit][1], variantId: null }])}>+ Ingredient</Button>
        <Button onClick={() => run(api(`/api/recipes/${sel.id}`, { method: "PUT", body: { lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: l.quantity, unit: l.unit, variantId: l.variantId || null })) } }), "Recipe saved")}>Save recipe</Button></div>}
      <p className="text-sm muted">Stock goes down automatically by this recipe each time the dish is sent to the kitchen, and comes back if it is cancelled.</p>
    </Card> : <p className="muted">Choose a dish to see or edit its recipe.</p>}
  </div>;
}

function POTab({ stock, run }: any) {
  const [pos, setPos] = React.useState<any[]>([]); const [sups, setSups] = React.useState<any[]>([]); const [lines, setLines] = React.useState<any[]>([]); const [recv, setRecv] = React.useState<any>(null);
  const load = () => { api("/api/purchase-orders").then(setPos); api("/api/suppliers").then(setSups); };
  React.useEffect(() => { load(); }, []);
  return <div className="space-y-4">
    <Card className="space-y-2"><h2 className="font-semibold">New purchase order</h2>
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/purchase-orders", { body: { supplierId: f.get("sup"), dueDate: f.get("due") || undefined, lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.qty), unit: l.unit, unitCost: Math.round(Number(l.cost) * 100) })) } }), "Purchase order created", () => { setLines([]); load(); }); }}>
        <div className="flex gap-2"><Select name="sup" className="w-56" required>{sups.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select><Input name="due" type="date" className="w-44" title="Payment due date" /></div>
        {lines.map((l, i) => <div key={i} className="flex flex-wrap gap-2">
          <Select className="w-48" value={l.ingredientId} onChange={(e) => { const s = stock.find((x: any) => x.id === e.target.value); setLines(lines.map((x, j) => (j === i ? { ...x, ingredientId: s.id, unit: UNITS[s.unit][0], cost: (s.costPerUnit / 100).toString() } : x))); }}>{stock.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <Input className="w-24" placeholder="Qty" value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} />
          <span className="self-center text-sm">{l.unit}</span>
          <Input className="w-32" placeholder="₹ per kg/L/pc" value={l.cost} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, cost: e.target.value } : x)))} /></div>)}
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => stock[0] && setLines([...lines, { ingredientId: stock[0].id, qty: "1", unit: UNITS[stock[0].unit][0], cost: (stock[0].costPerUnit / 100).toString() }])}>+ Line</Button>{lines.length > 0 && <Button>Create PO</Button>}</div>
      </form></Card>
    <Table head={["Date", "Supplier", "Items", "Total", "Paid", "Status", ""]} rows={pos.map((p) => [new Date(p.createdAt).toLocaleDateString("en-IN"), p.supplier.name, p.lines.map((l: any) => `${l.ingredient.name} ${formatQty(l.quantity, l.ingredient.unit)}`).join(", "), rs(p.total), rs(p.paid), <Badge key="s">{p.status}</Badge>,
      ["ORDERED", "PARTIAL"].includes(p.status) && <Button key="r" size="sm" onClick={() => setRecv(p)}>Goods received</Button>])} />
    {recv && <Dialog open onClose={() => setRecv(null)} title="Goods received">
      <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api(`/api/purchase-orders/${recv.id}/receive`, { body: { lines: recv.lines.map((l: any) => ({ lineId: l.id, received: Number(f.get(`r_${l.id}`) || 0) * (l.ingredient.unit === "PCS" ? 1 : 1000), expiryDate: f.get(`e_${l.id}`) || undefined })) } }), "Stock added", () => { setRecv(null); load(); }); }}>
        {recv.lines.map((l: any) => <div key={l.id} className="flex flex-wrap items-center gap-2"><span className="w-32">{l.ingredient.name}</span><Input name={`r_${l.id}`} className="w-24" type="number" step="0.001" defaultValue={(l.quantity - l.received) / (l.ingredient.unit === "PCS" ? 1 : 1000)} /><span className="text-sm">{UNITS[l.ingredient.unit][0]}</span><Input name={`e_${l.id}`} type="date" className="w-40" title="Expiry" /></div>)}
        <Button className="w-full">Add to stock</Button></form></Dialog>}
  </div>;
}

function SuppliersTab({ run }: any) {
  const [sups, setSups] = React.useState<any[]>([]);
  const load = () => api("/api/suppliers").then(setSups);
  React.useEffect(() => { load(); }, []);
  return <div className="space-y-3">
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/suppliers", { body: { name: f.get("name"), phone: f.get("phone") || undefined, gstin: f.get("gstin") || undefined } }), "Supplier added", load); e.currentTarget.reset(); }}>
      <Input name="name" placeholder="Supplier name" className="w-48" required /><Input name="phone" placeholder="Phone" className="w-36" /><Input name="gstin" placeholder="GSTIN" className="w-40" /><Button>Add supplier</Button></form>
    <Table head={["Supplier", "Phone", "Billed", "Paid", "Due", ""]} rows={sups.map((s) => [<b key="n">{s.name}</b>, s.phone, rs(s.billed), rs(s.paid), <span key="d" className={s.due > 0 ? "font-semibold text-red-600" : ""}>{rs(s.due)} {s.overdue && <Badge color="red">overdue</Badge>}</span>,
      s.due > 0 && <Button key="p" size="sm" onClick={() => { const a = prompt(`Pay ${s.name} how much (₹)?`, (s.due / 100).toFixed(2)); if (a) run(api(`/api/suppliers/${s.id}/pay`, { body: { amount: Math.round(Number(a) * 100), mode: "UPI" } }), "Payment saved", load); }}>Pay</Button>])} />
  </div>;
}

function CostTab() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => { api("/api/inventory/food-cost").then(setRows); }, []);
  const avg = rows.length ? rows.reduce((a, r) => a + r.foodCostPercent, 0) / rows.length : 0;
  return <><p className="mb-2 text-sm">Average food cost: <b>{avg.toFixed(1)}%</b> (aim for 28–35%)</p>
    <Table head={["Dish", "Category", "Price", "Cost", "Food cost %", "Profit", "Source"]} rows={rows.map((r) => [r.name, r.category, rs(r.price), rs(r.cost), <span key="p" className={r.foodCostPercent > 40 ? "font-bold text-red-600" : r.foodCostPercent < 25 ? "text-green-700" : ""}>{r.foodCostPercent}%</span>, rs(r.profit), r.fromRecipe ? "recipe" : "estimate"])} /></>;
}
function MovesTab() {
  const [rows, setRows] = React.useState<any[]>([]);
  React.useEffect(() => { api("/api/inventory/moves").then(setRows); }, []);
  return <Table head={["Time", "Ingredient", "Type", "Qty", "Reason"]} rows={rows.map((m) => [new Date(m.createdAt).toLocaleString("en-IN"), m.stockLevel.ingredient.name, <Badge key="t" color={m.quantity < 0 ? "red" : "green"}>{m.type}</Badge>, formatQty(m.quantity, m.stockLevel.ingredient.unit), m.reason])} />;
}
