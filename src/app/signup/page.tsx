"use client";
import * as React from "react";
import { Button, Card, Input, Label } from "@/components/ui";
import { api } from "@/lib/client";

export default function Signup() {
  const [f, setF] = React.useState({ restaurantName: "", ownerName: "", email: "", password: "", pin: "" });
  const [err, setErr] = React.useState("");
  const [ready, setReady] = React.useState(false); // buttons wait until the page is interactive
  React.useEffect(() => setReady(true), []);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/auth/signup", { body: f }); location.href = "/onboarding"; } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <h1 className="mb-4 text-2xl font-bold">Create your restaurant</h1>
        <form onSubmit={submit} className="space-y-3">
          <div><Label htmlFor="rn">Restaurant name</Label><Input id="rn" value={f.restaurantName} onChange={set("restaurantName")} required /></div>
          <div><Label htmlFor="on">Your name</Label><Input id="on" value={f.ownerName} onChange={set("ownerName")} required /></div>
          <div><Label htmlFor="em">Email</Label><Input id="em" type="email" value={f.email} onChange={set("email")} required /></div>
          <div><Label htmlFor="pw">Password (8+ characters)</Label><Input id="pw" type="password" value={f.password} onChange={set("password")} required /></div>
          <div><Label htmlFor="pin">4-digit PIN for quick login</Label><Input id="pin" inputMode="numeric" maxLength={4} value={f.pin} onChange={set("pin")} required /></div>
          <Button className="w-full" disabled={!ready}>Create</Button>
        </form>
        {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
        <a href="/login" className="mt-4 block text-center text-sm text-brand-600">I already have an account</a>
      </Card>
    </div>
  );
}
