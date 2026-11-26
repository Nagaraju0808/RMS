"use client";
import * as React from "react";
import { Mic, X } from "lucide-react";
import { Badge, Button, Dialog, Input, Label, Select, Textarea, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { itemAvailable, priceFor, Channel } from "@/lib/menu";
import { computeBill } from "@/lib/billing";
import { useApp, useLive } from "@/components/app/AppContext";
import { FoodDot } from "@/components/app/FoodDot";
import { ItemPicker, PendingLine } from "./ItemPicker";
import { cn } from "@/lib/utils";

const STATUS_COLOR: Record<string, string> = { NEW: "blue", PREPARING: "orange", READY: "green", SERVED: "slate", CANCELLED: "red" };

/** The order-taking screen used by POS (desktop/tablet) and the waiter view (phone). */
export function OrderBuilder({ mode = "pos", initialOrderId, initialTableId, onDone }: { mode?: "pos" | "waiter"; initialOrderId?: string; initialTableId?: string; onDone?: () => void }) {
  const { me } = useApp();
  const [menu, setMenu] = React.useState<any>(null);
  const [tables, setTables] = React.useState<any[]>([]);
  const [order, setOrder] = React.useState<any>(null);
  const [pending, setPending] = React.useState<PendingLine[]>([]);
  const [type, setType] = React.useState<Channel>("DINE_IN");
  const [tableId, setTableId] = React.useState<string>(initialTableId || "");
  const [cust, setCust] = React.useState({ customerName: "", customerPhone: "", guests: 2, notes: "", deliveryAddress: "" });
  const [cat, setCat] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [picking, setPicking] = React.useState<any>(null);
  const [dialog, setDialog] = React.useState<null | "discount" | "cancel" | "held" | "comp" | "move">(null);
  const [held, setHeld] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [showCart, setShowCart] = React.useState(false);
  const [upsell, setUpsell] = React.useState<any[]>([]);
  const [voice, setVoice] = React.useState<null | { text: string; items: any[]; unknown: string[] }>(null);
  const [listening, setListening] = React.useState(false);
  const { toast, node } = useToast();
  const searchRef = React.useRef<HTMLInputElement>(null);
  const features = me?.features || {};
  const settings = me?.branch?.settings || {};

  React.useEffect(() => {
    api("/api/menu").then((m) => {
      const def = m.taxRates.find((t: any) => t.isDefault)?.ratePercent ?? 5;
      m.items = m.items.map((i: any) => ({ ...i, taxPercent: m.taxRates.find((t: any) => t.id === i.taxRateId)?.ratePercent ?? def }));
      setMenu(m);
    });
    if (features.tables !== false) api("/api/tables").then((d) => setTables(d.tables)).catch(() => {});
  }, [features.tables]);
  React.useEffect(() => { if (me && features.tables === false && type === "DINE_IN") setType("TAKEAWAY"); }, [me]); // eslint-disable-line
  const loadOrder = React.useCallback(async (id: string) => {
    const o = await api(`/api/orders/${id}`); setOrder(o); setType(o.type); setTableId(o.tableId || "");
    setCust({ customerName: o.customerName || "", customerPhone: o.customerPhone || "", guests: o.guests, notes: o.notes || "", deliveryAddress: o.deliveryAddress || "" });
  }, []);
  React.useEffect(() => {
    if (initialOrderId) loadOrder(initialOrderId);
    else if (initialTableId) api(`/api/orders?active=1`).then((os: any[]) => { const o = os.find((x) => x.tableId === initialTableId && x.status !== "BILLED"); if (o) loadOrder(o.id); });
  }, [initialOrderId, initialTableId, loadOrder]);
  useLive("item:status", () => order && loadOrder(order.id));
  useLive("order:updated", (d) => order && d.id === order.id && loadOrder(order.id));
  React.useEffect(() => {
    const ids = [...new Set([...pending.map((p) => p.menuItemId), ...(order?.items || []).map((i: any) => i.menuItemId)])];
    if (!ids.length) return setUpsell([]);
    fetch(`/api/smart/upsell?ids=${ids.join(",")}`).then((r) => (r.ok ? r.json() : [])).then(setUpsell).catch(() => setUpsell([]));
  }, [pending.length, order?.items?.length]); // eslint-disable-line

  // Keyboard: "/" focuses search on POS
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "/" && document.activeElement?.tagName !== "INPUT") { e.preventDefault(); searchRef.current?.focus(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  if (!menu || !me) return <p className="muted">Loading…</p>;
  const visible = menu.items.filter((i: any) => i.active && (cat === "all" || i.categoryId === cat) && (!q || i.name.toLowerCase().includes(q.toLowerCase()) || (i.sku || "").toLowerCase() === q.toLowerCase()));
  const add = (item: any) => {
    if (!itemAvailable(item, menu.schedules)) return toast(`${item.name} is not available now`, "err");
    if (item.variants.length || item.addonGroupIds.length) return setPicking(item);
    setPending((p) => {
      const ex = p.find((l) => l.menuItemId === item.id && !l.variantId && !l.addonIds.length && !l.notes);
      if (ex) return p.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l));
      return [...p, { key: Math.random().toString(36).slice(2), menuItemId: item.id, variantId: null, addonIds: [], quantity: 1, name: item.name, unitPrice: priceFor(item, type), taxPercent: item.taxPercent }];
    });
  };
  const sentItems = (order?.items || []) as any[];
  const preview = computeBill({
    lines: [...sentItems, ...pending], discount: order?.discountType ? { type: order.discountType, value: order.discountValue } : null,
    serviceChargePercent: type === "DINE_IN" ? settings.serviceChargePercent : 0, packingCharge: order?.packingCharge || (type !== "DINE_IN" ? (settings.packingChargePerItem || 0) * pending.reduce((n, l) => n + l.quantity, 0) : 0),
    interState: settings.interState, roundOff: settings.roundOff,
  });
  const lineBody = (l: PendingLine) => ({ menuItemId: l.menuItemId, variantId: l.variantId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes });
  async function submit(opts: { send: boolean; hold?: boolean }) {
    if (busy) return; setBusy(true);
    try {
      let o = order;
      if (!o) {
        if (!pending.length) throw new Error("Add some items first.");
        o = await api("/api/orders", { body: { type, tableId: type === "DINE_IN" ? tableId || null : null, ...cust, customerName: cust.customerName || undefined, customerPhone: cust.customerPhone || undefined, notes: cust.notes || undefined, deliveryAddress: cust.deliveryAddress || undefined, items: pending.map(lineBody), send: opts.send, hold: opts.hold, clientId: crypto.randomUUID() } });
      } else if (pending.length) {
        o = await api(`/api/orders/${o.id}/items`, { body: { items: pending.map(lineBody), send: opts.send } });
        if (opts.hold) o = await api(`/api/orders/${o.id}/hold`, { body: { hold: true } });
      } else if (opts.send) o = await api(`/api/orders/${o.id}/send`, { method: "POST" });
      else if (opts.hold) o = await api(`/api/orders/${o.id}/hold`, { body: { hold: true } });
      setPending([]);
      toast(opts.hold ? "Order held" : opts.send ? `KOT sent${o.tokenNo ? ` · Token #${o.tokenNo}` : ""}` : "Saved");
      if (opts.hold) { newOrder(); } else setOrder(o);
      onDone?.();
    } catch (e: any) { toast(e.message, "err"); } finally { setBusy(false); }
  }
  async function parseVoice(text: string) {
    try { const r = await api("/api/smart/voice", { body: { text } }); setVoice({ text, ...r }); } catch (e: any) { toast(e.message, "err"); }
  }
  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { const t = prompt("Voice is not supported on this browser. Type the order (e.g. two butter naan and one paneer tikka half):"); if (t) parseVoice(t); return; }
    const rec = new SR(); rec.lang = "en-IN"; rec.interimResults = false;
    rec.onresult = (e: any) => parseVoice(e.results[0][0].transcript);
    rec.onerror = () => toast("Could not hear clearly. Try again.", "err");
    rec.onend = () => setListening(false);
    setListening(true); rec.start();
  }
  function newOrder() { setOrder(null); setPending([]); setCust({ customerName: "", customerPhone: "", guests: 2, notes: "", deliveryAddress: "" }); if (!initialTableId) setTableId(""); }
  async function act(url: string, body: any, msg: string) {
    try { const o = await api(url, { body }); setOrder(o); toast(msg); setDialog(null); return o; } catch (e: any) { toast(e.message, "err"); }
  }
  const closed = order && ["PAID", "CANCELLED"].includes(order.status);
  const freeTables = tables.filter((t) => t.status === "FREE" || t.id === tableId);

  const menuPane = (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="mb-2 flex gap-2">
        <Button variant="outline" aria-label="Voice order" title="Speak the order" onClick={() => startVoice()} disabled={listening}><Mic size={16} />{listening ? "Listening…" : "Voice"}</Button>
        <Input ref={searchRef} placeholder="Search item or code  ( / )" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && visible[0]) { add(visible[0]); setQ(""); } }} />
      </div>
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
        {[{ id: "all", name: "All" }, ...menu.categories.filter((c: any) => c.active)].map((c: any) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-lg px-4 py-2 text-sm font-medium", cat === c.id ? "bg-brand-600 text-white" : "border border-app bg-card")}>{c.name}</button>))}
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: mode === "waiter" ? undefined : "calc(100vh - 210px)" }}>
      <div className={cn("grid gap-2", mode === "waiter" ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4")}>
        {visible.map((i: any) => {
          const avail = itemAvailable(i, menu.schedules);
          return (
            <button key={i.id} onClick={() => add(i)} disabled={!avail} className={cn("card flex min-h-20 flex-col justify-between gap-1 p-3 text-left transition active:scale-95", !avail && "opacity-40", mode === "waiter" && "min-h-14 flex-row items-center")}>
              <div className="flex items-start gap-2"><FoodDot t={i.foodType} /><span className="font-medium leading-tight">{i.name}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="muted">{rs(priceFor(i, type))}</span>{!i.inStock && <Badge color="red">Out</Badge>}{i.variants.length > 0 && <Badge>sizes</Badge>}</div>
            </button>);
        })}
      </div>
      </div>
    </div>
  );

  const cartPane = (
    <div className={cn("card flex flex-col p-3", mode === "pos" ? "w-full md:w-[380px] md:shrink-0" : "w-full")}>
      <div className="mb-2 flex flex-wrap items-center gap-1">
        {order ? <div className="flex-1"><b>Order #{order.orderNo}</b>{order.tokenNo && <Badge color="purple" className="ml-1">Token {order.tokenNo}</Badge>} <Badge>{order.status}</Badge> {order.table && <Badge color="blue">{order.table.name}</Badge>}</div>
          : <div className="flex flex-1 gap-1">
            {(features.tables !== false ? ["DINE_IN", "TAKEAWAY", "DELIVERY"] : ["TAKEAWAY", "DELIVERY"]).map((t) => (
              <button key={t} onClick={() => setType(t as Channel)} className={cn("flex-1 rounded-lg px-2 py-2 text-xs font-semibold", type === t ? "bg-brand-600 text-white" : "border border-app")}>{t.replace("_", "-")}</button>))}
          </div>}
        {order && <Button size="sm" variant="outline" onClick={newOrder}>New</Button>}
      </div>
      {!order && type === "DINE_IN" && features.tables !== false && (
        <Select aria-label="Table" value={tableId} onChange={(e) => setTableId(e.target.value)} className="mb-2">
          <option value="">Choose table…</option>{freeTables.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.seats} seats){t.status !== "FREE" ? " – busy" : ""}</option>)}
        </Select>)}
      {!order && type !== "DINE_IN" && <div className="mb-2 grid grid-cols-2 gap-2">
        <Input placeholder="Customer name" value={cust.customerName} onChange={(e) => setCust({ ...cust, customerName: e.target.value })} />
        <Input placeholder="Phone" value={cust.customerPhone} onChange={(e) => setCust({ ...cust, customerPhone: e.target.value })} />
        {type === "DELIVERY" && <Input className="col-span-2" placeholder="Delivery address" value={cust.deliveryAddress} onChange={(e) => setCust({ ...cust, deliveryAddress: e.target.value })} />}
      </div>}
      <div className="min-h-24 flex-1 space-y-1 overflow-y-auto" style={{ maxHeight: mode === "pos" ? "calc(100vh - 470px)" : undefined }}>
        {sentItems.map((l) => (
          <div key={l.id} className={cn("flex items-start justify-between gap-2 rounded-lg p-2 text-sm", l.status === "CANCELLED" ? "line-through opacity-50" : "bg-black/5 dark:bg-white/5")}>
            <div className="min-w-0"><div>{l.quantity} × {l.name} {l.complimentary && <Badge color="purple">FREE</Badge>}</div>
              {(l.addons as any[]).length > 0 && <div className="text-xs muted">+ {(l.addons as any[]).map((a) => a.name).join(", ")}</div>}
              {l.notes && <div className="text-xs italic muted">“{l.notes}”</div>}</div>
            <div className="text-right"><div>{rs(l.unitPrice * l.quantity)}</div>{l.kotId ? <Badge color={STATUS_COLOR[l.status]}>{l.status}</Badge> : <Badge color="yellow">not sent</Badge>}
              {!closed && l.status !== "CANCELLED" && <button className="ml-1 text-xs text-red-600" onClick={() => {
                const reason = l.kotId ? prompt("Reason for cancelling this item?") : "";
                if (l.kotId && !reason) return;
                api(`/api/orders/${order.id}/items/${l.id}`, { method: "PUT", body: { cancel: true, reason } }).then(setOrder).catch((e) => toast(e.message, "err"));
              }}><X size={14} /></button>}</div>
          </div>))}
        {pending.map((l) => (
          <div key={l.key} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-brand-500 p-2 text-sm">
            <div className="min-w-0 flex-1"><div className="truncate">{l.name}</div>{l.notes && <div className="text-xs italic muted">“{l.notes}”</div>}
              <button className="text-xs text-brand-600" onClick={() => { const n = prompt("Note for kitchen", l.notes || ""); if (n != null) setPending((p) => p.map((x) => (x.key === l.key ? { ...x, notes: n || undefined } : x))); }}>+ note</button></div>
            <div className="flex items-center gap-1">
              <button aria-label="less" className="h-8 w-8 rounded border border-app" onClick={() => setPending((p) => p.flatMap((x) => (x.key === l.key ? (x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []) : [x])))}>−</button>
              <span className="w-6 text-center">{l.quantity}</span>
              <button aria-label="more" className="h-8 w-8 rounded border border-app" onClick={() => setPending((p) => p.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button>
            </div>
            <div className="w-20 text-right">{rs(l.unitPrice * l.quantity)}</div>
          </div>))}
        {!sentItems.length && !pending.length && <p className="p-4 text-center text-sm muted">Tap items to add them.</p>}
      </div>
      {upsell.length > 0 && !closed && <div className="mt-2 text-xs"><span className="muted">Often ordered together: </span>{upsell.slice(0, 3).map((u: any) => { const it = menu.items.find((i: any) => i.id === u.id); return it ? <button key={u.id} onClick={() => add(it)} className="mr-1 rounded-full border border-brand-500 px-2 py-0.5 text-brand-600">+ {it.name}</button> : null; })}</div>}
      <div className="mt-2 space-y-0.5 border-t border-app pt-2 text-sm">
        <Row l="Subtotal" v={rs(preview.subtotal)} />
        {preview.discount > 0 && <Row l={`Discount${order?.couponCode ? ` (${order.couponCode})` : ""}`} v={"−" + rs(preview.discount)} />}
        {preview.serviceCharge > 0 && <Row l="Service charge" v={rs(preview.serviceCharge)} />}
        {preview.packingCharge > 0 && <Row l="Packing" v={rs(preview.packingCharge)} />}
        <Row l={settings.interState ? "IGST" : "CGST + SGST"} v={rs(preview.tax)} />
        {preview.roundOff !== 0 && <Row l="Round off" v={rs(preview.roundOff)} />}
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span data-testid="total">{rs(preview.total)}</span></div>
      </div>
      {!closed && <div className="mt-2 grid grid-cols-2 gap-2">
        <Button size="lg" className="col-span-2" disabled={busy} onClick={() => submit({ send: true })}>Send KOT</Button>
        <Button variant="outline" onClick={() => submit({ send: false, hold: true })} disabled={busy}>Hold</Button>
        {order ? <a href={`/billing?order=${order.id}`} className="contents"><Button variant="success">Bill / Pay</Button></a> : <Button variant="outline" onClick={() => api("/api/orders?status=HELD").then((h) => { setHeld(h); setDialog("held"); })}>Held orders</Button>}
        {order && mode === "pos" && <>
          <Button variant="outline" size="sm" onClick={() => setDialog("discount")}>Discount</Button>
          <Button variant="outline" size="sm" onClick={() => setDialog("comp")}>Complimentary</Button>
          {order.tableId && <Button variant="outline" size="sm" onClick={() => setDialog("move")}>Move table</Button>}
          <Button variant="danger" size="sm" onClick={() => setDialog("cancel")}>Cancel order</Button>
        </>}
      </div>}
      {order && <Textarea rows={1} className="mt-2 text-sm" placeholder="Order note" defaultValue={order.notes || ""} onBlur={(e) => api(`/api/orders/${order.id}`, { method: "PUT", body: { notes: e.target.value } })} />}
    </div>
  );

  return (
    <div className={cn("flex gap-3", mode === "pos" ? "flex-col md:flex-row" : "flex-col")}>
      {mode === "waiter" ? (showCart ? cartPane : menuPane) : <>{menuPane}{cartPane}</>}
      {mode === "waiter" && <div className="sticky bottom-2 z-10"><Button size="lg" className="w-full" onClick={() => setShowCart(!showCart)}>{showCart ? "← Back to menu" : `View order (${pending.reduce((n, l) => n + l.quantity, 0)} new) · ${rs(preview.total)}`}</Button></div>}
      {voice && <Dialog open onClose={() => setVoice(null)} title="Check the voice order">
        <p className="mb-2 text-sm muted">Heard: “{voice.text}”</p>
        {voice.items.map((l, i) => <div key={i} className="flex justify-between border-b border-app py-1"><span>{l.quantity} × {l.name}</span><button className="text-red-600" aria-label="remove" onClick={() => setVoice({ ...voice, items: voice.items.filter((_, j) => j !== i) })}><X size={14} /></button></div>)}
        {voice.unknown.length > 0 && <p className="mt-2 text-sm text-red-600">Not understood: {voice.unknown.join(", ")}</p>}
        <div className="mt-3 flex gap-2"><Button variant="outline" onClick={() => { setVoice(null); startVoice(); }}>Speak again</Button>
          <Button className="flex-1" disabled={!voice.items.length} onClick={() => { setPending((p) => [...p, ...voice.items.map((l) => { const it = menu.items.find((x: any) => x.id === l.menuItemId); const v = it?.variants.find((x: any) => x.id === l.variantId); return { key: Math.random().toString(36).slice(2), menuItemId: l.menuItemId, variantId: l.variantId ?? (it?.variants[0]?.id ?? null), addonIds: [], quantity: l.quantity, name: l.name, unitPrice: priceFor(v ?? it?.variants[0] ?? it, type), taxPercent: it?.taxPercent ?? 5 }; })]); setVoice(null); toast("Added – check and press Send KOT"); }}>Add to order</Button></div>
      </Dialog>}
      {picking && <ItemPicker item={picking} menu={menu} channel={type} onAdd={(l) => setPending((p) => [...p, l])} onClose={() => setPicking(null)} />}
      {dialog === "held" && <Dialog open onClose={() => setDialog(null)} title="Held orders">
        {held.length === 0 && <p className="muted">No held orders.</p>}
        {held.map((h) => <button key={h.id} className="mb-2 w-full rounded-lg border border-app p-3 text-left" onClick={async () => { await api(`/api/orders/${h.id}/hold`, { body: { hold: false } }); await loadOrder(h.id); setDialog(null); }}>
          #{h.orderNo} {h.customerName || h.table?.name || h.type} · {h.items.length} items · {new Date(h.createdAt).toLocaleTimeString()}</button>)}
      </Dialog>}
      {dialog === "discount" && order && <DiscountDialog order={order} onClose={() => setDialog(null)} act={act} role={me.user.role} />}
      {dialog === "cancel" && order && <Dialog open onClose={() => setDialog(null)} title="Cancel order">
        <form onSubmit={(e) => { e.preventDefault(); act(`/api/orders/${order.id}/cancel`, { reason: new FormData(e.currentTarget).get("reason") }, "Order cancelled").then((o) => o && newOrder()); }}>
          <Label>Reason</Label><Select name="reason" className="mb-3">{["Customer left", "Wrong order", "Item not available", "Duplicate order", "Other"].map((r) => <option key={r}>{r}</option>)}</Select>
          <Button variant="danger" className="w-full">Cancel order</Button></form></Dialog>}
      {dialog === "comp" && order && <Dialog open onClose={() => setDialog(null)} title="Make item complimentary (free)">
        <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const it = sentItems.find((i) => i.id === f.get("item")); act(`/api/orders/${order.id}/comp`, { itemId: f.get("item"), complimentary: !it?.complimentary, managerPin: f.get("pin") || undefined, reason: f.get("reason") || undefined }, "Updated"); }} className="space-y-2">
          <Select name="item">{sentItems.filter((i) => i.status !== "CANCELLED").map((i) => <option key={i.id} value={i.id}>{i.name} {i.complimentary ? "(free – undo)" : ""}</option>)}</Select>
          <Input name="reason" placeholder="Reason (e.g. regular guest, delay)" />
          {!["OWNER", "MANAGER"].includes(me.user.role) && <Input name="pin" type="password" inputMode="numeric" maxLength={4} placeholder="Manager PIN" required />}
          <Button className="w-full">Apply</Button></form></Dialog>}
      {dialog === "move" && order && <Dialog open onClose={() => setDialog(null)} title="Move to another table">
        <div className="grid grid-cols-3 gap-2">{tables.filter((t) => t.status === "FREE").map((t) => <Button key={t.id} variant="outline" onClick={() => api("/api/tables/move", { body: { orderId: order.id, toTableId: t.id } }).then(() => { loadOrder(order.id); setDialog(null); toast(`Moved to ${t.name}`); }).catch((e) => toast(e.message, "err"))}>{t.name}</Button>)}</div></Dialog>}
      {node}
    </div>
  );
}
const Row = ({ l, v }: { l: string; v: string }) => <div className="flex justify-between"><span className="muted">{l}</span><span>{v}</span></div>;

