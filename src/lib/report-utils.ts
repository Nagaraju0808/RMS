// Pure helpers for reports (unit-tested).
export type Col = { key: string; label: string; type?: "money" | "number" | "text" | "percent" };
export type Report = { title: string; columns: Col[]; rows: Record<string, any>[]; chart?: { x: string; y: string; kind: "bar" | "line" }; totals?: Record<string, any> };

export function pctChange(now: number, before: number): number | null {
  if (!before) return now ? null : 0;
  return Math.round(((now - before) / before) * 1000) / 10;
}
/** Parse ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). Default last 30 days. Max 400 days. */
export function parseRange(from?: string | null, to?: string | null, now = new Date()): { from: Date; to: Date } {
  const end = to ? new Date(to + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = from ? new Date(from + "T00:00:00") : new Date(end.getTime() - 29 * 86400_000);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Dates are not valid.");
  if (start > end) throw new Error("Start date is after end date.");
  if ((end.getTime() - start.getTime()) / 86400_000 > 400) throw new Error("Choose 400 days or less.");
  return { from: start, to: new Date(end.getTime() + 86400_000) };
}
/** Make sure every hour 0–23 is present (busy-hours chart). */
export function fillHours(rows: { hour: number; orders: number; sales: number }[], days: number) {
  return Array.from({ length: 24 }, (_, h) => {
    const r = rows.find((x) => Number(x.hour) === h);
    return { hour: `${String(h).padStart(2, "0")}:00`, orders: r ? Number(r.orders) : 0, sales: r ? Number(r.sales) : 0, avgOrdersPerDay: r ? Math.round((Number(r.orders) / Math.max(1, days)) * 10) / 10 : 0 };
  });
}
export function sumBy(rows: Record<string, any>[], cols: Col[]) {
  return Object.fromEntries(cols.filter((c) => c.type === "money" || c.type === "number").map((c) => [c.key, rows.reduce((a, r) => a + Number(r[c.key] || 0), 0)]));
}
/** Format a cell for Excel/PDF/screen. Money is paise → rupees. */
export function cell(v: any, type?: Col["type"]): string | number {
  if (v == null) return "";
  if (type === "money") return Math.round(Number(v)) / 100;
  if (type === "percent") return `${v}%`;
  return v;
}
/** Menu engineering class from popularity and profit compared with averages. */
export function menuClass(qty: number, profitPerItem: number, avgQty: number, avgProfit: number): "Star" | "Plowhorse" | "Puzzle" | "Dog" {
  const popular = qty >= avgQty * 0.7, profitable = profitPerItem >= avgProfit;
  return popular && profitable ? "Star" : popular ? "Plowhorse" : profitable ? "Puzzle" : "Dog";
}
