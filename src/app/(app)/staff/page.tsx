"use client";
import * as React from "react";
import { Badge, Button, Card, Dialog, Input, Label, PageHeader, Select, Table, Tabs, useToast } from "@/components/ui";
import { api, rs } from "@/lib/client";
import { useApp } from "@/components/app/AppContext";
import { PERMISSIONS } from "@/lib/roles";

const ROLES = ["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF", "DELIVERY"];
export default function StaffPage() {
  const { me } = useApp();
  const [tab, setTab] = React.useState<"staff" | "shifts" | "leave" | "salary" | "tips">("staff");
  const [d, setD] = React.useState<any>(null);
  const [edit, setEdit] = React.useState<any>(null);
  const { toast, node } = useToast();
  const load = () => api("/api/staff").then(setD);
  React.useEffect(() => { load(); }, []);
  const run = (p: Promise<any>, m: string, after?: () => void) => p.then((r) => { toast(m); load(); after?.(); return r; }).catch((e) => toast(e.message, "err"));
  if (!d || !me) return <p className="muted">Loading…</p>;
  return (
    <div>
      <PageHeader title="Staff">{tab === "staff" && <Button onClick={() => setEdit({ role: "WAITER", permissions: [], branchId: me.branch?.id })}>+ Add staff</Button>}</PageHeader>
      <Tabs value={tab} onChange={setTab} options={[{ value: "staff", label: "Team" }, { value: "shifts", label: "Shifts" }, { value: "leave", label: "Leave" }, { value: "salary", label: "Salary" }, { value: "tips", label: "Tips" }]} />
      {tab === "staff" && <Table head={["Name", "Role", "Branch", "Contact", "Pay", "Status", ""]} rows={d.staff.map((u: any) => [
        <b key="n">{u.name}</b>, <Badge key="r">{u.role}</Badge>, me.branches.find((b) => b.id === u.branchId)?.name || "All", <span key="c" className="text-sm">{u.email}<br />{u.phone}</span>,
        u.monthlySalary ? `${rs(u.monthlySalary)}/month` : u.hourlyRate ? `${rs(u.hourlyRate)}/hour` : "–",
        <span key="s">{!u.active ? <Badge color="red">inactive</Badge> : u.onDuty ? <Badge color="green">on duty</Badge> : <Badge>off</Badge>}</span>,
        <Button key="e" size="sm" variant="outline" onClick={() => setEdit(u)}>Edit</Button>])} />}
      {tab === "shifts" && <Shifts staff={d.staff} run={run} />}
      {tab === "leave" && <LeaveTab run={run} />}
      {tab === "salary" && <Salary />}
      {tab === "tips" && <Card className="max-w-md space-y-2"><p className="text-sm">Share all tips collected on a day among the staff who worked that day, by hours worked.</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run(api("/api/tips", { body: { date: new FormData(e.currentTarget).get("date") } }), "Tips shared").then((r) => r && alert(r.shares.map((x: any) => `${x.name}: ${rs(x.amount)} (${x.hours} h)`).join("\n"))); }}>
          <Input name="date" type="date" defaultValue={new Date().toLocaleDateString("en-CA")} /><Button>Share tips</Button></form></Card>}
      {edit && <StaffEditor u={edit} me={me} perms={d.permissions} onClose={() => setEdit(null)} run={run} />}
      {node}
    </div>
  );
}

function StaffEditor({ u, me, perms, onClose, run }: any) {
  const [f, setF] = React.useState<any>({ ...u, email: u.email || "", phone: u.phone || "", pin: "", password: "", hourly: u.hourlyRate ? String(u.hourlyRate / 100) : "", monthly: u.monthlySalary ? String(u.monthlySalary / 100) : "" });
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }));
  const roleDefault = (p: string) => ((PERMISSIONS as any)[p] as string[]).includes(f.role);
  const save = () => {
    const body: any = { name: f.name, email: f.email, phone: f.phone || undefined, role: f.role, branchId: f.branchId || null, permissions: f.permissions, hourlyRate: Math.round(Number(f.hourly || 0) * 100), monthlySalary: Math.round(Number(f.monthly || 0) * 100), active: f.active ?? true };
    if (f.pin) body.pin = f.pin; if (f.password) body.password = f.password;
    run(api(u.id ? `/api/staff/${u.id}` : "/api/staff", { method: u.id ? "PUT" : "POST", body }), "Saved", onClose);
  };
  return <Dialog open onClose={onClose} title={u.id ? `Edit ${u.name}` : "Add staff"} wide>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><Label htmlFor="sname">Name</Label><Input id="sname" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
      <div><Label>Role</Label><Select value={f.role} onChange={(e) => set("role", e.target.value)}>{ROLES.filter((r) => me.user.role === "OWNER" || !["OWNER", "MANAGER"].includes(r)).map((r) => <option key={r}>{r}</option>)}</Select></div>
      <div><Label>Email (for password login)</Label><Input value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
      <div><Label>Phone</Label><Input value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
      <div><Label htmlFor="spin">{u.id ? "New 4-digit PIN (leave blank to keep)" : "4-digit PIN"}</Label><Input id="spin" inputMode="numeric" maxLength={4} value={f.pin} onChange={(e) => set("pin", e.target.value)} /></div>
      <div><Label>{u.id ? "New password (optional)" : "Password (optional)"}</Label><Input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} /></div>
      <div><Label>Branch</Label><Select value={f.branchId || ""} onChange={(e) => set("branchId", e.target.value)} disabled={me.user.role !== "OWNER"}>{me.user.role === "OWNER" && <option value="">All branches</option>}{me.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></div>
      <div className="grid grid-cols-2 gap-2"><div><Label>₹ per hour</Label><Input type="number" value={f.hourly} onChange={(e) => set("hourly", e.target.value)} /></div><div><Label>₹ per month</Label><Input type="number" value={f.monthly} onChange={(e) => set("monthly", e.target.value)} /></div></div>
    </div>
    <div className="mt-4"><Label>Permissions (ticked grey = comes with the role; tick others to give extra access)</Label>
      <div className="grid gap-1 sm:grid-cols-3">{perms.map((p: string) => <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={roleDefault(p)} checked={roleDefault(p) || f.permissions.includes(p)} onChange={(e) => set("permissions", e.target.checked ? [...f.permissions, p] : f.permissions.filter((x: string) => x !== p))} />{p}</label>)}</div></div>
    <div className="mt-4 flex justify-between">{u.id ? <label className="flex items-center gap-2"><input type="checkbox" checked={f.active ?? true} onChange={(e) => set("active", e.target.checked)} />Active (can log in)</label> : <span />}<Button onClick={save}>Save</Button></div>
  </Dialog>;
}

