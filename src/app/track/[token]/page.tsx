"use client";
import * as React from "react";
import { use } from "react";
import { io } from "socket.io-client";
import { Card } from "@/components/ui";
import { api } from "@/lib/client";
const STEPS = ["PENDING", "ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED"];
const LABEL: Record<string, string> = { PENDING: "Order received", ASSIGNED: "Rider assigned", PICKED_UP: "Picked up", ON_THE_WAY: "On the way", DELIVERED: "Delivered", FAILED: "Could not deliver" };
export default function Track({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [d, setD] = React.useState<any>(null); const [err, setErr] = React.useState("");
  const load = React.useCallback(() => api(`/api/public/track/${token}`).then(setD).catch((e) => setErr(e.message)), [token]);
  React.useEffect(() => { load(); const s = io({ path: "/socket.io" }); s.emit("watch", `delivery:${token}`); s.on("delivery:updated", load); const i = setInterval(load, 20000); return () => { s.disconnect(); clearInterval(i); }; }, [token, load]);
  if (!d) return <p className="p-6">{err || "Loading…"}</p>;
  const idx = STEPS.indexOf(d.status);
  const cooking = d.order.items.some((i: any) => ["NEW", "PREPARING"].includes(i.status));
  return <div className="mx-auto max-w-md p-4"><Card>
    <h1 className="text-xl font-bold">{d.order.branch.restaurant.name}</h1><p className="mb-4 muted">Order #{d.order.orderNo}</p>
    {d.status === "FAILED" ? <p className="text-red-600">{LABEL.FAILED}. Please call {d.order.branch.phone}.</p> :
      <ol className="space-y-3">{STEPS.map((s, i) => <li key={s} className={`flex items-center gap-3 ${i <= idx ? "" : "opacity-40"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${i <= idx ? "bg-green-600" : "bg-slate-400"}`}>{i <= idx ? "✓" : i + 1}</span>{LABEL[s]}{s === "PENDING" && i === idx && cooking && " – food is being cooked"}</li>)}</ol>}
    {d.rider && <p className="mt-4">Rider: <b>{d.rider}</b></p>}
  </Card></div>;
}
