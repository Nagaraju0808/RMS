"use client";
import * as React from "react";
import { use } from "react";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { api } from "@/lib/client";
export default function Book({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [r, setR] = React.useState<any>(null); const [done, setDone] = React.useState<any>(null); const [err, setErr] = React.useState("");
  React.useEffect(() => { api(`/api/public/book/${slug}`).then(setR).catch((e) => setErr(e.message)); }, [slug]);
  if (done) return <div className="p-8 text-center"><h1 className="text-2xl font-bold">Booked! ✓</h1><p>See you on {new Date(done.dateTime).toLocaleString("en-IN")}.</p></div>;
  if (!r) return <p className="p-6">{err || "Loading…"}</p>;
  const tomorrow = new Date(Date.now() + 86400_000).toLocaleDateString("en-CA");
  return <div className="mx-auto max-w-md p-4"><Card>
    <h1 className="mb-1 text-xl font-bold">Book a table at {r.name}</h1>
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); setErr(""); const f = new FormData(e.currentTarget);
      api(`/api/public/book/${slug}`, { body: { branchId: f.get("branch"), name: f.get("name"), phone: f.get("phone"), guests: Number(f.get("guests")), dateTime: new Date(`${f.get("date")}T${f.get("time")}`).toISOString(), notes: f.get("notes") || undefined } }).then(setDone).catch((er) => setErr(er.message)); }}>
      <Label>Branch</Label><Select name="branch">{r.branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>
      <Label>Your name</Label><Input name="name" required /><Label>Phone</Label><Input name="phone" inputMode="tel" required />
      <Label>Guests</Label><Input name="guests" type="number" min={1} max={20} defaultValue={2} />
      <div className="grid grid-cols-2 gap-2"><div><Label>Date</Label><Input name="date" type="date" defaultValue={tomorrow} required /></div><div><Label>Time</Label><Input name="time" type="time" defaultValue="20:00" required /></div></div>
      <Label>Notes</Label><Textarea name="notes" rows={2} />
      <Button className="w-full" size="lg">Book</Button>
      {err && <p className="text-red-600">{err}</p>}
    </form></Card></div>;
}
