"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Smartphone, LayoutGrid, ClipboardList, ChefHat, Receipt, CalendarDays, Bike, UtensilsCrossed, Package, Users, UserCog, Clock, BarChart3, Sparkles, ShieldCheck, Settings, Circle, Menu as MenuIcon, X, Moon, Sun, LogOut, ChevronDown, BellRing, HandPlatter, Smartphone as Phone, TriangleAlert, PackageX, Utensils } from "lucide-react";
import { AppProvider, useApp, useLive } from "./AppContext";
import { Mark } from "./Mark";
import { OfflineBanner } from "./OfflineBanner";
import { cn } from "@/lib/utils";

const Icons: Record<string, any> = { LayoutDashboard, ShoppingCart, Smartphone, LayoutGrid, ClipboardList, ChefHat, Receipt, CalendarDays, Bike, UtensilsCrossed, Package, Users, UserCog, Clock, BarChart3, Sparkles, ShieldCheck, Settings };
const Icon = ({ name }: { name: string }) => { const C = Icons[name] || Circle; return <C size={16} strokeWidth={1.6} className="shrink-0" />; };
const initials = (n: string) => n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

function Alerts() {
  const [alerts, setAlerts] = React.useState<{ id: number; text: string; icon: any; tone: "info" | "warn" }[]>([]);
  const { me } = useApp();
  const push = (text: string, icon: any, tone: "info" | "warn" = "info") => {
    const id = Date.now() + Math.random();
    setAlerts((a) => [...a, { id, text, icon, tone }]);
    setTimeout(() => setAlerts((a) => a.filter((x) => x.id !== id)), 8000);
  };
  const staff = me && ["OWNER", "MANAGER", "CASHIER", "WAITER"].includes(me.user.role);
  useLive("item:ready", (d) => staff && push(`Ready: ${d.name}${d.table ? " – " + d.table : ""}`, Utensils));
  useLive("table:request", (d) => staff && push(d.type === "CALL_WAITER" ? `${d.table} is calling a waiter` : `${d.table} asked for the bill`, d.type === "CALL_WAITER" ? HandPlatter : Receipt, "warn"));
  useLive("qr:pending", (d) => staff && push(`New QR order from ${d.table} needs approval`, Phone, "warn"));
  useLive("feedback:low", (d) => me && ["OWNER", "MANAGER"].includes(me.user.role) && push(`Low rating (${d.rating} of 5): ${d.comment || "no comment"}`, TriangleAlert, "warn"));
  useLive("stock:low", (d) => me && ["OWNER", "MANAGER", "CHEF"].includes(me.user.role) && push(`Low stock: ${d.name}`, PackageX, "warn"));
  return (
    <div className="no-print fixed right-4 top-14 z-[70] flex w-80 flex-col gap-2">
      {alerts.map((a) => { const I = a.icon; return (
        <div key={a.id} role="alert" className="flex items-start gap-3 rounded-lg bg-[var(--ink-fill)] px-4 py-3 text-sm text-[var(--on-ink)] shadow-[0_8px_24px_rgba(0,0,0,.2)]">
          <I size={18} className={a.tone === "warn" ? "mt-px text-amber-300" : "mt-px"} /><span>{a.text}</span>
        </div>); })}
    </div>
  );
}

