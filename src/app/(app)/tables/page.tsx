"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Dialog, Input, PageHeader, Select, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useApp, useLive } from "@/components/app/AppContext";
import { TABLE_COLORS } from "./colors";
import { cn } from "@/lib/utils";

export default function TablesPage() {
  const { me } = useApp(); const router = useRouter();
  const [data, setData] = React.useState<any>(null);
  const [section, setSection] = React.useState<string>("all");
  const [editMode, setEditMode] = React.useState(false);
  const [sel, setSel] = React.useState<any>(null);
  const [merge, setMerge] = React.useState(false);
  const drag = React.useRef<{ id: string; dx: number; dy: number } | null>(null);
  const { toast, node } = useToast();
  const load = React.useCallback(() => api("/api/tables").then(setData), []);
  React.useEffect(() => { load(); }, [load]);
  useLive("table:updated", load); useLive("order:new", load); useLive("table:request", load);
  if (!data) return <p className="muted">Loading…</p>;
  const canEdit = me && ["OWNER", "MANAGER"].includes(me.user.role);
  const tables = data.tables.filter((t: any) => section === "all" || t.sectionId === section);
  const run = (p: Promise<any>, msg: string) => p.then(() => { toast(msg); load(); setSel(null); }).catch((e) => toast(e.message, "err"));

  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.round((e.clientX - rect.left - drag.current.dx) / 10) * 10), y = Math.max(0, Math.round((e.clientY - rect.top - drag.current.dy) / 10) * 10);
    setData((d: any) => ({ ...d, tables: d.tables.map((t: any) => (t.id === drag.current!.id ? { ...t, posX: x, posY: y } : t)) }));
  };
  const onUp = () => {
    if (!drag.current) return;
    const t = data.tables.find((x: any) => x.id === drag.current!.id); drag.current = null;
    api(`/api/tables/${t.id}`, { method: "PUT", body: { posX: t.posX, posY: t.posY } }).catch((e) => toast(e.message, "err"));
  };
  const total = (t: any) => t.orders.reduce((s: number, o: any) => s + o.items.filter((i: any) => i.status !== "CANCELLED" && !i.complimentary).reduce((a: number, i: any) => a + i.unitPrice * i.quantity, 0), 0);
  const mins = (t: any) => (t.orders[0] ? Math.floor((Date.now() - new Date(t.orders[0].createdAt).getTime()) / 60000) : 0);

  return (
    <div>
      <PageHeader title="Tables">
        {canEdit && <Button variant={editMode ? "default" : "outline"} onClick={() => setEditMode(!editMode)}>{editMode ? "Done editing" : "Edit floor plan"}</Button>}
      </PageHeader>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {[{ id: "all", name: "All" }, ...data.sections].map((s: any) => <button key={s.id} onClick={() => setSection(s.id)} className={cn("rounded-lg px-3 py-1.5 text-sm", section === s.id ? "bg-brand-600 text-white" : "border border-app")}>{s.name}</button>)}
        <span className="ml-auto flex flex-wrap gap-2 text-xs">{Object.entries(TABLE_COLORS).map(([k, c]) => <span key={k} className="flex items-center gap-1"><span className={`h-3 w-3 rounded ${c}`} />{k.replace("_", " ").toLowerCase()}</span>)}</span>
      </div>
      {editMode && <div className="mb-3 flex flex-wrap gap-2">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/tables", { body: { name: f.get("name"), seats: Number(f.get("seats")), sectionId: section !== "all" ? section : null, shape: f.get("shape") } }), "Table added"); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="Table name (T10)" className="w-36" required /><Input name="seats" type="number" defaultValue={4} className="w-20" /><Select name="shape" className="w-28"><option value="square">Square</option><option value="round">Round</option><option value="rect">Long</option></Select><Button>Add table</Button></form>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(api("/api/sections", { body: { name: new FormData(e.currentTarget).get("name") } }), "Section added"); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="New section (Rooftop)" className="w-44" required /><Button variant="outline">Add section</Button></form>
        <p className="w-full text-sm muted">Drag tables to arrange them. Click a table to rename or delete.</p>
      </div>}
      <div className="card relative h-[70vh] min-h-[400px] overflow-auto" onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} style={{ touchAction: editMode ? "none" : "auto", backgroundImage: editMode ? "radial-gradient(circle, rgba(100,116,139,.25) 1px, transparent 1px)" : undefined, backgroundSize: "20px 20px" }}>
        {tables.map((t: any) => (
          <div key={t.id} data-testid={`table-${t.name}`}
            onPointerDown={(e) => { if (!editMode) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); drag.current = { id: t.id, dx: e.clientX - r.left, dy: e.clientY - r.top }; }}
            onClick={() => !drag.current && setSel(t)}
            className={cn("absolute flex cursor-pointer select-none flex-col items-center justify-center text-white shadow-md", TABLE_COLORS[t.status], t.shape === "round" ? "h-24 w-24 rounded-full" : t.shape === "rect" ? "h-24 w-40 rounded-xl" : "h-24 w-24 rounded-xl", t.requests.length && "ring-4 ring-red-500 animate-pulse", editMode && "cursor-move")}
            style={{ left: t.posX, top: t.posY }}>
            <span className="text-lg font-bold">{t.name}</span>
            <span className="text-xs">{t.seats} seats</span>
            {t.orders.length > 0 && <span className="text-xs">{rs(total(t))} · {mins(t)}m</span>}
            {t.mergedIntoId && <span className="text-[10px]">merged</span>}
          </div>))}
      </div>
      {sel && <Dialog open onClose={() => { setSel(null); setMerge(false); }} title={`Table ${sel.name}`}>
        {editMode ? <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api(`/api/tables/${sel.id}`, { method: "PUT", body: { name: f.get("name"), seats: Number(f.get("seats")), sectionId: f.get("section") || null } }), "Saved"); }}>
          <Input name="name" defaultValue={sel.name} /><Input name="seats" type="number" defaultValue={sel.seats} />
          <Select name="section" defaultValue={sel.sectionId || ""}><option value="">No section</option>{data.sections.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
          <div className="flex gap-2"><Button className="flex-1">Save</Button><Button type="button" variant="danger" onClick={() => run(api(`/api/tables/${sel.id}`, { method: "DELETE" }), "Deleted")}>Delete</Button></div>
          <p className="text-xs muted">QR code for this table is on the QR codes page (Phase 5).</p>
        </form> : merge ? <div>
          <p className="mb-2 text-sm">Merge {sel.name} into which table?</p>
          <div className="grid grid-cols-3 gap-2">{data.tables.filter((t: any) => t.id !== sel.id).map((t: any) => <Button key={t.id} variant="outline" onClick={() => run(api("/api/tables/merge", { body: { fromTableId: sel.id, toTableId: t.id } }), `Merged into ${t.name}`)}>{t.name}</Button>)}</div>
        </div> : <div className="space-y-2">
          <p><Badge>{sel.status}</Badge> {sel.orders[0] && <>Order #{sel.orders[0].orderNo} · {rs(total(sel))}</>}</p>
          {sel.requests.map((r: any) => <p key={r.id} className="text-red-600">{r.type === "CALL_WAITER" ? "🙋 Customer is calling a waiter" : "🧾 Customer asked for the bill"} <button className="underline" onClick={() => run(api(`/api/public/requests/${r.id}/resolve`, { method: "POST" }), "Done")}>done</button></p>)}
          <Button className="w-full" size="lg" onClick={() => router.push(`/pos?table=${sel.id}`)}>{sel.orders.length ? "Open order" : "New order"}</Button>
          {sel.orders[0] && <Button className="w-full" variant="success" onClick={() => router.push(`/billing?order=${sel.orders[0].id}`)}>Bill / Pay</Button>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setMerge(true)}>Merge tables</Button>
            {sel.status === "CLEANING" || sel.status === "BILL_PRINTED" && !sel.orders.length ? <Button variant="outline" onClick={() => run(api(`/api/tables/${sel.id}`, { method: "PUT", body: { status: "FREE" } }), "Table is free")}>Mark free</Button>
              : !sel.orders.length && <Button variant="outline" onClick={() => run(api(`/api/tables/${sel.id}`, { method: "PUT", body: { status: sel.status === "FREE" ? "RESERVED" : "FREE" } }), "Updated")}>{sel.status === "FREE" ? "Mark reserved" : "Mark free"}</Button>}
            {sel.status !== "CLEANING" && !sel.orders.length && <Button variant="outline" onClick={() => run(api(`/api/tables/${sel.id}`, { method: "PUT", body: { status: "CLEANING" } }), "Marked for cleaning")}>Needs cleaning</Button>}
          </div>
        </div>}
      </Dialog>}
      {node}
    </div>
  );
}
