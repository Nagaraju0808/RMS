"use client";
import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useApp, useLive } from "@/components/app/AppContext";
import { Button, PageHeader, Select } from "@/components/ui";
import { LineChart } from "@/components/app/Charts";
import { api, rs } from "@/lib/client";
import { cn } from "@/lib/utils";
import { localParts } from "@/lib/tz";

type Metric = "sales" | "bills" | "avg";
const OPEN_H = 7, CLOSE_H = 23; // service hours shown on the chart
const hhmm = (iso: string) => localParts(iso).hhmm;
const minsOfDay = (iso: string) => localParts(iso).mins;

/** Signed change that says good or bad (more sales is good). */
function Change({ now, before, money }: { now: number; before: number; money?: boolean }) {
  if (!before && !now) return <span className="text-[var(--muted)]">no change</span>;
  if (!before) return <span className="text-[var(--muted)]">none last week</span>;
  const pct = Math.round(((now - before) / before) * 100);
  return <span className={cn("tabular-nums", pct > 0 ? "text-[var(--positive)]" : pct < 0 ? "text-[var(--negative)]" : "text-[var(--muted)]")}>{pct > 0 ? "+" : pct < 0 ? "−" : "±"}{Math.abs(pct)}%{money ? "" : ""}</span>;
}

export default function Dashboard() {
  const { me } = useApp();
  const [branch, setBranch] = React.useState("");
  const [metric, setMetric] = React.useState<Metric>("sales");
  const [d, setD] = React.useState<any>(null);
  const load = React.useCallback(() => api(`/api/dashboard${branch ? `?branch=${branch}` : ""}`).then(setD).catch(() => {}), [branch]);
  React.useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);
  useLive("order:updated", load); useLive("order:new", load); useLive("table:updated", load);
  if (!me) return <p className="text-[var(--muted)]">Loading…</p>;
  if (!me.restaurant.onboarded && me.user.role === "OWNER") { location.href = "/onboarding"; return null; }
  const where = branch ? me.branches.find((b) => b.id === branch)?.name : me.branches.length > 1 && me.user.role === "OWNER" ? "all branches" : me.branch?.name;
  if (!d) return <PageHeader title={`Today at ${where}`} sub="Loading today's figures…" />;

  const day = d.lastWeekDay as string;
  const t = d.today, lw = d.lastWeek;
  // One finding, read first: the gap to last week at this hour, and what is waiting on staff.
  const salesGap = t.sales - lw.sales;
  const finding = `${rs(t.sales)} taken so far – ${salesGap === 0 ? "level with" : `${rs(Math.abs(salesGap))} ${salesGap > 0 ? "ahead of" : "behind"}`} last ${day} at this time.` +
    (d.waitingBill ? ` ${d.waitingBill} ${d.waitingBill === 1 ? "table is" : "tables are"} waiting to pay.` : "") + (d.soldOut.length ? ` ${d.soldOut.length} ${d.soldOut.length === 1 ? "dish has" : "dishes have"} sold out.` : "");

  // Running totals through the day: "are we ahead of last week by now?" is the screen's question.
  const hours = d.hourly.filter((h: any) => h.hour >= OPEN_H && h.hour <= CLOSE_H);
  let st = 0, sl = 0, bt = 0, bl = 0;
  for (const h of d.hourly) if (h.hour < OPEN_H) { st += h.today; sl += h.lastWeek; bt += h.billsToday; bl += h.billsLastWeek; }
  const series = hours.map((h: any) => {
    st += h.today; sl += h.lastWeek; bt += h.billsToday; bl += h.billsLastWeek;
    const v = metric === "sales" ? [st, sl] : metric === "bills" ? [bt, bl] : [bt ? Math.round(st / bt) : 0, bl ? Math.round(sl / bl) : 0];
    return { hour: `${String(h.hour).padStart(2, "0")}:00`, today: h.future ? null : v[0], lastWeek: v[1] };
  });
  const kpis: { key: Metric; label: string; now: number; before: number; money: boolean }[] = [
    { key: "sales", label: "Sales", now: t.sales, before: lw.sales, money: true },
    { key: "bills", label: "Bills", now: t.bills, before: lw.bills, money: false },
    { key: "avg", label: "Average bill", now: t.avgBill, before: lw.avgBill, money: true },
  ];
  const counts = [
    { label: "Open orders", value: d.openOrders, href: "/orders", next: "No orders open" },
    { label: "Tables in use", value: d.tables.total ? `${d.tables.occupied} of ${d.tables.total}` : "–", href: "/tables", next: "" },
    { label: "Dishes cooking", value: d.kitchenQueue, href: "/kitchen", next: "Kitchen is clear" },
    { label: "Waiting to pay", value: d.waitingBill, href: "/billing", next: "Nobody waiting" },
    { label: "Calls from tables", value: d.requests, href: "/tables", next: "No calls" },
  ];
  const maxQty = Math.max(1, ...d.topItems.map((x: any) => x.qty));

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader title={`Today at ${where}`} sub={finding}>
        {me.user.role === "OWNER" && me.branches.length > 1 && <Select aria-label="Branch filter" value={branch} onChange={(e) => setBranch(e.target.value)} className="w-44"><option value="">All branches</option>{me.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select>}
        <Link href="/reports"><Button variant="outline">Reports</Button></Link>
        <Link href="/pos"><Button><Plus size={16} />New order</Button></Link>
      </PageHeader>

      {/* Service right now: counts that change minute to minute, split by 1px dividers. */}
      <section aria-label="Service right now" className="card mb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-[var(--border)]">
        {counts.map((c) => {
          const zero = c.value === 0;
          return (
            <Link key={c.label} href={c.href} className="group px-5 py-4 transition-colors hover:bg-[var(--raised)]">
              <div className="text-[13px] text-[var(--muted)]">{c.label}</div>
              <div className={cn("mt-1 text-2xl tabular-nums", zero && "text-[var(--muted)]")}>{c.value}</div>
              {zero && c.next && <div className="text-[13px] text-[var(--muted)]">{c.next}</div>}
            </Link>);
        })}
      </section>

      {/* Main card: the KPIs are the chart's tabs. */}
      <section className="card mb-6 px-6 pb-4 pt-5" aria-label="Today against last week">
        <div role="tablist" className="-mx-1 mb-5 flex gap-x-8 overflow-x-auto px-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-x-6 sm:overflow-visible sm:px-0 lg:flex lg:gap-x-10">
          {kpis.map((k) => (
            <button key={k.key} role="tab" aria-selected={metric === k.key} onClick={() => setMetric(k.key)}
              className={cn("-mb-px shrink-0 border-b-2 pb-3 text-left transition-colors", metric === k.key ? "border-[var(--text)]" : "border-transparent hover:border-[var(--control)]")}>
              <div className={cn("text-[13px] font-semibold", metric === k.key ? "text-[var(--text)]" : "text-[var(--muted)]")}>{k.label} today</div>
              <div className="mt-1 text-[28px] leading-8 tabular-nums">{k.money ? rs(k.now) : k.now}</div>
              <div className="mt-1 text-[13px] text-[var(--muted)]"><Change now={k.now} before={k.before} /> against {k.money ? rs(k.before) : k.before} by this time last {day}</div>
            </button>))}
        </div>
        <LineChart label={`${kpis.find((k) => k.key === metric)!.label} through the day, today against last ${day}`} money={metric !== "bills"} data={series} x="hour"
          series={[{ key: "today", label: "Today" }, { key: "lastWeek", label: `Last ${day}` }]} height={220} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6" aria-label="Top dishes today">
          <div className="mb-4 flex items-baseline justify-between"><h2 className="text-base font-semibold">Top dishes today</h2><Link href="/reports" className="text-sm text-[var(--accent)] hover:underline">Item report</Link></div>
          {d.topItems.length ? <ul className="space-y-3">{d.topItems.map((x: any) => (
            <li key={x.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1">
              <span className="truncate">{x.name}</span><span className="tabular-nums">{x.qty} {x.qty === 1 ? "plate" : "plates"}</span>
              <span className="col-span-2 h-1.5 rounded-full bg-[var(--rule)]"><span className="block h-1.5 rounded-full bg-[var(--chart-1)]" style={{ width: `${(x.qty / maxQty) * 100}%` }} /></span>
            </li>))}</ul> : <p className="text-[var(--muted)]">No dishes sold yet today. The first KOT will show here.</p>}
        </section>

        <section className="card p-6" aria-label="Sold out today">
          <div className="mb-1 flex items-baseline justify-between"><h2 className="text-base font-semibold">Sold out today</h2><Link href="/menu" className="text-sm text-[var(--accent)] hover:underline">Menu</Link></div>
          <SoldOutStrip rows={d.soldOut} day={day} />
        </section>
      </div>
    </div>
  );
}

