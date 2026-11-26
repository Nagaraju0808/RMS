"use client";
import * as React from "react";
import { Bell, BellOff, Maximize } from "lucide-react";
import { Button } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp, useLive } from "@/components/app/AppContext";
import { ticketStatus, timerLevel } from "@/lib/kitchen";
import { cn } from "@/lib/utils";

function beep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.25].forEach((t) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.3, ctx.currentTime + t); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18); });
  } catch {}
}
// On time = calm ink header; only late tickets take a status colour (orange, then red).
const LEVEL: Record<string, string> = { ok: "border-[var(--border)]", warn: "border-[#c2410c]", late: "border-[var(--negative)] motion-safe:animate-pulse" };
const HEAD: Record<string, string> = { ok: "bg-[var(--ink-fill)] text-[var(--on-ink)]", warn: "bg-[#c2410c] text-white", late: "bg-[var(--negative)] text-white" };
const ITEM: Record<string, string> = { NEW: "", PREPARING: "bg-[var(--pill-warning-bg)]", READY: "bg-[var(--pill-positive-bg)] line-through opacity-70" };

export default function KitchenPage() {
  const { me } = useApp();
  const [data, setData] = React.useState<{ kots: any[]; stations: any[] } | null>(null);
  const [station, setStation] = React.useState<string>("");
  const [sound, setSound] = React.useState(true);
  const [now, setNow] = React.useState(new Date());
  const [err, setErr] = React.useState("");
  const load = React.useCallback(() => api(`/api/kitchen${station ? `?station=${station}` : ""}`).then(setData).catch((e) => setErr(e.message)), [station]);
  React.useEffect(() => { load(); try { const s = localStorage.getItem("kds_station"); if (s) setStation(s); } catch {} }, []); // eslint-disable-line
  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 15000); const r = setInterval(load, 60000); return () => { clearInterval(t); clearInterval(r); }; }, [load]);
  useLive("kot:new", () => { if (sound) beep(); load(); });
  useLive("item:status", load);
  useLive("order:updated", load);
  const warn = me?.branch?.settings?.kdsWarnMins ?? 10, late = me?.branch?.settings?.kdsLateMins ?? 20;
  const bump = (url: string, status: string) => api(url, { body: { status, stationId: station || undefined } }).then(load).catch((e) => setErr(e.message));
  if (!data) return <p className="muted">Loading… {err}</p>;
  const cols = [{ k: "NEW", t: "New" }, { k: "PREPARING", t: "Preparing" }, { k: "READY", t: "Ready" }];
  return (
    <div className="-m-4 min-h-[calc(100vh-3.5rem)] bg-[var(--raised)] p-3 md:-m-6 md:rounded-[var(--radius-sheet)] md:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="mr-2 text-2xl font-bold">Kitchen</h1>
        {[{ id: "", name: "All stations" }, ...data.stations].map((s) => (
          <button key={s.id} onClick={() => { setStation(s.id); try { localStorage.setItem("kds_station", s.id); } catch {} }} className={cn("rounded-lg px-4 py-2 text-base font-semibold", station === s.id ? "bg-[var(--ink-fill)] text-[var(--on-ink)]" : "bg-[var(--surface)]")}>{s.name}</button>))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => { setSound(!sound); if (!sound) beep(); }}>{sound ? <><Bell size={16} />Sound on</> : <><BellOff size={16} />Sound off</>}</Button>
          <Button variant="outline" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize size={16} />Full screen</Button>
        </div>
      </div>
      {err && <p className="mb-2 text-red-600">{err}</p>}
      <div className="grid gap-3 lg:grid-cols-3">
        {cols.map((c) => {
          const kots = data.kots.filter((k) => ticketStatus(k.items) === c.k);
          return (
            <div key={c.k}>
              <h2 className="mb-2 text-lg font-bold">{c.t} <span className="muted">({kots.length})</span></h2>
              <div className="space-y-3">
                {kots.map((k) => {
                  const level = c.k === "READY" ? "ok" : timerLevel(k.createdAt, now, warn, late);
                  const mins = Math.floor((now.getTime() - new Date(k.createdAt).getTime()) / 60000);
                  return (
                    <div key={k.id} data-testid="kot" className={cn("overflow-hidden rounded-xl border-2 bg-[var(--surface)]", LEVEL[level])}>
                      <div className={cn("flex items-center justify-between px-3 py-2", HEAD[level])}>
                        <span className="text-xl font-bold">{k.order.table?.name ?? (k.order.tokenNo ? `Token ${k.order.tokenNo}` : k.order.customerName || k.order.type)}</span>
                        <span className="text-sm">#{k.order.orderNo} · KOT {k.kotNo} · {k.order.type.replace("_", "-")}{k.order.source !== "POS" ? ` · ${k.order.source}` : ""}</span>
                        <span className="text-xl font-bold tabular-nums">{mins}m</span>
                      </div>
                      <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {k.items.filter((i: any) => i.status !== "SERVED").map((i: any) => (
                          <li key={i.id}>
                            <button disabled={i.status === "CANCELLED"} onClick={() => bump(`/api/kitchen/items/${i.id}`, i.status === "NEW" ? "PREPARING" : i.status === "PREPARING" ? "READY" : "SERVED")}
                              className={cn("flex w-full items-start justify-between gap-2 px-3 py-3 text-left text-lg", ITEM[i.status], i.status === "CANCELLED" && "text-red-600 line-through")}>
                              <span><b className="mr-1">{i.quantity}×</b>{i.name}
                                {(i.addons as any[]).length > 0 && <span className="block text-sm muted">+ {(i.addons as any[]).map((a) => a.name).join(", ")}</span>}
                                {i.notes && <span className="block text-base font-semibold text-red-600">Note: {i.notes}</span>}
                                {i.status === "CANCELLED" && <span className="block text-sm">CANCELLED: {i.cancelReason}</span>}</span>
                              <span className="shrink-0 text-xs uppercase muted">{i.status}</span>
                            </button>
                          </li>))}
                      </ul>
                      {k.order.notes && <p className="px-3 py-1 text-sm italic">Note: {k.order.notes}</p>}
                      <div className="grid grid-cols-2 gap-2 p-2">
                        {c.k === "NEW" && <Button size="lg" variant="secondary" className="col-span-2" onClick={() => bump(`/api/kitchen/kots/${k.id}`, "PREPARING")}>Start preparing</Button>}
                        {c.k !== "READY" && <Button size="lg" variant="success" className="col-span-2" onClick={() => bump(`/api/kitchen/kots/${k.id}`, "READY")}>All ready</Button>}
                        {c.k === "READY" && <Button size="lg" className="col-span-2" onClick={() => bump(`/api/kitchen/kots/${k.id}`, "SERVED")}>Served</Button>}
                      </div>
                    </div>);
                })}
                {!kots.length && <p className="rounded-xl bg-[var(--surface)] p-6 text-center muted">Nothing here</p>}
              </div>
            </div>);
        })}
      </div>
    </div>
  );
}
