"use client";
import * as React from "react";
import { Badge, Button, Card, Input, PageHeader, Select, Tabs, useToast } from "@/components/ui";
import { api } from "@/lib/client";
import { useApp, useLive } from "@/components/app/AppContext";

const C: Record<string, string> = { BOOKED: "blue", CONFIRMED: "purple", SEATED: "green", COMPLETED: "slate", CANCELLED: "red", NO_SHOW: "orange" };
const dayKey = (d: Date) => d.toLocaleDateString("en-CA");

export default function ReservationsPage() {
  const { me } = useApp();
  const [tab, setTab] = React.useState<"calendar" | "waitlist">("calendar");
  const [list, setList] = React.useState<any[]>([]);
  const [tables, setTables] = React.useState<any[]>([]);
  const [wait, setWait] = React.useState<any[]>([]);
  const [day, setDay] = React.useState(dayKey(new Date()));
  const { toast, node } = useToast();
  const load = React.useCallback(() => { api("/api/reservations").then(setList); api("/api/waitlist").then(setWait); }, []);
  React.useEffect(() => { load(); api("/api/tables").then((d) => setTables(d.tables)).catch(() => {}); }, [load]);
  useLive("waitlist:updated", load);
  const run = (p: Promise<any>, m: string) => p.then(() => { toast(m); load(); }).catch((e) => toast(e.message, "err"));
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  const ofDay = list.filter((r) => dayKey(new Date(r.dateTime)) === day);
  return (
    <div>
      <PageHeader title="Reservations">{me && <a href={`/book/${me.restaurant.slug}`} target="_blank"><Button variant="outline">Online booking page ↗</Button></a>}</PageHeader>
      <Tabs value={tab} onChange={setTab} options={[{ value: "calendar", label: "Bookings" }, { value: "waitlist", label: `Waitlist (${wait.filter((w) => w.status === "WAITING").length})` }]} />
      {tab === "calendar" ? <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 grid grid-cols-7 gap-1">{days.map((d) => { const k = dayKey(d); const n = list.filter((r) => dayKey(new Date(r.dateTime)) === k && !["CANCELLED"].includes(r.status)).length; return (
            <button key={k} onClick={() => setDay(k)} className={`rounded-lg border p-2 text-center text-sm ${day === k ? "border-brand-600 bg-brand-600 text-white" : "border-app bg-card"}`}>
              <div>{d.toLocaleDateString("en-IN", { weekday: "short" })}</div><div className="text-lg font-bold">{d.getDate()}</div><div className="text-xs">{n} bookings</div></button>); })}</div>
          <div className="space-y-2">{ofDay.length === 0 && <p className="muted">No bookings for this day.</p>}
            {ofDay.map((r) => <Card key={r.id} className="flex flex-wrap items-center gap-2">
              <div className="w-16 text-lg font-bold">{new Date(r.dateTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
              <div className="min-w-40 flex-1"><b>{r.name}</b> · {r.guests} guests · {r.phone} {r.noShows > 0 && <Badge color="red">{r.noShows} past no-show</Badge>}<div className="text-xs muted">{r.source} {r.notes && `· ${r.notes}`}</div></div>
              <Select className="w-28" value={r.tableId || ""} onChange={(e) => run(api(`/api/reservations/${r.id}`, { method: "PUT", body: { tableId: e.target.value || null } }), "Table changed")}><option value="">No table</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.seats})</option>)}</Select>
              <Badge color={C[r.status]}>{r.status}</Badge>
              {["BOOKED", "CONFIRMED"].includes(r.status) && <><Button size="sm" variant="success" onClick={() => run(api(`/api/reservations/${r.id}`, { method: "PUT", body: { status: "SEATED" } }), "Seated")}>Seat</Button>
                <Button size="sm" variant="outline" onClick={() => run(api(`/api/reservations/${r.id}`, { method: "PUT", body: { status: "NO_SHOW" } }), "Marked no-show")}>No-show</Button>
                <Button size="sm" variant="ghost" onClick={() => run(api(`/api/reservations/${r.id}`, { method: "PUT", body: { status: "CANCELLED" } }), "Cancelled")}>Cancel</Button></>}
              {r.status === "SEATED" && <Button size="sm" variant="outline" onClick={() => run(api(`/api/reservations/${r.id}`, { method: "PUT", body: { status: "COMPLETED" } }), "Done")}>Done</Button>}
            </Card>)}</div>
        </div>
        <Card><h2 className="mb-2 font-semibold">New booking (phone / walk-in)</h2>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); run(api("/api/reservations", { body: { name: f.get("name"), phone: f.get("phone"), guests: Number(f.get("guests")), dateTime: new Date(`${f.get("date")}T${f.get("time")}`).toISOString(), tableId: f.get("table") || null, notes: f.get("notes") || undefined, source: "PHONE" } }), "Booked"); }}>
            <Input name="name" placeholder="Name" required /><Input name="phone" placeholder="Phone" required /><Input name="guests" type="number" min={1} defaultValue={2} />
            <Input name="date" type="date" defaultValue={day} required /><Input name="time" type="time" defaultValue="20:00" required />
            <Select name="table"><option value="">Auto-pick table</option>{tables.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.seats})</option>)}</Select>
            <Input name="notes" placeholder="Notes (birthday, high chair…)" /><Button className="w-full">Book table</Button></form></Card>
      </div> : <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">{wait.length === 0 && <p className="muted">Nobody waiting.</p>}
          {wait.map((w, i) => <Card key={w.id} className="flex flex-wrap items-center gap-2">
            <div className="w-8 text-lg font-bold">{i + 1}</div><div className="flex-1"><b>{w.name}</b> · {w.guests} guests · {w.phone}<div className="text-xs muted">Waiting {Math.floor((Date.now() - new Date(w.createdAt).getTime()) / 60000)} min · quoted {w.quotedMins} min</div></div>
            <Badge color={w.status === "WAITING" ? "yellow" : w.status === "NOTIFIED" ? "blue" : "slate"}>{w.status}</Badge>
            {w.status === "WAITING" && <Button size="sm" onClick={() => run(api(`/api/waitlist/${w.id}`, { method: "PUT", body: { status: "NOTIFIED" } }), "\"Table ready\" message sent (mock)")}>Table ready → notify</Button>}
            {["WAITING", "NOTIFIED"].includes(w.status) && <><Button size="sm" variant="success" onClick={() => run(api(`/api/waitlist/${w.id}`, { method: "PUT", body: { status: "SEATED" } }), "Seated")}>Seated</Button><Button size="sm" variant="ghost" onClick={() => run(api(`/api/waitlist/${w.id}`, { method: "PUT", body: { status: "LEFT" } }), "Removed")}>Left</Button></>}
          </Card>)}</div>
        <Card><h2 className="mb-2 font-semibold">Add walk-in to waitlist</h2>
          <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); api("/api/waitlist", { body: { name: f.get("name"), phone: f.get("phone"), guests: Number(f.get("guests")) } }).then((w) => { toast(`Added. Estimated wait: ${w.quotedMins} min`); load(); }).catch((er) => toast(er.message, "err")); e.currentTarget.reset(); }}>
            <Input name="name" placeholder="Name" required /><Input name="phone" placeholder="Phone" required /><Input name="guests" type="number" min={1} defaultValue={2} /><Button className="w-full">Add</Button></form></Card>
      </div>}
      {node}
    </div>
  );
}
