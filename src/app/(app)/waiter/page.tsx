"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/lib/client";
import { OrderBuilder } from "@/components/pos/OrderBuilder";
import { Button } from "@/components/ui";
import { useLive } from "@/components/app/AppContext";
import { TABLE_COLORS } from "../tables/colors";

function Waiter() {
  const sp = useSearchParams(); const router = useRouter();
  const table = sp.get("table");
  const [data, setData] = React.useState<any>(null);
  const load = () => api("/api/tables").then(setData);
  React.useEffect(() => { load(); }, []);
  useLive("table:updated", load);
  if (table) return (
    <div className="mx-auto max-w-md">
      <Button variant="ghost" onClick={() => router.push("/waiter")}>← Tables</Button>
      <h1 className="mb-2 text-xl font-bold">{data?.tables.find((t: any) => t.id === table)?.name}</h1>
      <OrderBuilder key={table} mode="waiter" initialTableId={table} />
    </div>);
  if (!data) return <p className="muted">Loading…</p>;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-3 text-xl font-bold">Choose a table</h1>
      {[...data.sections, { id: null, name: "Other" }].map((s: any) => {
        const ts = data.tables.filter((t: any) => t.sectionId === s.id);
        if (!ts.length) return null;
        return <div key={s.id || "none"} className="mb-4"><h2 className="mb-2 text-sm font-semibold muted">{s.name}</h2>
          <div className="grid grid-cols-3 gap-2">{ts.map((t: any) => (
            <button key={t.id} onClick={() => router.push(`/waiter?table=${t.id}`)} className={`h-20 rounded-xl text-lg font-bold text-white ${TABLE_COLORS[t.status]} ${t.requests.length ? "ring-4 ring-red-500 animate-pulse" : ""}`}>{t.name}<div className="text-xs font-normal">{t.status.replace("_", " ").toLowerCase()}</div></button>))}</div></div>;
      })}
    </div>);
}
export default function WaiterPage() { return <Suspense><Waiter /></Suspense>; }
