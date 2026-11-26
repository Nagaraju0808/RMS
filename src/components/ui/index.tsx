"use client";
// DineFlow UI kit – shadcn-style API, styled to the "Framed sheet" app rules:
// flat surfaces (no shadow at rest), 1px edges, ink primary action, underline tabs, pale status pills.
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type BtnVariant = "default" | "outline" | "ghost" | "danger" | "success" | "secondary";
const variants: Record<BtnVariant, string> = {
  default: "bg-[var(--ink-fill)] text-[var(--on-ink)] hover:bg-[var(--ink-fill-hover)]",
  outline: "border border-[var(--control)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--raised)]",
  ghost: "text-[var(--text)] hover:bg-[var(--raised)]",
  danger: "bg-[var(--negative)] text-white hover:opacity-90",
  success: "bg-[var(--positive)] text-white hover:opacity-90",
  secondary: "bg-[var(--active)] text-[var(--text)] hover:bg-[var(--control)]",
};
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" | "xl" }>(
  ({ className, variant = "default", size = "md", ...p }, ref) => (
    <button ref={ref} className={cn("inline-flex select-none items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-[background-color,transform,opacity] duration-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
      size === "sm" && "h-8 px-3 text-[13px]", size === "md" && "h-9 px-4", size === "lg" && "h-12 px-5 text-base", size === "xl" && "h-16 px-6 text-lg",
      variants[variant], className)} {...p} />
  ));
Button.displayName = "Button";

const field = "w-full rounded-[var(--radius-control)] border border-[var(--control)] bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--pill-info-bg)]";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("h-9 px-3", field, className)} {...p} />
));
Input.displayName = "Input";
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cn("p-3", field, p.className)} />;
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn("h-9 px-2.5", field, className)} {...p} />;
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => <label className={cn("mb-1 block text-[13px] font-medium text-[var(--muted)]", className)} {...p} />;
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("card p-5", className)} {...p} />;

const PILL: Record<string, string> = {
  slate: "bg-[var(--pill-neutral-bg)] text-[var(--pill-neutral-ink)]", green: "bg-[var(--pill-positive-bg)] text-[var(--pill-positive-ink)]",
  red: "bg-[var(--pill-negative-bg)] text-[var(--pill-negative-ink)]", orange: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]",
  yellow: "bg-[var(--pill-warning-bg)] text-[var(--pill-warning-ink)]", blue: "bg-[var(--pill-info-bg)] text-[var(--pill-info-ink)]", purple: "bg-[var(--pill-info-bg)] text-[var(--pill-info-ink)]",
};
export const Badge = ({ className, color = "slate", ...p }: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) =>
  <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", PILL[color] || PILL.slate, className)} {...p} />;

export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  React.useEffect(() => { if (!open) return; const h = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn("max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-[var(--surface)] p-5 shadow-[0_16px_48px_rgba(0,0,0,.18)] sm:rounded-2xl", wide ? "sm:max-w-3xl" : "sm:max-w-md")} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--raised)]"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function PageHeader({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-[22px] font-semibold leading-7">{title}</h1>{sub && <p className="mt-1 text-[var(--muted)]">{sub}</p>}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
/** Tables are rules and alignment: no zebra, no header band, numbers right-aligned (pass align). */
export function Table({ head, rows, empty = "Nothing here yet.", align }: { head: React.ReactNode[]; rows: React.ReactNode[][]; empty?: string; align?: ("left" | "right")[] }) {
  const isNum = (c: React.ReactNode) => typeof c === "number" || (typeof c === "string" && /^[−\-+]?₹?[\d,]+(\.\d+)?%?$/.test(c.trim()));
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-[var(--border)]">{head.map((h, i) => <th key={i} className={cn("h-10 px-4 font-medium text-[var(--muted)]", align?.[i] === "right" ? "text-right" : "text-left")}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className="px-4 py-6 text-[var(--muted)]" colSpan={head.length}>{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-b border-[var(--rule)] last:border-0 hover:bg-[var(--raised)]">{r.map((c, j) => <td key={j} className={cn("px-4 py-2.5 align-middle", (align?.[j] ?? (isNum(c) ? "right" : "left")) === "right" && "text-right tabular-nums")}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
/** Underline tabs (2px ink rule on the selected one). */
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" className="mb-5 flex gap-5 overflow-x-auto border-b border-[var(--border)]">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cn("-mb-px shrink-0 border-b-2 pb-2.5 pt-1 text-sm transition-colors", value === o.value ? "border-[var(--text)] font-medium text-[var(--text)]" : "border-transparent text-[var(--muted)] hover:text-[var(--text)]")}>{o.label}</button>
      ))}
    </div>
  );
}
export function useToast() {
  const [msg, setMsg] = React.useState<{ text: string; kind: "ok" | "err" } | null>(null);
  React.useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); } }, [msg]);
  const node = msg ? (
    <div role="status" className={cn("fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-[0_8px_24px_rgba(0,0,0,.2)]", msg.kind === "ok" ? "bg-[var(--ink-fill)] text-[var(--on-ink)]" : "bg-[var(--negative)] text-white")}>{msg.text}</div>
  ) : null;
  return { toast: (text: string, kind: "ok" | "err" = "ok") => setMsg({ text, kind }), node };
}
