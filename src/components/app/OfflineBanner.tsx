"use client";
import * as React from "react";
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import { startOutboxSync, subscribeOutbox, syncNow } from "@/lib/offline/outbox";
import type { OutboxEntry, SyncReport } from "@/lib/offline/outbox-core";

/** Shows when the device is offline or orders are waiting to be sent; reports anything the server refused. */
export function OfflineBanner() {
  const [st, setSt] = React.useState<{ pending: OutboxEntry[]; lastReport: SyncReport | null; online: boolean }>({ pending: [], lastReport: null, online: true });
  const [failed, setFailed] = React.useState<{ entry: OutboxEntry; error: string }[]>([]);
  React.useEffect(() => { startOutboxSync(); return subscribeOutbox(setSt); }, []);
  React.useEffect(() => { if (st.lastReport?.failed.length) setFailed((f) => [...f, ...st.lastReport!.failed]); }, [st.lastReport]);
  const n = st.pending.length;
  if (st.online && !n && !failed.length) return null;
  return (
    <div role="status" className="no-print mb-4 space-y-2">
      {(!st.online || n > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-[var(--pill-warning-bg)] px-4 py-2.5 text-sm text-[var(--pill-warning-ink)]">
          <CloudOff size={16} />
          <span className="font-medium">{st.online ? "Back online" : "No internet"}</span>
          <span>{n ? `${n} ${n === 1 ? "change is" : "changes are"} saved on this device and will be sent ${st.online ? "now" : "when the internet is back"}.` : "You can keep taking orders – they are saved on this device."}</span>
          {st.online && n > 0 && <button onClick={() => syncNow()} className="ml-auto inline-flex items-center gap-1 underline"><RefreshCw size={14} />Send now</button>}
        </div>)}
      {failed.map((f, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-[var(--pill-negative-bg)] px-4 py-2.5 text-sm text-[var(--pill-negative-ink)]">
          <TriangleAlert size={16} /><span>Not sent: <b>{f.entry.label}</b> – {f.error}</span>
          <button className="ml-auto underline" onClick={() => setFailed((x) => x.filter((_, j) => j !== i))}>Dismiss</button>
        </div>))}
    </div>
  );
}
