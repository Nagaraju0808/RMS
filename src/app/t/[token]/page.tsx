"use client";
import * as React from "react";
import { HandPlatter, Receipt } from "lucide-react";
import { use } from "react";
import { Badge, Button, Dialog, Input, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { FoodDot } from "@/components/app/FoodDot";
import { ItemPicker, PendingLine } from "@/components/pos/ItemPicker";
import { itemName, Lang, LANGS, t } from "@/lib/i18n";
import { computeBill } from "@/lib/billing";
import { cn } from "@/lib/utils";

export default function QrMenu({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [m, setM] = React.useState<any>(null);
  const [err, setErr] = React.useState("");
  const [lang, setLang] = React.useState<Lang>("en");
  const [cart, setCart] = React.useState<PendingLine[]>([]);
  const [cat, setCat] = React.useState("all");
  const [veg, setVeg] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [pick, setPick] = React.useState<any>(null);
  const [showCart, setShowCart] = React.useState(false);
  const [cust, setCust] = React.useState({ customerName: "", customerPhone: "" });
  const [orders, setOrders] = React.useState<any[]>([]);
  const [upsell, setUpsell] = React.useState<string[]>([]);
  const { toast, node } = useToast();
  const loadStatus = React.useCallback(() => api(`/api/public/table/${token}/order`).then(setOrders).catch(() => {}), [token]);
  React.useEffect(() => {
    api(`/api/public/menu/${token}`).then(setM).catch((e) => setErr(e.message));
    try { const l = localStorage.getItem("df_lang") as Lang; if (l && l in LANGS) setLang(l); const c = JSON.parse(localStorage.getItem("df_cust") || "{}"); setCust((x) => ({ ...x, ...c })); } catch {}
    loadStatus(); const i = setInterval(loadStatus, 8000); return () => clearInterval(i);
  }, [token, loadStatus]);
  React.useEffect(() => {
    if (!cart.length) return setUpsell([]);
    fetch(`/api/public/upsell?token=${token}&ids=${[...new Set(cart.map((c) => c.menuItemId))].join(",")}`).then((r) => (r.ok ? r.json() : [])).then((u) => setUpsell(u.map((x: any) => x.id))).catch(() => {});
  }, [cart.length, token]);
  if (err) return <div className="p-6 text-center"><p className="text-lg text-red-600">{err}</p></div>;
  if (!m) return <p className="p-6 text-center muted">Loading menu…</p>;
  const changeLang = (l: Lang) => { setLang(l); try { localStorage.setItem("df_lang", l); } catch {} };
  const items = m.items.filter((i: any) => (cat === "all" || i.categoryId === cat) && (!veg || ["VEG", "VEGAN"].includes(i.foodType)) && (!q || itemName(i, lang).toLowerCase().includes(q.toLowerCase()) || i.name.toLowerCase().includes(q.toLowerCase())));
  const add = (i: any) => {
    if (!i.available) return;
    if (i.variants.length || i.addonGroupIds.length) return setPick(i);
    setCart((c) => { const ex = c.find((l) => l.menuItemId === i.id && !l.variantId && !l.addonIds.length); return ex ? c.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { key: Math.random().toString(36).slice(2), menuItemId: i.id, variantId: null, addonIds: [], quantity: 1, name: itemName(i, lang), unitPrice: i.price, taxPercent: i.taxPercent }]; });
  };
  const count = cart.reduce((n, l) => n + l.quantity, 0);
  const bill = computeBill({ lines: cart, serviceChargePercent: m.settings.serviceChargePercent, interState: m.settings.interState, roundOff: m.settings.roundOff });
  async function place() {
    try {
      await api(`/api/public/table/${token}/order`, { body: { items: cart.map((l) => ({ menuItemId: l.menuItemId, variantId: l.variantId, addonIds: l.addonIds, quantity: l.quantity, notes: l.notes })), ...cust } });
      try { localStorage.setItem("df_cust", JSON.stringify(cust)); } catch {}
      setCart([]); setShowCart(false); toast(t("sent", lang)); loadStatus();
    } catch (e: any) { toast(e.message, "err"); }
  }
  const request = (type: string) => api(`/api/public/table/${token}/request`, { body: { type } }).then(() => toast(t("sent", lang))).catch((e) => toast(e.message, "err"));
  const bills = orders.flatMap((o) => o.bills);
  const lastPaid = orders.find((o) => o.status === "PAID");
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28">
      <header className="sticky top-0 z-20 bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {m.restaurant.logoUrl && <img src={m.restaurant.logoUrl} alt="" className="h-8 w-8 rounded" />}
          <div className="flex-1"><div className="font-bold">{m.restaurant.name}</div><div className="text-xs muted">Table {m.table.name}</div></div>
          <select aria-label="Language" value={lang} onChange={(e) => changeLang(e.target.value as Lang)} className="rounded border border-app bg-card px-2 py-1 text-sm">
            {(Object.keys(LANGS) as Lang[]).filter((l) => l === "en" || m.restaurant.languages.includes(l)).map((l) => <option key={l} value={l}>{LANGS[l]}</option>)}</select>
        </div>
        <div className="mt-2 flex gap-2"><Input placeholder={t("search", lang)} value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex shrink-0 items-center gap-1 text-sm"><input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />{t("vegOnly", lang)}</label></div>
        <div className="mt-2 flex gap-1 overflow-x-auto">{[{ id: "all", name: t("menu", lang), nameI18n: {} }, ...m.categories].map((c: any) => <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full px-3 py-1 text-sm", cat === c.id ? "bg-brand-600 text-white" : "border border-app")}>{itemName(c, lang)}</button>)}</div>
      </header>
      {orders.length > 0 && <section className="m-3 card p-3">
        <h2 className="mb-1 font-semibold">{t("status", lang)}</h2>
        {orders.map((o) => <div key={o.id} className="text-sm">
          {o.status === "PENDING_APPROVAL" && <p className="text-[var(--warning)]">{t("waiting", lang)}</p>}
          {o.items.map((i: any) => <div key={i.id} className="flex justify-between"><span>{i.quantity}× {i.name}</span><Badge color={i.status === "READY" ? "green" : i.status === "PREPARING" ? "orange" : i.status === "CANCELLED" ? "red" : "blue"}>{t(i.status, lang)}</Badge></div>)}
        </div>)}
        {bills.map((b: any) => <a key={b.publicToken} href={`/b/${b.publicToken}`} className="mt-2 block"><Button className="w-full" variant={b.paid >= b.total ? "outline" : "success"}>{b.paid >= b.total ? "Paid · " : ""}{b.splitLabel ? b.splitLabel + " · " : ""}{t("payNow", lang)} {rs(b.total - b.paid)}</Button></a>)}
        {lastPaid && <a href={`/t/feedback?order=${lastPaid.id}`} className="mt-2 block text-center text-brand-600">{t("rate", lang)}</a>}
      </section>}
      <main className="space-y-2 p-3">
        {items.map((i: any) => (
          <div key={i.id} className={cn("card flex gap-3 p-3", !i.available && "opacity-50")}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><FoodDot t={i.foodType} /><span className="font-semibold">{itemName(i, lang)}</span></div>
              <div className="text-sm">{rs(i.price)}{i.spiceLevel > 0 && <span className="muted"> · spice {i.spiceLevel}/3</span>}</div>
              {i.description && <p className="text-xs muted">{i.description}</p>}
              {i.allergens.length > 0 && <p className="text-xs muted">Contains: {i.allergens.join(", ")}</p>}
            </div>
            <div className="flex flex-col items-center gap-1">
              {i.imageUrl && <img src={i.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <Button size="sm" variant="outline" disabled={!i.available} onClick={() => add(i)} aria-label={`Add ${i.name}`}>{i.available ? t("add", lang) : "—"}</Button>
            </div>
          </div>))}
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md space-y-2 bg-card p-3 shadow-[0_-2px_10px_rgba(0,0,0,.1)]">
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => request("CALL_WAITER")}><HandPlatter size={16} />{t("callWaiter", lang)}</Button><Button variant="outline" onClick={() => request("ASK_BILL")}><Receipt size={16} />{t("askBill", lang)}</Button></div>
        {count > 0 && <Button size="lg" className="w-full" onClick={() => setShowCart(true)}>{t("cart", lang)} ({count}) · {rs(bill.subtotal)}</Button>}
      </div>
      {showCart && <Dialog open onClose={() => setShowCart(false)} title={t("cart", lang)}>
        <div className="space-y-2">
          {cart.map((l) => <div key={l.key} className="flex items-center justify-between gap-2 text-sm"><span className="flex-1">{l.name}</span>
            <button className="h-8 w-8 rounded border border-app" onClick={() => setCart((c) => c.flatMap((x) => (x.key === l.key ? (x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []) : [x])))}>−</button><span>{l.quantity}</span>
            <button className="h-8 w-8 rounded border border-app" onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)))}>+</button><span className="w-16 text-right">{rs(l.unitPrice * l.quantity)}</span></div>)}
          {upsell.length > 0 && <div className="text-sm"><span className="muted">{t("often", lang)}: </span>{upsell.slice(0, 3).map((id) => { const it = m.items.find((x: any) => x.id === id); return it?.available ? <button key={id} className="mr-1 rounded-full border border-brand-500 px-2 text-brand-600" onClick={() => add(it)}>+ {itemName(it, lang)}</button> : null; })}</div>}
          <div className="flex justify-between border-t border-app pt-2 font-semibold"><span>{t("total", lang)} (incl. tax)</span><span>{rs(bill.total)}</span></div>
          <Input placeholder={t("name", lang)} value={cust.customerName} onChange={(e) => setCust({ ...cust, customerName: e.target.value })} />
          <Input placeholder={t("phone", lang)} inputMode="tel" value={cust.customerPhone} onChange={(e) => setCust({ ...cust, customerPhone: e.target.value })} />
          <Button size="lg" className="w-full" onClick={place}>{t("placeOrder", lang)}</Button>
        </div>
      </Dialog>}
      {pick && <ItemPicker item={pick} menu={m} channel="QR" onAdd={(l) => setCart((c) => [...c, { ...l, name: itemName(pick, lang) + (l.variantId ? ` (${pick.variants.find((v: any) => v.id === l.variantId)?.name})` : "") }])} onClose={() => setPick(null)} />}
      {node}
    </div>
  );
}
