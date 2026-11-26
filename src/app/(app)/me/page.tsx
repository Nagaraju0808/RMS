"use client";
import * as React from "react";
import { Badge, Button, Card, Input, PageHeader, Table, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp } from "@/components/app/AppContext";
export default function MyShift() {
  const { me } = useApp();
  const [a, setA] = React.useState<any>(null); const [shifts, setShifts] = React.useState<any[]>([]); const [leave, setLeave] = React.useState<any[]>([]);
  const { toast, node } = useToast();
  const load = () => { api("/api/attendance").then(setA); api("/api/shifts").then(setShifts).catch(() => {}); api("/api/leave").then(setLeave); };
  React.useEffect(() => { load(); }, []);
  if (!a || !me) return <p className="muted">Loading…</p>;
  const mine = shifts.flatMap((s) => s.assignments.filter((x: any) => x.user.id === me.user.id).map((x: any) => ({ ...x, shift: s }))).sort((x, y) => x.date.localeCompare(y.date));
  return <div className="mx-auto max-w-2xl space-y-4">
    <PageHeader title="My shift" />
    <Card className="flex items-center justify-between"><div><div className="text-lg">{a.onDuty ? "You are on duty" : "You are off duty"}</div><div className="text-sm muted">This month: {a.hours} hours</div></div>
      <Button size="xl" variant={a.onDuty ? "danger" : "success"} onClick={() => api("/api/attendance", { body: { type: a.onDuty ? "CLOCK_OUT" : "CLOCK_IN" } }).then(() => { toast(a.onDuty ? "Clocked out" : "Clocked in"); load(); }).catch((e) => toast(e.message, "err"))}>{a.onDuty ? "Clock out" : "Clock in"}</Button></Card>
    <Card><h2 className="mb-2 font-semibold">My upcoming shifts</h2>{mine.length ? mine.map((x) => <div key={x.id} className="text-sm">{new Date(x.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })} – {x.shift.name} ({x.shift.startTime}–{x.shift.endTime})</div>) : <p className="text-sm muted">No shifts assigned.</p>}</Card>
    <Card><h2 className="mb-2 font-semibold">Ask for leave</h2>
      <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); api("/api/leave", { body: { fromDate: f.get("from"), toDate: f.get("to"), reason: f.get("reason") || undefined } }).then(() => { toast("Leave requested"); load(); }).catch((er) => toast(er.message, "err")); }}>
        <Input name="from" type="date" required className="w-40" /><Input name="to" type="date" required className="w-40" /><Input name="reason" placeholder="Reason" className="w-48" /><Button>Request</Button></form>
      <div className="mt-2">{leave.map((l) => <div key={l.id} className="text-sm">{l.fromDate} → {l.toDate} <Badge color={l.status === "APPROVED" ? "green" : l.status === "REJECTED" ? "red" : "yellow"}>{l.status}</Badge></div>)}</div></Card>
    <Table head={["Clock in", "Clock out", "Hours"]} rows={a.sessions.map((s: any) => [new Date(s.start).toLocaleString("en-IN"), new Date(s.end).toLocaleString("en-IN"), s.hours.toFixed(2)])} empty="No attendance this month." />
    {node}
  </div>;
}