function Shifts({ staff, run }: any) {
  const [shifts, setShifts] = React.useState<any[]>([]);
  const load = () => api("/api/shifts").then(setShifts);
  React.useEffect(() => { load(); }, []);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() + i * 86400_000).toLocaleDateString("en-CA"));
  return <div className="space-y-3">
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/shifts", { body: { name: f.get("name"), startTime: f.get("s"), endTime: f.get("e") } }), "Shift added", load); }}>
      <Input name="name" placeholder="Shift name (Morning)" className="w-44" required /><Input name="s" type="time" defaultValue="08:00" className="w-32" /><Input name="e" type="time" defaultValue="16:00" className="w-32" /><Button>Add shift</Button></form>
    <div className="card overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="p-2 text-left">Shift</th>{days.map((d) => <th key={d} className="p-2">{new Date(d + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })}</th>)}</tr></thead>
      <tbody>{shifts.map((s) => <tr key={s.id} className="border-t border-app"><td className="p-2"><b>{s.name}</b><div className="text-xs muted">{s.startTime}–{s.endTime}</div></td>
        {days.map((d) => <td key={d} className="p-1 align-top">{s.assignments.filter((a: any) => a.date === d).map((a: any) => <div key={a.id} className="mb-1 flex items-center justify-between rounded bg-brand-100 px-1 text-xs dark:bg-brand-700/30">{a.user.name.split(" ")[0]}<button onClick={() => run(api("/api/shifts/assign", { body: { shiftId: s.id, userId: a.user.id, date: d, remove: true } }), "Removed", load)}>×</button></div>)}
          <select aria-label="assign" className="w-full rounded border border-app bg-card text-xs" value="" onChange={(e) => e.target.value && run(api("/api/shifts/assign", { body: { shiftId: s.id, userId: e.target.value, date: d } }), "Assigned", load)}><option value="">+</option>{staff.filter((u: any) => u.active).map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></td>)}</tr>)}</tbody></table></div>
  </div>;
}
function LeaveTab({ run }: any) {
  const [list, setList] = React.useState<any[]>([]);
  const load = () => api("/api/leave").then(setList);
  React.useEffect(() => { load(); }, []);
  return <Table head={["Staff", "From", "To", "Reason", "Status", ""]} rows={list.map((l) => [l.user.name, l.fromDate, l.toDate, l.reason, <Badge key="s" color={l.status === "APPROVED" ? "green" : l.status === "REJECTED" ? "red" : "yellow"}>{l.status}</Badge>,
    l.status === "PENDING" && <div key="a" className="flex gap-1"><Button size="sm" variant="success" onClick={() => run(api(`/api/leave/${l.id}`, { method: "PUT", body: { status: "APPROVED" } }), "Approved", load)}>Approve</Button><Button size="sm" variant="ghost" onClick={() => run(api(`/api/leave/${l.id}`, { method: "PUT", body: { status: "REJECTED" } }), "Rejected", load)}>Reject</Button></div>])} empty="No leave requests." />;
}
function Salary() {
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = React.useState<any>(null);
  React.useEffect(() => { api(`/api/staff/salary?month=${month}`).then(setD); }, [month]);
  return <div className="space-y-2"><div className="flex gap-2"><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" /><a href={`/api/staff/salary?month=${month}&format=xlsx`}><Button variant="outline">Export to Excel</Button></a></div>
    <p className="text-xs muted">Monthly staff: salary × (days present + approved leave) ÷ 26. Hourly staff: hours × rate. Tips added on top.</p>
    {d && <Table head={["Name", "Role", "Hours", "Days present", "Leave", "Base", "Tips", "Total"]} rows={d.rows.map((r: any) => [r.name, r.role, r.hours, r.present, r.leave, rs(r.base), rs(r.tips), <b key="t">{rs(r.total)}</b>])} />}</div>;
}
