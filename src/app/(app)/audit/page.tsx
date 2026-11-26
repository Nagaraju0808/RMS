"use client";
import * as React from "react";
import { Button, Input, PageHeader, Select, Table } from "@/components/ui";
import { api } from "@/lib/client";
export default function AuditPage() {
  const [f, setF] = React.useState({ userId: "", action: "", from: "", to: "", page: 0 });
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { const q = new URLSearchParams(Object.entries(f).filter(([, v]) => v !== "" && v !== 0).map(([k, v]) => [k, String(v)])); api(`/api/audit?${q}`).then(setD); }, [f]);
  if (!d) return <p className="muted">Loading…</p>;
  return <div>
    <PageHeader title="Audit log" />
    <div className="mb-3 flex flex-wrap gap-2">
      <Select aria-label="Staff" className="w-44" value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value, page: 0 })}><option value="">All staff</option>{d.users.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
      <Select aria-label="Action" className="w-52" value={f.action} onChange={(e) => setF({ ...f, action: e.target.value, page: 0 })}><option value="">All actions</option>{d.actions.map((a: string) => <option key={a}>{a}</option>)}</Select>
      <Input type="date" className="w-40" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, page: 0 })} /><Input type="date" className="w-40" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value, page: 0 })} />
    </div>
    <Table head={["When", "Who", "Action", "What", "Details"]} rows={d.rows.map((r: any) => [new Date(r.createdAt).toLocaleString("en-IN"), r.userName, <b key="a">{r.action}</b>, r.entity, <code key="d" className="block max-w-xl overflow-hidden text-ellipsis whitespace-nowrap text-xs" title={JSON.stringify(r.details)}>{r.details ? JSON.stringify(r.details) : ""}</code>])} empty="Nothing recorded for these filters." />
    <div className="mt-2 flex items-center gap-2"><Button size="sm" variant="outline" disabled={f.page === 0} onClick={() => setF({ ...f, page: f.page - 1 })}>← Newer</Button><span className="text-sm muted">{d.total} records</span><Button size="sm" variant="outline" disabled={(f.page + 1) * 50 >= d.total} onClick={() => setF({ ...f, page: f.page + 1 })}>Older →</Button></div>
  </div>;
}
