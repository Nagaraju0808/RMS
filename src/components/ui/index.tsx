"use client";
// Small shadcn/ui-style component set (hand-written, same API style, no CLI needed).
import * as React from "react";
import { cn } from "@/lib/utils";

type BtnVariant = "default" | "outline" | "ghost" | "danger" | "success" | "secondary";
const variants: Record<BtnVariant, string> = {
  default: "bg-brand-600 text-white hover:bg-brand-700",
  outline: "border border-app bg-transparent hover:bg-black/5 dark:hover:bg-white/5",
  ghost: "hover:bg-black/5 dark:hover:bg-white/5",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-green-600 text-white hover:bg-green-700",
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white",
};
export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" | "xl" }>(
  ({ className, variant = "default", size = "md", ...p }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none",
      size === "sm" && "h-8 px-3 text-sm", size === "md" && "h-10 px-4", size === "lg" && "h-12 px-5 text-lg", size === "xl" && "h-16 px-6 text-xl",
      variants[variant], className)} {...p} />
  ));
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn("h-10 w-full rounded-lg border border-app bg-card px-3 outline-none focus:ring-2 focus:ring-brand-500", className)} {...p} />
));
Input.displayName = "Input";

export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cn("w-full rounded-lg border border-app bg-card p-3 outline-none focus:ring-2 focus:ring-brand-500", p.className)} />
);
export const Select = ({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={cn("h-10 w-full rounded-lg border border-app bg-card px-3", className)} {...p} />
);
export const Label = ({ className, ...p }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("mb-1 block text-sm font-medium", className)} {...p} />
);
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={cn("card p-4", className)} {...p} />;
export const Badge = ({ className, color = "slate", ...p }: React.HTMLAttributes<HTMLSpanElement> & { color?: string }) => {
  const c: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", green: "bg-green-100 text-green-800", red: "bg-red-100 text-red-800",
    orange: "bg-orange-100 text-orange-800", blue: "bg-blue-100 text-blue-800", yellow: "bg-yellow-100 text-yellow-800", purple: "bg-purple-100 text-purple-800",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", c[color] || c.slate, className)} {...p} />;
};
export function Dialog({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className={cn("card max-h-[90vh] w-full overflow-auto p-5", wide ? "max-w-3xl" : "max-w-md")} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none muted">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
export function Table({ head, rows, empty = "Nothing here yet." }: { head: React.ReactNode[]; rows: React.ReactNode[][]; empty?: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-app text-left">{head.map((h, i) => <th key={i} className="p-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className="p-4 muted" colSpan={head.length}>{empty}</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-b border-app last:border-0">{r.map((c, j) => <td key={j} className="p-2 align-top">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-app p-1">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn("rounded-md px-3 py-1.5 text-sm", value === o.value ? "bg-brand-600 text-white" : "hover:bg-black/5")}>{o.label}</button>
      ))}
    </div>
  );
}
export function useToast() {
  const [msg, setMsg] = React.useState<{ text: string; kind: "ok" | "err" } | null>(null);
  React.useEffect(() => { if (msg) { const t = setTimeout(() => setMsg(null), 3500); return () => clearTimeout(t); } }, [msg]);
  const node = msg ? (
    <div role="status" className={cn("fixed bottom-4 right-4 z-[60] rounded-lg px-4 py-3 text-white shadow-lg", msg.kind === "ok" ? "bg-green-600" : "bg-red-600")}>{msg.text}</div>
  ) : null;
  return { toast: (text: string, kind: "ok" | "err" = "ok") => setMsg({ text, kind }), node };
}
