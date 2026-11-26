"use client";
import * as React from "react";
import { Button, Card, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const [mode, setMode] = React.useState<"email" | "pin">("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [restaurant, setRestaurant] = React.useState("demo");
  const [pin, setPin] = React.useState("");
  const [err, setErr] = React.useState("");
  const [ready, setReady] = React.useState(false); // buttons wait until the page is interactive
  React.useEffect(() => setReady(true), []);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { try { const r = localStorage.getItem("df_restaurant"); if (r) setRestaurant(r); } catch {} }, []);

  async function submit(e?: React.FormEvent, pinValue?: string) {
    e?.preventDefault();
    setErr(""); setBusy(true);
    const body = mode === "email" ? { email, password } : { restaurant, pin: pinValue ?? pin };
    const res = await fetch(mode === "email" ? "/api/auth/login" : "/api/auth/pin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Login failed"); setPin(""); return; }
    try { if (mode === "pin") localStorage.setItem("df_restaurant", restaurant); } catch {}
    const next = new URLSearchParams(location.search).get("next");
    const home: Record<string, string> = { CHEF: "/kitchen", WAITER: "/waiter", DELIVERY: "/rider", CASHIER: "/pos" };
    location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : home[data.role] || "/dashboard";
  }
  const press = (d: string) => {
    if (d === "⌫") return setPin((p) => p.slice(0, -1));
    const p = (pin + d).slice(0, 4);
    setPin(p);
    if (p.length === 4) submit(undefined, p);
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-2xl font-bold text-white">D</div>
          <h1 className="text-2xl font-bold">DineFlow</h1>
          <p className="text-sm muted">Restaurant management</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-app p-1">
          <button className={`rounded-md py-2 text-sm ${mode === "email" ? "bg-brand-600 text-white" : ""}`} onClick={() => setMode("email")}>Email</button>
          <button className={`rounded-md py-2 text-sm ${mode === "pin" ? "bg-brand-600 text-white" : ""}`} onClick={() => setMode("pin")}>Staff PIN</button>
        </div>
        {mode === "email" ? (
          <form onSubmit={submit} className="space-y-3">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></div>
            <div><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
            <Button className="w-full" disabled={busy || !ready}>{busy ? "Logging in…" : "Log in"}</Button>
          </form>
        ) : (
          <div className="space-y-3">
            <div><Label htmlFor="rcode">Restaurant code</Label><Input id="rcode" value={restaurant} onChange={(e) => setRestaurant(e.target.value)} /></div>
            <div className="flex justify-center gap-3 py-2" aria-label="PIN">
              {[0, 1, 2, 3].map((i) => <div key={i} className={`h-4 w-4 rounded-full ${pin.length > i ? "bg-brand-600" : "bg-slate-300"}`} />)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
                d ? <Button key={i} variant="outline" size="xl" onClick={() => press(d)} disabled={busy}>{d}</Button> : <div key={i} />)}
            </div>
          </div>
        )}
        {err && <p role="alert" className="mt-3 text-center text-sm text-red-600">{err}</p>}
        <a href="/signup" className="mt-4 block text-center text-sm text-brand-600">New restaurant? Create an account</a>
        <p className="mt-2 text-center text-xs muted">Demo: owner@demo.com / password123 · PINs 1111–6666</p>
      </Card>
    </div>
  );
}
