"use client";
import * as React from "react";
import { X } from "lucide-react";
import { Button, Card, Input, Label, Select } from "@/components/ui";
import { api } from "@/lib/client";
import { RESTAURANT_TYPES, defaultFeatures, RestaurantTypeName } from "@/lib/features";
import { useApp } from "@/components/app/AppContext";

const LANGS = [{ v: "en", l: "English" }, { v: "te", l: "Telugu" }, { v: "hi", l: "Hindi" }, { v: "ta", l: "Tamil" }, { v: "kn", l: "Kannada" }];

export default function Onboarding() {
  const { me } = useApp();
  const [step, setStep] = React.useState(0);
  const [f, setF] = React.useState({ name: "", logoUrl: "", type: "FINE_DINING" as RestaurantTypeName, currency: "INR", languages: ["en"], gstin: "", taxPercent: 5, serviceChargePercent: 0, stateCode: "36", branches: [{ name: "Main branch", address: "" }] });
  const [err, setErr] = React.useState("");
  React.useEffect(() => { if (me && !f.name) setF((x) => ({ ...x, name: me.restaurant.name })); }, [me]); // eslint-disable-line
  const features = defaultFeatures(f.type);
  async function upload(file: File) {
    const fd = new FormData(); fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd }); const d = await r.json();
    if (r.ok) setF({ ...f, logoUrl: d.url }); else setErr(d.error);
  }
  async function finish() {
    setErr("");
    try { await api("/api/onboarding", { body: { ...f, logoUrl: f.logoUrl || null } }); location.href = "/menu"; } catch (e: any) { setErr(e.message); }
  }
  const steps = ["Restaurant", "Type", "Branches", "Tax & money", "Languages"];
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Set up your restaurant</h1>
      <div className="mb-4 flex gap-1">{steps.map((s, i) => <div key={s} className={`h-2 flex-1 rounded ${i <= step ? "bg-brand-600" : "bg-slate-200"}`} title={s} />)}</div>
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Step {step + 1}: {steps[step]}</h2>
        {step === 0 && <>
          <div><Label htmlFor="n">Restaurant name</Label><Input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Logo</Label><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />{f.logoUrl && <img src={f.logoUrl} alt="logo" className="mt-2 h-16" />}</div>
        </>}
        {step === 1 && <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(RESTAURANT_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setF({ ...f, type: k as RestaurantTypeName })} className={`rounded-lg border p-3 text-left ${f.type === k ? "border-brand-600 bg-brand-50 dark:bg-brand-700/20" : "border-app"}`}>{v}</button>
          ))}
          <div className="sm:col-span-2 text-sm muted">Features switched on: {Object.entries(features).filter(([, on]) => on).map(([k]) => k).join(", ")}</div>
        </div>}
        {step === 2 && <div className="space-y-2">
          {f.branches.map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label="Branch name" placeholder="Branch name" value={b.name} onChange={(e) => { const br = [...f.branches]; br[i] = { ...b, name: e.target.value }; setF({ ...f, branches: br }); }} />
              <Input aria-label="Address" placeholder="Address" value={b.address} onChange={(e) => { const br = [...f.branches]; br[i] = { ...b, address: e.target.value }; setF({ ...f, branches: br }); }} />
              {f.branches.length > 1 && <Button variant="ghost" aria-label="Remove branch" onClick={() => setF({ ...f, branches: f.branches.filter((_, j) => j !== i) })}><X size={16} /></Button>}
            </div>
          ))}
          <Button variant="outline" onClick={() => setF({ ...f, branches: [...f.branches, { name: "", address: "" }] })}>+ Add branch</Button>
        </div>}
        {step === 3 && <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Currency</Label><Select value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}><option>INR</option><option>USD</option><option>AED</option><option>GBP</option><option>EUR</option></Select></div>
          <div><Label>GSTIN (optional)</Label><Input value={f.gstin} onChange={(e) => setF({ ...f, gstin: e.target.value.toUpperCase() })} maxLength={15} /></div>
          <div><Label>Default GST %</Label><Select value={f.taxPercent} onChange={(e) => setF({ ...f, taxPercent: Number(e.target.value) })}>{[0, 5, 12, 18, 28].map((t) => <option key={t} value={t}>{t}%</option>)}</Select></div>
          <div><Label>Service charge %</Label><Input type="number" min={0} max={30} value={f.serviceChargePercent} onChange={(e) => setF({ ...f, serviceChargePercent: Number(e.target.value) })} /></div>
          <div><Label>GST state code</Label><Input value={f.stateCode} onChange={(e) => setF({ ...f, stateCode: e.target.value })} maxLength={2} /></div>
        </div>}
        {step === 4 && <div className="flex flex-wrap gap-2">
          {LANGS.map((l) => (
            <label key={l.v} className="flex items-center gap-2 rounded-lg border border-app px-3 py-2">
              <input type="checkbox" checked={f.languages.includes(l.v)} onChange={(e) => setF({ ...f, languages: e.target.checked ? [...f.languages, l.v] : f.languages.filter((x) => x !== l.v) })} />{l.l}
            </label>
          ))}
        </div>}
        {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-between">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < steps.length - 1 ? <Button onClick={() => setStep(step + 1)}>Next</Button> : <Button onClick={finish}>Finish setup</Button>}
        </div>
      </Card>
    </div>
  );
}
