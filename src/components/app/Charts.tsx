"use client";
// Small dependency-free SVG charts: thin marks, rounded bar ends, recessive grid, hover tooltip.
import * as React from "react";

const fmtK = (v: number, money?: boolean) => { const x = money ? v / 100 : v; const s = Math.abs(x) >= 100000 ? `${(x / 100000).toFixed(1)}L` : Math.abs(x) >= 1000 ? `${(x / 1000).toFixed(1)}k` : `${Math.round(x)}`; return money ? `₹${s}` : s; };
const full = (v: number, money?: boolean) => (money ? "₹" + (v / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : v.toLocaleString("en-IN"));
/** Measure the container so the SVG is drawn 1:1 – text stays at its real size at every width. */
function useWidth(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [w, setW] = React.useState(640);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))));
    ro.observe(ref.current); return () => ro.disconnect();
  }, []);
  return [ref, w];
}
function ticks(max: number) { const step = Math.pow(10, Math.floor(Math.log10(Math.max(1, max)))); const m = Math.ceil(max / step) * step || 1; return [0, m / 2, m]; }

export function BarChart({ data, x, y, money, height = 220, label }: { data: any[]; x: string; y: string; money?: boolean; height?: number; label: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const [ref, W] = useWidth();
  if (!data.length) return <p className="p-6 text-center text-sm muted">No data for this period.</p>;
  const H = height, L = 52, B = 30, T = 10;
  const vals = data.map((d) => Number(d[y]) || 0); const t = ticks(Math.max(...vals)); const max = t[2];
  const bw = (W - L) / data.length, barW = Math.max(2, Math.min(40, bw - 2));
  const showEvery = Math.ceil(data.length / Math.max(4, Math.floor(W / 70)));
  return (
    <div className="relative" ref={ref}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={label}>
        {t.map((v) => { const yy = T + (H - T - B) * (1 - v / max); return <g key={v}><line x1={L} x2={W} y1={yy} y2={yy} stroke="var(--chart-grid)" /><text x={L - 6} y={yy + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{fmtK(v, money)}</text></g>; })}
        {data.map((d, i) => {
          const v = vals[i], h = Math.max(v > 0 ? 2 : 0, ((H - T - B) * v) / max), xx = L + i * bw + (bw - barW) / 2, yy = H - B - h, r = Math.min(4, barW / 2, h);
          return <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
            <path d={`M${xx},${H - B} V${yy + r} Q${xx},${yy} ${xx + r},${yy} H${xx + barW - r} Q${xx + barW},${yy} ${xx + barW},${yy + r} V${H - B} Z`} fill="var(--chart-1)" opacity={hover == null || hover === i ? 1 : 0.55} />
            {i % showEvery === 0 && <text x={xx + barW / 2} y={H - B + 14} textAnchor="middle" fontSize="12" fill="var(--muted)">{/^\d{4}-\d{2}-\d{2}$/.test(String(d[x])) ? `${String(d[x]).slice(8)}/${String(d[x]).slice(5, 7)}` : String(d[x]).slice(0, data.length > 12 ? 5 : 12)}</text>}
          </g>;
        })}
      </svg>
      {hover != null && <div className="pointer-events-none absolute top-0 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow" style={{ left: `${Math.min(80, ((L + hover * bw) / W) * 100)}%` }}><b>{String(data[hover][x])}</b><br />{full(vals[hover], money)}</div>}
    </div>
  );
}

/** Two-series line (e.g. today vs same day last week). Legend + direct end labels; second series dashed. */
export function LineChart({ data, x, series, money, height = 220, label }: { data: any[]; x: string; series: { key: string; label: string }[]; money?: boolean; height?: number; label: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  const [ref, W] = useWidth();
  const H = height, L = 52, B = 28, T = 10, R = 24;
  const max = ticks(Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))))[2];
  const every = Math.max(1, Math.ceil(data.length / Math.max(3, Math.floor((W - L - R) / 80))));
  const px = (i: number) => L + ((W - L - R) * i) / Math.max(1, data.length - 1), py = (v: number) => T + (H - T - B) * (1 - v / max);
  const colors = ["var(--chart-1)", "var(--chart-cmp)"];
  return (
    <div className="relative" ref={ref}>
      <div className="mb-2 flex gap-4 text-xs text-[var(--muted)]">{series.map((s, i) => <span key={s.key} className="flex items-center gap-1"><svg width="18" height="6"><line x1="0" x2="18" y1="3" y2="3" stroke={colors[i]} strokeWidth="2" strokeDasharray={i ? "4 3" : undefined} /></svg>{s.label}</span>)}</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block" role="img" aria-label={label} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = (e.currentTarget as SVGElement).getBoundingClientRect(); const xx = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(data.length - 1, Math.round(((xx - L) / (W - L - R)) * (data.length - 1))))); }}>
        {ticks(max).map((v) => <g key={v}><line x1={L} x2={W - R} y1={py(v)} y2={py(v)} stroke="var(--chart-grid)" /><text x={L - 6} y={py(v) + 4} textAnchor="end" fontSize="12" fill="var(--muted)">{fmtK(v, money)}</text></g>)}
        {data.map((d, i) => i % every === 0 && <text key={i} x={px(i)} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--muted)">{d[x]}</text>)}
        {(() => { const last = data[data.length - 1]; const lastIdx = (k: string) => { for (let i = data.length - 1; i >= 0; i--) if (data[i][k] != null) return i; return 0; };
          const ends = series.map((s) => lastIdx(s.key));
          const ys = series.map((s, i) => py(Number(data[ends[i]][s.key]) || 0));
          if (ends.length === 2 && ends[0] === ends[1] && Math.abs(ys[0] - ys[1]) < 14) { if (ys[0] <= ys[1]) ys[1] = ys[0] + 14; else ys[0] = ys[1] + 14; }           return series.map((s, si) => { const pts = data.map((d, i) => (d[s.key] == null ? null : `${px(i)},${py(Number(d[s.key]) || 0)}`)).filter(Boolean).join(" ");
          return <g key={s.key}><polyline points={pts} fill="none" stroke={colors[si]} strokeWidth="2" strokeDasharray={si ? "5 4" : undefined} strokeLinejoin="round" />
            <text x={px(ends[si]) > W - R - 110 ? px(ends[si]) - 6 : px(ends[si]) + 8} textAnchor={px(ends[si]) > W - R - 110 ? "end" : "start"} y={Math.max(T + 12, Math.min(H - B - 4, ys[si] - 8))} fontSize="12" fill="var(--muted)">{s.label}</text></g>; }); })()}
        {hover != null && <g><line x1={px(hover)} x2={px(hover)} y1={T} y2={H - B} stroke="currentColor" opacity={0.3} strokeDasharray="3 3" />{series.filter((s) => data[hover][s.key] != null).map((s, si) => <circle key={s.key} cx={px(hover)} cy={py(Number(data[hover][s.key]) || 0)} r="4" fill={colors[si]} stroke="var(--card)" strokeWidth="2" />)}</g>}
      </svg>
      {hover != null && <div className="pointer-events-none absolute top-6 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow" style={{ left: `${Math.min(75, (px(hover) / W) * 100)}%` }}><b>{data[hover][x]}</b>{series.map((s) => <div key={s.key}>{s.label}: {data[hover][s.key] == null ? "–" : full(Number(data[hover][s.key]) || 0, money)}</div>)}</div>}
    </div>
  );
}