function DiscountDialog({ order, onClose, act, role }: any) {
  const [type, setType] = React.useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [pin, setPin] = React.useState("");
  const [coupon, setCoupon] = React.useState("");
  return <Dialog open onClose={onClose} title="Discount">
    <div className="space-y-3">
      <div className="flex gap-2"><Input placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} /><Button variant="outline" onClick={() => act(`/api/orders/${order.id}/discount`, { couponCode: coupon }, "Coupon applied")}>Apply</Button></div>
      <div className="text-center text-xs muted">— or manual discount —</div>
      <div className="flex gap-2"><Select value={type} onChange={(e) => setType(e.target.value as any)} className="w-32"><option value="PERCENT">%</option><option value="FLAT">₹ flat</option></Select>
        <Input type="number" placeholder="Value" value={value} onChange={(e) => setValue(e.target.value)} /></div>
      <div className="flex flex-wrap gap-1">{[5, 10, 15, 20].map((p) => <button key={p} className="rounded-full border border-app px-3 py-1 text-sm" onClick={() => { setType("PERCENT"); setValue(String(p)); }}>{p}%</button>)}</div>
      <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      {!["OWNER", "MANAGER"].includes(role) && <Input type="password" inputMode="numeric" maxLength={4} placeholder="Manager PIN (needed above 10%)" value={pin} onChange={(e) => setPin(e.target.value)} />}
      <div className="flex gap-2"><Button className="flex-1" onClick={() => act(`/api/orders/${order.id}/discount`, { type, value: type === "FLAT" ? Math.round(Number(value) * 100) : Number(value), reason, managerPin: pin || undefined }, "Discount applied")}>Apply discount</Button>
        {order.discountType && <Button variant="outline" onClick={() => act(`/api/orders/${order.id}/discount`, { remove: true }, "Discount removed")}>Remove</Button>}</div>
    </div>
  </Dialog>;
}