function Sidebar({ open, setOpen }: { open: boolean; setOpen: (b: boolean) => void }) {
  const { me } = useApp();
  const path = usePathname();
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggleTheme = () => {
    const d = !dark; setDark(d);
    document.documentElement.classList.toggle("dark", d);
    try { localStorage.setItem("theme", d ? "dark" : "light"); } catch {}
  };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; };
  const groups = ["Service", "Guests", "Back office", "You"] as const;
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("no-print fixed inset-y-0 left-0 z-40 flex w-[228px] flex-col bg-[var(--frame)] transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-12 items-center gap-2.5 px-4">
          <Mark size={26} />
          <span className="text-[15px] font-semibold">DineFlow</span>
          <button className="ml-auto rounded-md p-1 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-3 pt-2" aria-label="Main">
          {groups.map((g) => {
            const items = me?.nav.filter((n: any) => n.group === g) ?? [];
            if (!items.length) return null;
            return (
              <div key={g} className="mb-4">
                <div className="mb-1 px-3 text-xs text-[var(--muted)]">{g}</div>
                {items.map((n) => {
                  const active = path === n.href || path.startsWith(n.href + "/");
                  return (
                    <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                      className={cn("flex h-8 items-center gap-2.5 rounded-md px-3 text-sm transition-colors", active ? "bg-[var(--active)] font-medium text-[var(--text)]" : "text-[var(--muted)] hover:bg-[var(--active)]/60 hover:text-[var(--text)]")}>
                      <Icon name={n.icon} />{n.label}
                    </Link>);
                })}
              </div>);
          })}
        </nav>
        <div className="flex items-center gap-2 px-3 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pill-info-bg)] text-xs font-semibold text-[var(--pill-info-ink)]">{me ? initials(me.user.name) : ""}</span>
          <div className="min-w-0 flex-1 leading-tight"><div className="truncate text-[13px] font-medium">{me?.user.name}</div><div className="text-xs capitalize text-[var(--muted)]">{me?.user.role.toLowerCase()}</div></div>
          <button onClick={toggleTheme} aria-label={dark ? "Light mode" : "Dark mode"} title={dark ? "Light mode" : "Dark mode"} className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--active)] hover:text-[var(--text)]">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button onClick={logout} aria-label="Log out" title="Log out" className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--active)] hover:text-[var(--text)]"><LogOut size={16} /></button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ setOpen }: { setOpen: (b: boolean) => void }) {
  const { me, reload, socket } = useApp();
  const [live, setLive] = React.useState(false);
  React.useEffect(() => {
    if (!socket) return;
    const on = () => setLive(true), off = () => setLive(false);
    setLive(socket.connected); socket.on("connect", on); socket.on("disconnect", off);
    return () => { socket.off("connect", on); socket.off("disconnect", off); };
  }, [socket]);
  const switchBranch = async (id: string) => { await fetch("/api/auth/branch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ branchId: id }) }); reload(); location.reload(); };
  return (
    <header className="no-print sticky top-0 z-20 flex h-12 items-center gap-3 bg-[var(--frame)] px-3 lg:px-2">
      <button aria-label="Open menu" onClick={() => setOpen(true)} className="rounded-md p-1.5 lg:hidden"><MenuIcon size={20} /></button>
      <span className="lg:hidden"><Mark size={22} /></span>
      <div className="flex min-w-0 items-center gap-1 text-sm">
        <span className="truncate font-medium">{me?.restaurant.name}</span>
        <span className="text-[var(--muted)]">/</span>
        {me && me.branches.length > 1 && me.user.role === "OWNER" ? (
          <label className="relative flex items-center">
            <span className="sr-only">Branch</span>
            <select aria-label="Branch" className="appearance-none rounded-md bg-transparent py-1 pl-1 pr-6 text-sm text-[var(--text)] hover:bg-[var(--active)]" value={me.branch?.id} onChange={(e) => switchBranch(e.target.value)}>
              {me.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-1.5 text-[var(--muted)]" />
          </label>
        ) : <span className="truncate text-[var(--muted)]">{me?.branch?.name}</span>}
      </div>
      <div className="ml-auto flex items-center gap-2 pr-2 text-xs text-[var(--muted)]" title={live ? "Live updates connected" : "Live updates reconnecting"}>
        <span className={cn("h-2 w-2 rounded-full", live ? "bg-[var(--positive)]" : "bg-[var(--control)]")} />
        <span className="hidden sm:inline">{live ? "Live" : "Reconnecting"}</span>
        <BellRing size={15} className="ml-2 hidden sm:block" aria-hidden />
      </div>
    </header>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  // Staff screens are client-rendered (data loads after mount) – avoids server/browser time-zone mismatches.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="p-6 text-[var(--muted)]">Loading…</div>;
  return (
    <AppProvider>
      <div className="flex min-h-screen bg-[var(--frame)]">
        <Sidebar open={open} setOpen={setOpen} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar setOpen={setOpen} />
          {/* The sheet: white, inset 8px from the right and bottom, 16px corners, 1px edge, no shadow. */}
          <main className="min-w-0 flex-1 bg-[var(--surface)] px-5 py-4 md:mb-2 md:mr-2 md:rounded-[var(--radius-sheet)] md:border md:border-[var(--border)] md:p-6"><OfflineBanner />{children}</main>
        </div>
        <Alerts />
      </div>
    </AppProvider>
  );
}
