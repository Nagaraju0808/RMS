"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Smartphone, LayoutGrid, ClipboardList, ChefHat, Receipt, CalendarDays, Bike, UtensilsCrossed, Package, Users, UserCog, Clock, BarChart3, Sparkles, ShieldCheck, Settings, Circle } from "lucide-react";
const Icons: Record<string, any> = { LayoutDashboard, ShoppingCart, Smartphone, LayoutGrid, ClipboardList, ChefHat, Receipt, CalendarDays, Bike, UtensilsCrossed, Package, Users, UserCog, Clock, BarChart3, Sparkles, ShieldCheck, Settings };
import { AppProvider, useApp, useLive } from "./AppContext";
import { cn } from "@/lib/utils";

function Icon({ name, className }: { name: string; className?: string }) {
  const C = Icons[name] || Circle;
  return <C className={className} size={18} />;
}

function Alerts() {
  const [alerts, setAlerts] = React.useState<{ id: number; text: string }[]>([]);
  const { me } = useApp();
  const push = (text: string) => {
    const id = Date.now() + Math.random();
    setAlerts((a) => [...a, { id, text }]);
    setTimeout(() => setAlerts((a) => a.filter((x) => x.id !== id)), 8000);
  };
  const staff = me && ["OWNER", "MANAGER", "CASHIER", "WAITER"].includes(me.user.role);
  useLive("item:ready", (d) => staff && push(`🍽️ Ready: ${d.name} ${d.table ? "– " + d.table : ""}`));
  useLive("table:request", (d) => staff && push(d.type === "CALL_WAITER" ? `🙋 ${d.table} is calling a waiter` : `🧾 ${d.table} asked for the bill`));
  useLive("qr:pending", (d) => staff && push(`📱 New QR order from ${d.table} needs approval`));
  useLive("feedback:low", (d) => me && ["OWNER", "MANAGER"].includes(me.user.role) && push(`⚠️ Low rating (${d.rating}★): ${d.comment || ""}`));
  useLive("stock:low", (d) => me && ["OWNER", "MANAGER", "CHEF"].includes(me.user.role) && push(`📦 Low stock: ${d.name}`));
  return (
    <div className="fixed right-4 top-4 z-[70] flex flex-col gap-2 no-print">
      {alerts.map((a) => <div key={a.id} role="alert" className="rounded-lg bg-slate-900 px-4 py-3 text-white shadow-lg">{a.text}</div>)}
    </div>
  );
}

function Sidebar({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const { me, reload } = useApp();
  const path = usePathname();
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggleTheme = () => {
    const d = !dark; setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try { localStorage.setItem("theme", d ? "dark" : "light"); } catch {}
  };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; };
  const switchBranch = async (id: string) => { await fetch("/api/auth/branch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId: id }) }); reload(); location.reload(); };
  return (
    <aside className={cn("no-print fixed inset-y-0 left-0 z-40 w-60 transform border-r border-app bg-card p-3 transition md:static md:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
      <div className="mb-4 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">D</div>
        <div className="min-w-0">
          <div className="truncate font-semibold">{me?.restaurant.name || "DineFlow"}</div>
          <div className="truncate text-xs muted">{me?.user.name} · {me?.user.role}</div>
        </div>
      </div>
      {me && me.branches.length > 1 && me.user.role === "OWNER" && (
        <select aria-label="Branch" className="mb-3 h-9 w-full rounded-lg border border-app bg-card px-2 text-sm" value={me.branch?.id} onChange={(e) => switchBranch(e.target.value)}>
          {me.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      )}
      <nav className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
        {me?.nav.map((n) => (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm", path.startsWith(n.href) ? "bg-brand-600 text-white" : "hover:bg-black/5 dark:hover:bg-white/5")}>
            <Icon name={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
      <div className="absolute inset-x-3 bottom-3 flex gap-2">
        <button onClick={toggleTheme} className="flex-1 rounded-lg border border-app py-2 text-sm">{dark ? "☀️ Light" : "🌙 Dark"}</button>
        <button onClick={logout} className="flex-1 rounded-lg border border-app py-2 text-sm">Log out</button>
      </div>
    </aside>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <AppProvider>
      <div className="flex min-h-screen">
        <Sidebar open={open} setOpen={setOpen} />
        <div className="min-w-0 flex-1">
          <header className="no-print flex items-center gap-2 border-b border-app bg-card p-2 md:hidden">
            <button aria-label="Open menu" onClick={() => setOpen(!open)} className="rounded-lg p-2 text-xl">☰</button>
            <span className="font-semibold">DineFlow</span>
          </header>
          <main className="p-4">{children}</main>
        </div>
        <Alerts />
      </div>
    </AppProvider>
  );
}
