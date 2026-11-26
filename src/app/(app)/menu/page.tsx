"use client";
import * as React from "react";
import { Trash2, X } from "lucide-react";
import { Badge, Button, Card, Dialog, Input, Label, PageHeader, Select, Table, Tabs, Textarea, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useApp } from "@/components/app/AppContext";
import { FoodDot } from "@/components/app/FoodDot";

const toR = (p?: number | null) => (p == null ? "" : String(p / 100));
const toP = (r: string) => (r === "" ? null : Math.round(Number(r) * 100));

export default function MenuPage() {
  const { me } = useApp();
  const [tab, setTab] = React.useState<"items" | "categories" | "addons" | "combos" | "schedules" | "import">("items");
  const [m, setM] = React.useState<any>(null);
  const [q, setQ] = React.useState("");
  const [edit, setEdit] = React.useState<any>(null);
  const { toast, node } = useToast();
  const load = () => api("/api/menu").then(setM);
  React.useEffect(() => { load(); }, []);
  const canManage = me && ["OWNER", "MANAGER"].includes(me.user.role);
  const run = async (fn: () => Promise<any>, msg = "Saved") => { try { await fn(); toast(msg); load(); } catch (e: any) { toast(e.message, "err"); } };
  if (!m) return <p className="muted">Loading…</p>;
  const catName = (id: string) => m.categories.find((c: any) => c.id === id)?.name || "";
  const items = m.items.filter((i: any) => i.active && (!q || i.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <div>
      <PageHeader title="Menu">{canManage && tab === "items" && <Button onClick={() => setEdit({ categoryId: m.categories[0]?.id, foodType: "VEG", spiceLevel: 0, allergens: [], variants: [], addonGroupIds: [], scheduleIds: [], priceDineIn: 0 })}>+ New item</Button>}</PageHeader>
      <Tabs value={tab} onChange={setTab} options={[{ value: "items", label: "Items" }, { value: "categories", label: "Categories" }, { value: "addons", label: "Add-ons" }, { value: "combos", label: "Combos" }, { value: "schedules", label: "Time menus" }, { value: "import", label: "Import / Export" }]} />

      {tab === "items" && <>
        <Input placeholder="Search items…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 max-w-sm" />
        <Table head={["", "Item", "Category", "Dine-in", "Takeaway", "Online", "Variants", "In stock", ""]} rows={items.map((i: any) => [
          <FoodDot t={i.foodType} key="f" />,
          <div key="n"><div className="font-medium">{i.name}</div><div className="text-xs muted">{i.spiceLevel ? `Spice ${i.spiceLevel}/3` : ""}{i.spiceLevel && i.allergens.length ? " · " : ""}{i.allergens.join(", ")}</div></div>,
          catName(i.categoryId), rs(i.priceDineIn), i.priceTakeaway != null ? rs(i.priceTakeaway) : "–", i.priceOnline != null ? rs(i.priceOnline) : "–",
          i.variants.map((v: any) => v.name).join(", ") || "–",
          <button key="s" aria-label={`Toggle stock ${i.name}`} onClick={() => run(() => api(`/api/menu/items/${i.id}`, { method: "PATCH", body: { inStock: !i.inStock } }), i.inStock ? "Marked out of stock" : "Back in stock")}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${i.inStock ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{i.inStock ? "In stock" : "Out of stock"}</button>,
          canManage ? <div key="a" className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setEdit(i)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => confirm(`Delete ${i.name}?`) && run(() => api(`/api/menu/items/${i.id}`, { method: "DELETE" }), "Deleted")}aria-label={`Delete ${i.name}`}><Trash2 size={15} /></Button></div> : null,
        ])} />
      </>}

      {tab === "categories" && <Card>
        {canManage && <form className="mb-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api("/api/menu/categories", { body: { name: f.get("name"), sortOrder: m.categories.length } })); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="New category" required /><Button>Add</Button></form>}
        <div className="space-y-2">{m.categories.map((c: any) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-app pb-2">
            <span className="min-w-40 font-medium">{c.name}</span>{!c.active && <Badge>hidden</Badge>}
            <span className="text-xs muted">{m.items.filter((i: any) => i.categoryId === c.id && i.active).length} items</span>
            {canManage && <>
              <Select className="w-40" aria-label="Kitchen station" value={c.stationId || ""} onChange={(e) => run(() => api(`/api/menu/categories/${c.id}`, { method: "PUT", body: { stationId: e.target.value || null } }))}>
                <option value="">No station</option>{m.stations.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
              <Input className="w-40" placeholder="తెలుగు name" defaultValue={c.nameI18n?.te || ""} onBlur={(e) => run(() => api(`/api/menu/categories/${c.id}`, { method: "PUT", body: { nameI18n: { ...c.nameI18n, te: e.target.value } } }))} />
              <Input className="w-40" placeholder="हिंदी name" defaultValue={c.nameI18n?.hi || ""} onBlur={(e) => run(() => api(`/api/menu/categories/${c.id}`, { method: "PUT", body: { nameI18n: { ...c.nameI18n, hi: e.target.value } } }))} />
              <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => run(() => api(`/api/menu/categories/${c.id}`, { method: "DELETE" }))}><Trash2 size={15} /></Button>
            </>}
          </div>))}</div>
        {canManage && <form className="mt-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api("/api/menu/stations", { body: { name: f.get("name") } })); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="New kitchen station (e.g. Tandoor)" required /><Button variant="outline">Add station</Button>
          <span className="self-center text-sm muted">Stations: {m.stations.map((s: any) => s.name).join(", ")}</span></form>}
      </Card>}

      {tab === "addons" && <AddonGroups m={m} run={run} canManage={!!canManage} />}
      {tab === "combos" && <Combos m={m} run={run} canManage={!!canManage} />}
      {tab === "schedules" && <Schedules m={m} run={run} canManage={!!canManage} />}
      {tab === "import" && <ImportExport onDone={load} toast={toast} />}

      {edit && <ItemEditor m={m} item={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); toast("Item saved"); }} />}
      {node}
    </div>
  );
}

