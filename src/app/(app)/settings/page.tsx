"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Badge, Button, Card, Input, Label, PageHeader, Select, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { RESTAURANT_TYPES } from "@/lib/features";

export default function SettingsPage() {
  const [d, setD] = React.useState<any>(null);
  const { toast, node } = useToast();
  const load = () => api("/api/settings").then(setD);
  React.useEffect(() => { load(); }, []);
  if (!d) return <p className="muted">Loading…</p>;
  const save = async (url: string, body: any, method = "PUT") => { try { await api(url, { method, body }); toast("Saved"); load(); } catch (e: any) { toast(e.message, "err"); } };
  return (
    <div className="space-y-4">
      <PageHeader title="Settings"><a href="/onboarding"><Button variant="outline">Run setup wizard again</Button></a></PageHeader>
      <Card className="grid gap-3 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Restaurant</h2>
        <div><Label>Name</Label><Input defaultValue={d.name} onBlur={(e) => save("/api/settings", { name: e.target.value })} /></div>
        <div><Label>GSTIN</Label><Input defaultValue={d.gstin || ""} onBlur={(e) => save("/api/settings", { gstin: e.target.value || null })} /></div>
        <div><Label>Type</Label><Select value={d.type} onChange={(e) => confirm("Change type and reset branch features to the defaults for this type?") && save("/api/settings", { type: e.target.value, applyTypeDefaults: true })}>
          {Object.entries(RESTAURANT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
        <div><Label>Currency</Label><Select value={d.currency} onChange={(e) => save("/api/settings", { currency: e.target.value })}>{["INR", "USD", "AED", "GBP", "EUR"].map((c) => <option key={c}>{c}</option>)}</Select></div>
        <div className="sm:col-span-2 text-sm muted">Restaurant code for staff PIN login: <b>{d.slug}</b> · Languages: {d.languages.join(", ")}</div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Tax rates (GST)</h2>
        <div className="mb-3 flex flex-wrap gap-2">{d.taxRates.map((t: any) => (
          <Badge key={t.id} color={t.isDefault ? "green" : "slate"}>{t.name} · {t.ratePercent}% {t.hsnSac && `· HSN/SAC ${t.hsnSac}`}
            <button className="ml-2" aria-label={`Delete ${t.name}`} onClick={() => save(`/api/tax-rates/${t.id}`, undefined, "DELETE")}><X size={12} /></button></Badge>))}</div>
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save("/api/tax-rates", { name: f.get("name"), ratePercent: Number(f.get("rate")), hsnSac: f.get("hsn") || undefined }, "POST"); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="Name e.g. GST 12%" className="w-48" required /><Input name="rate" type="number" step="0.01" placeholder="%" className="w-24" required /><Input name="hsn" placeholder="HSN/SAC" className="w-32" /><Button>Add</Button>
        </form>
      </Card>
      {d.branches.map((b: any) => (
        <Card key={b.id} className="space-y-3">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Branch: {b.name}</h2><span className="text-xs muted">GST state code {b.stateCode}</span></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label>Name</Label><Input defaultValue={b.name} onBlur={(e) => save(`/api/branches/${b.id}`, { name: e.target.value })} /></div>
            <div><Label>Address</Label><Input defaultValue={b.address || ""} onBlur={(e) => save(`/api/branches/${b.id}`, { address: e.target.value })} /></div>
            <div><Label>Phone</Label><Input defaultValue={b.phone || ""} onBlur={(e) => save(`/api/branches/${b.id}`, { phone: e.target.value })} /></div>
          </div>
          <div><Label>Features</Label><div className="flex flex-wrap gap-2">
            {Object.entries(b.features).map(([k, v]) => (
              <label key={k} className="flex items-center gap-1 rounded border border-app px-2 py-1 text-sm"><input type="checkbox" checked={!!v} onChange={(e) => save(`/api/branches/${b.id}`, { features: { [k]: e.target.checked } })} />{k}</label>))}
          </div></div>
          <div className="grid gap-3 sm:grid-cols-4">
            {([["serviceChargePercent", "Service charge %"], ["packingChargePerItem", "Packing charge / item (paise)"], ["kdsWarnMins", "Kitchen: orange after (min)"], ["kdsLateMins", "Kitchen: red after (min)"], ["avgTableMins", "Avg table time (min)"]] as const).map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input type="number" defaultValue={b.settings[k]} onBlur={(e) => save(`/api/branches/${b.id}`, { settings: { [k]: Number(e.target.value) } })} /></div>))}
            {([["qrAutoAccept", "QR orders go to kitchen without waiter approval"], ["roundOff", "Round off bill to nearest rupee"], ["interState", "Inter-state supply (use IGST)"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!b.settings[k]} onChange={(e) => save(`/api/branches/${b.id}`, { settings: { [k]: e.target.checked } })} />{l}</label>))}
          </div>
        </Card>
      ))}
      <Card>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); save("/api/branches", { name: f.get("name"), address: f.get("address") }, "POST"); e.currentTarget.reset(); }}>
          <Input name="name" placeholder="New branch name" required /><Input name="address" placeholder="Address" /><Button>Add branch</Button>
        </form>
      </Card>
      {node}
    </div>
  );
}