/** Signature element: when each dish ran out today (ink dot) against the same weekday last week (hollow tick), on one service-hours axis. */
function SoldOutStrip({ rows, day }: { rows: { name: string; at: string; lastWeek: string | null }[]; day: string }) {
  const open = OPEN_H * 60, close = CLOSE_H * 60, x = (m: number) => `${Math.max(0, Math.min(100, ((m - open) / (close - open)) * 100))}%`;
  if (!rows.length) return <p className="mt-3 text-[var(--muted)]">Nothing has sold out yet today. Dishes switched to “out of stock” appear here with the time.</p>;
  return (
    <div className="mt-3">
      <div className="mb-3 flex gap-4 text-xs text-[var(--muted)]"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--text)]" />Today</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-[2px] bg-[var(--chart-cmp)]" />Last {day}</span></div>
      <ul className="space-y-4">{rows.map((r) => {
        const m = minsOfDay(r.at), lwm = r.lastWeek ? minsOfDay(r.lastWeek) : null, gap = lwm != null ? lwm - m : null;
        return (
          <li key={r.name} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,8rem)_1fr_13rem]">
            <span className="truncate">{r.name}</span>
            <span className="relative order-last col-span-2 h-3 sm:order-none sm:col-span-1" aria-hidden>
              <span className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded bg-[var(--rule)]" />
              {lwm != null && <span className="absolute top-0 h-3 w-[2px] -translate-x-1/2 bg-[var(--chart-cmp)]" style={{ left: x(lwm) }} />}
              <span className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--text)]" style={{ left: x(m) }} />
            </span>
            <span className="text-right leading-tight"><span className="tabular-nums">{hhmm(r.at)}</span>
              <span className="block text-[13px] text-[var(--muted)]">{gap == null ? `did not sell out last ${day}` : gap === 0 ? `same time as last ${day}` : `${Math.floor(Math.abs(gap) / 60) ? `${Math.floor(Math.abs(gap) / 60)} h ` : ""}${Math.abs(gap) % 60} m ${gap > 0 ? "earlier" : "later"} than last ${day}`}</span></span>
          </li>);
      })}</ul>
      <div className="mt-3 grid grid-cols-1 gap-4 text-xs text-[var(--muted)] tabular-nums sm:grid-cols-[minmax(0,8rem)_1fr_13rem]" aria-hidden><span className="hidden sm:block" /><span className="flex justify-between"><span>{String(OPEN_H).padStart(2, "0")}:00</span><span>15:00</span><span>{CLOSE_H}:00</span></span><span className="hidden sm:block" /></div>
    </div>
  );
}
