"use client";
import * as React from "react";
import { Button, Dialog } from "@/components/ui";
import { rs } from "@/lib/client";
import { priceFor, Channel } from "@/lib/menu";

export type PendingLine = { key: string; menuItemId: string; variantId: string | null; addonIds: string[]; quantity: number; notes?: string; name: string; unitPrice: number; taxPercent: number };

/** Popup to choose size/variant, add-ons and a note before adding an item to the cart. */
export function ItemPicker({ item, menu, channel, onAdd, onClose }: { item: any; menu: any; channel: Channel; onAdd: (l: PendingLine) => void; onClose: () => void }) {
  const [variantId, setVariantId] = React.useState<string | null>(item.variants[0]?.id ?? null);
  const [addonIds, setAddonIds] = React.useState<string[]>([]);
  const [qty, setQty] = React.useState(1);
  const [notes, setNotes] = React.useState("");
  const groups = menu.addonGroups.filter((g: any) => item.addonGroupIds.includes(g.id));
  const variant = item.variants.find((v: any) => v.id === variantId);
  const addons = groups.flatMap((g: any) => g.addons).filter((a: any) => addonIds.includes(a.id));
  const unit = priceFor(variant ?? item, channel) + addons.reduce((s: number, a: any) => s + a.price, 0);
  const toggle = (g: any, id: string) => {
    if (addonIds.includes(id)) return setAddonIds(addonIds.filter((x) => x !== id));
    const inGroup = addonIds.filter((x) => g.addons.some((a: any) => a.id === x));
    if (inGroup.length >= g.maxSelect) return;
    setAddonIds([...addonIds, id]);
  };
  return (
    <Dialog open onClose={onClose} title={item.name}>
      {item.variants.length > 0 && <div className="mb-4"><div className="mb-2 text-sm font-medium">Size</div>
        <div className="grid grid-cols-2 gap-2">{item.variants.map((v: any) => (
          <button key={v.id} onClick={() => setVariantId(v.id)} className={`rounded-lg border p-3 text-left ${variantId === v.id ? "border-brand-600 bg-brand-50 dark:bg-brand-700/20" : "border-app"}`}>{v.name}<div className="text-sm muted">{rs(priceFor(v, channel))}</div></button>))}</div></div>}
      {groups.map((g: any) => (
        <div key={g.id} className="mb-4"><div className="mb-2 text-sm font-medium">{g.name} <span className="muted">(up to {g.maxSelect})</span></div>
          <div className="grid grid-cols-2 gap-2">{g.addons.filter((a: any) => a.inStock).map((a: any) => (
            <button key={a.id} onClick={() => toggle(g, a.id)} className={`rounded-lg border p-2 text-left text-sm ${addonIds.includes(a.id) ? "border-brand-600 bg-brand-50 dark:bg-brand-700/20" : "border-app"}`}>{a.name} {a.price > 0 && <span className="muted">+{rs(a.price)}</span>}</button>))}</div></div>))}
      <div className="mb-4"><div className="mb-2 text-sm font-medium">Note for kitchen</div>
        <div className="mb-2 flex flex-wrap gap-1">{["Less spicy", "No onion", "Extra spicy", "Jain", "Pack separately"].map((n) => <button key={n} onClick={() => setNotes(notes ? `${notes}, ${n}` : n)} className="rounded-full border border-app px-2 py-1 text-xs">{n}</button>)}</div>
        <input aria-label="Item note" className="h-10 w-full rounded-lg border border-app bg-card px-3" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Button variant="outline" size="lg" onClick={() => setQty(Math.max(1, qty - 1))}>−</Button><span className="w-8 text-center text-lg">{qty}</span><Button variant="outline" size="lg" onClick={() => setQty(qty + 1)}>+</Button></div>
        <Button size="lg" onClick={() => { onAdd({ key: Math.random().toString(36).slice(2), menuItemId: item.id, variantId, addonIds, quantity: qty, notes: notes || undefined, name: variant ? `${item.name} (${variant.name})` : item.name, unitPrice: unit, taxPercent: item.taxPercent }); onClose(); }}>Add {rs(unit * qty)}</Button>
      </div>
    </Dialog>
  );
}