function ItemEditor({ m, item, onClose, onSaved }: any) {
  const [f, setF] = React.useState<any>({ ...item, allergensText: (item.allergens || []).join(", "), nameI18n: item.nameI18n || {} });
  const [err, setErr] = React.useState("");
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  async function upload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json();
    if (r.ok) set("imageUrl", d.url); else setErr(d.error);
  }
  async function save() {
    setErr("");
    const body = {
      categoryId: f.categoryId, name: f.name, nameI18n: f.nameI18n, description: f.description || null, imageUrl: f.imageUrl || null, foodType: f.foodType, spiceLevel: Number(f.spiceLevel),
      allergens: f.allergensText.split(",").map((s: string) => s.trim()).filter(Boolean), priceDineIn: f.priceDineIn, priceTakeaway: f.priceTakeaway ?? null, priceOnline: f.priceOnline ?? null,
      taxRateId: f.taxRateId || null, stationId: f.stationId || null, scheduleIds: f.scheduleIds, addonGroupIds: f.addonGroupIds,
      variants: f.variants.map((v: any) => ({ id: v.id, name: v.name, priceDineIn: v.priceDineIn, priceTakeaway: v.priceTakeaway ?? null, priceOnline: v.priceOnline ?? null })),
    };
    try { await api(item.id ? `/api/menu/items/${item.id}` : "/api/menu/items", { method: item.id ? "PUT" : "POST", body }); onSaved(); } catch (e: any) { setErr(e.message); }
  }
  const toggle = (k: string, id: string) => set(k, f[k].includes(id) ? f[k].filter((x: string) => x !== id) : [...f[k], id]);
  return (
    <Dialog open onClose={onClose} title={item.id ? `Edit ${item.name}` : "New item"} wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="iname">Name</Label><Input id="iname" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Category</Label><Select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{m.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></div>
        <div><Label>Name in Telugu</Label><Input value={f.nameI18n.te || ""} onChange={(e) => set("nameI18n", { ...f.nameI18n, te: e.target.value })} /></div>
        <div><Label>Name in Hindi</Label><Input value={f.nameI18n.hi || ""} onChange={(e) => set("nameI18n", { ...f.nameI18n, hi: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={f.description || ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div><Label htmlFor="pdi">Dine-in price (₹)</Label><Input id="pdi" type="number" step="0.01" value={toR(f.priceDineIn)} onChange={(e) => set("priceDineIn", toP(e.target.value) ?? 0)} /></div>
        <div><Label>Takeaway price (₹, blank = same)</Label><Input type="number" step="0.01" value={toR(f.priceTakeaway)} onChange={(e) => set("priceTakeaway", toP(e.target.value))} /></div>
        <div><Label>Online price (₹, blank = same)</Label><Input type="number" step="0.01" value={toR(f.priceOnline)} onChange={(e) => set("priceOnline", toP(e.target.value))} /></div>
        <div><Label>Food type</Label><Select value={f.foodType} onChange={(e) => set("foodType", e.target.value)}><option value="VEG">Veg</option><option value="NON_VEG">Non-veg</option><option value="EGG">Egg</option><option value="VEGAN">Vegan</option></Select></div>
        <div><Label>Spice level</Label><Select value={f.spiceLevel} onChange={(e) => set("spiceLevel", e.target.value)}>{[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n === 0 ? "Not spicy" : ["", "Mild", "Medium", "Hot"][n]}</option>)}</Select></div>
        <div><Label>Allergens (comma separated)</Label><Input value={f.allergensText} onChange={(e) => set("allergensText", e.target.value)} placeholder="dairy, nuts, gluten" /></div>
        <div><Label>Tax</Label><Select value={f.taxRateId || ""} onChange={(e) => set("taxRateId", e.target.value)}><option value="">Default</option>{m.taxRates.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
        <div><Label>Kitchen station</Label><Select value={f.stationId || ""} onChange={(e) => set("stationId", e.target.value)}><option value="">From category</option>{m.stations.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></div>
        <div className="sm:col-span-2"><Label>Photo</Label><div className="flex items-center gap-2"><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />{f.imageUrl && <img src={f.imageUrl} alt="" className="h-12 w-12 rounded object-cover" />}</div></div>
      </div>
      <div className="mt-4"><Label>Variants / sizes (e.g. Half, Full)</Label>
        {f.variants.map((v: any, i: number) => (
          <div key={i} className="mb-2 flex gap-2">
            <Input placeholder="Name" value={v.name} onChange={(e) => { const vs = [...f.variants]; vs[i] = { ...v, name: e.target.value }; set("variants", vs); }} />
            <Input placeholder="Price ₹" type="number" value={toR(v.priceDineIn)} onChange={(e) => { const vs = [...f.variants]; vs[i] = { ...v, priceDineIn: toP(e.target.value) ?? 0 }; set("variants", vs); }} />
            <Button variant="ghost" aria-label="Remove size" onClick={() => set("variants", f.variants.filter((_: any, j: number) => j !== i))}><X size={16} /></Button>
          </div>))}
        <Button size="sm" variant="outline" onClick={() => set("variants", [...f.variants, { name: "", priceDineIn: f.priceDineIn }])}>+ Variant</Button>
      </div>
      <div className="mt-4"><Label>Add-on groups</Label><div className="flex flex-wrap gap-2">{m.addonGroups.map((g: any) => (
        <label key={g.id} className="flex items-center gap-1 rounded border border-app px-2 py-1 text-sm"><input type="checkbox" checked={f.addonGroupIds.includes(g.id)} onChange={() => toggle("addonGroupIds", g.id)} />{g.name}</label>))}</div></div>
      <div className="mt-4"><Label>Only available during (none = always)</Label><div className="flex flex-wrap gap-2">{m.schedules.map((g: any) => (
        <label key={g.id} className="flex items-center gap-1 rounded border border-app px-2 py-1 text-sm"><input type="checkbox" checked={f.scheduleIds.includes(g.id)} onChange={() => toggle("scheduleIds", g.id)} />{g.name} ({g.startTime}–{g.endTime})</label>))}</div></div>
      {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save item</Button></div>
    </Dialog>
  );
}

function AddonGroups({ m, run, canManage }: any) {
  const [g, setG] = React.useState<any>(null);
  return <Card>
    {canManage && <Button className="mb-3" onClick={() => setG({ name: "", minSelect: 0, maxSelect: 3, addons: [{ name: "", price: 0, foodType: "VEG" }] })}>+ Add-on group</Button>}
    {m.addonGroups.map((x: any) => (
      <div key={x.id} className="mb-2 flex items-center justify-between border-b border-app pb-2">
        <div><b>{x.name}</b> <span className="text-xs muted">(choose {x.minSelect}–{x.maxSelect})</span><div className="text-sm muted">{x.addons.map((a: any) => `${a.name} ${rs(a.price)}`).join(" · ")}</div></div>
        {canManage && <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setG(x)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Delete group" onClick={() => run(() => api(`/api/menu/addon-groups/${x.id}`, { method: "DELETE" }))}><Trash2 size={15} /></Button></div>}
      </div>))}
    {g && <Dialog open onClose={() => setG(null)} title="Add-on group">
      <div className="space-y-2">
        <Input placeholder="Group name" value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
        <div className="flex gap-2"><Input type="number" aria-label="Min" value={g.minSelect} onChange={(e) => setG({ ...g, minSelect: Number(e.target.value) })} /><Input type="number" aria-label="Max" value={g.maxSelect} onChange={(e) => setG({ ...g, maxSelect: Number(e.target.value) })} /></div>
        {g.addons.map((a: any, i: number) => <div key={i} className="flex gap-2">
          <Input placeholder="Add-on" value={a.name} onChange={(e) => { const as = [...g.addons]; as[i] = { ...a, name: e.target.value }; setG({ ...g, addons: as }); }} />
          <Input placeholder="₹" type="number" value={toR(a.price)} onChange={(e) => { const as = [...g.addons]; as[i] = { ...a, price: toP(e.target.value) ?? 0 }; setG({ ...g, addons: as }); }} />
        </div>)}
        <Button size="sm" variant="outline" onClick={() => setG({ ...g, addons: [...g.addons, { name: "", price: 0, foodType: "VEG" }] })}>+ Add-on</Button>
        <Button className="w-full" onClick={() => { run(() => api(g.id ? `/api/menu/addon-groups/${g.id}` : "/api/menu/addon-groups", { method: g.id ? "PUT" : "POST", body: { name: g.name, minSelect: g.minSelect, maxSelect: g.maxSelect, addons: g.addons.filter((a: any) => a.name).map((a: any) => ({ name: a.name, price: a.price, foodType: a.foodType })) } })); setG(null); }}>Save</Button>
      </div>
    </Dialog>}
  </Card>;
}

function Combos({ m, run, canManage }: any) {
  const [sel, setSel] = React.useState<string[]>([]);
  return <Card>
    {canManage && <form className="mb-3 space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api("/api/menu/combos", { body: { name: f.get("name"), price: toP(String(f.get("price"))) ?? 0, items: sel.map((menuItemId) => ({ menuItemId, quantity: 1 })) } })); setSel([]); e.currentTarget.reset(); }}>
      <div className="flex gap-2"><Input name="name" placeholder="Combo name" required /><Input name="price" type="number" placeholder="Price ₹" required className="w-32" /><Button>Create combo</Button></div>
      <Select multiple className="h-32" value={sel} onChange={(e) => setSel(Array.from(e.target.selectedOptions).map((o) => o.value))}>{m.items.filter((i: any) => i.active).map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}</Select>
      <p className="text-xs muted">Hold Ctrl / Cmd to choose several items.</p>
    </form>}
    {m.combos.map((c: any) => <div key={c.id} className="flex justify-between border-b border-app py-2"><span><b>{c.name}</b> – {rs(c.price)} · {c.items.map((ci: any) => m.items.find((i: any) => i.id === ci.menuItemId)?.name).join(" + ")}</span>
      {canManage && <Button size="sm" variant="ghost" aria-label="Delete combo" onClick={() => run(() => api(`/api/menu/combos/${c.id}`, { method: "DELETE" }))}><Trash2 size={15} /></Button>}</div>)}
  </Card>;
}

function Schedules({ m, run, canManage }: any) {
  return <Card>
    {canManage && <form className="mb-3 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(() => api("/api/menu/schedules", { body: { name: f.get("name"), startTime: f.get("start"), endTime: f.get("end"), discountPercent: Number(f.get("disc") || 0) } })); e.currentTarget.reset(); }}>
      <Input name="name" placeholder="Breakfast / Happy hour" required className="w-48" /><Input name="start" type="time" required className="w-32" /><Input name="end" type="time" required className="w-32" />
      <Input name="disc" type="number" placeholder="Discount % (happy hour)" className="w-48" /><Button>Add</Button></form>}
    {m.schedules.map((s: any) => <div key={s.id} className="flex justify-between border-b border-app py-2"><span><b>{s.name}</b> {s.startTime}–{s.endTime} {s.discountPercent > 0 && <Badge color="orange">{s.discountPercent}% off</Badge>}</span>
      {canManage && <Button size="sm" variant="ghost" aria-label="Delete time menu" onClick={() => run(() => api(`/api/menu/schedules/${s.id}`, { method: "DELETE" }))}><Trash2 size={15} /></Button>}</div>)}
    <p className="mt-2 text-sm muted">Tick a time menu inside an item to show it only at those times.</p>
  </Card>;
}

function ImportExport({ onDone, toast }: any) {
  const [res, setRes] = React.useState<any>(null);
  async function upload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/menu/import", { method: "POST", body: fd }); const d = await r.json();
    setRes(d); if (r.ok) { toast(`Imported: ${d.created} new, ${d.updated} updated`); onDone(); } else toast(d.error, "err");
  }
  return <Card className="space-y-3">
    <div className="flex gap-2"><a href="/api/menu/export?format=csv"><Button variant="outline">Download CSV</Button></a><a href="/api/menu/export?format=xlsx"><Button variant="outline">Download Excel</Button></a></div>
    <div><Label>Upload CSV or Excel (.xlsx)</Label><input type="file" accept=".csv,.xlsx" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></div>
    <p className="text-sm muted">Columns: category, name, description, foodType (VEG/NON_VEG/EGG/VEGAN), spiceLevel (0-3), allergens (a|b), priceDineIn, priceTakeaway, priceOnline (in rupees), variants (Half:150|Full:250), inStock (yes/no), taxPercent. Tip: download first, edit, upload again.</p>
    {res?.errors?.length > 0 && <div className="text-sm text-red-600">{(res.details || res.errors).map((e: string, i: number) => <div key={i}>{e}</div>)}</div>}
  </Card>;
}
