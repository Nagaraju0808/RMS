// Bill maths. Everything in integer paise. Used by POS preview and the server when a bill is made.
import { discountAmount, isBillable } from "./orders";

export type BillLine = { id?: string; unitPrice: number; quantity: number; taxPercent: number; complimentary?: boolean; status?: string };
export type BillInput = {
  lines: BillLine[];
  discount?: { type: "PERCENT" | "FLAT" | null; value: number; maxDiscount?: number | null } | null;
  /** fixed discount amount in paise (used when a split bill gets its share of the order discount) */
  discountOverride?: number;
  serviceChargePercent?: number;
  packingCharge?: number;
  deliveryCharge?: number;
  interState?: boolean; // true → IGST, false → CGST + SGST
  roundOff?: boolean;
};
export type TaxGroup = { ratePercent: number; taxable: number; cgst: number; sgst: number; igst: number };
export type BillResult = {
  subtotal: number; discount: number; serviceCharge: number; packingCharge: number; deliveryCharge: number;
  taxable: number; cgst: number; sgst: number; igst: number; tax: number; roundOff: number; total: number; taxGroups: TaxGroup[];
};

/** Split `amount` across `weights` so the parts add up exactly (largest remainder method). */
export function allocate(amount: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (amount * w) / sum);
  const parts = raw.map(Math.floor);
  let rest = amount - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) parts[order[k][1]]++;
  return parts;
}

/**
 * GST rules used:
 * - Discount is applied before tax and spread over items in proportion to their value.
 * - Service, packing and delivery charges are part of the same supply, so they are taxed at the
 *   same rate(s) as the food, spread in proportion to each tax group's value.
 * - CGST = SGST = rate/2 each (so they are always equal). Inter-state uses IGST = full rate.
 * - Round-off to the nearest rupee is shown as its own line.
 */
export function computeBill(inp: BillInput): BillResult {
  const lines = inp.lines.filter(isBillable);
  const values = lines.map((l) => l.unitPrice * l.quantity);
  const subtotal = values.reduce((a, b) => a + b, 0);
  const discount = inp.discountOverride != null ? Math.min(inp.discountOverride, subtotal) : discountAmount(subtotal, inp.discount?.type, inp.discount?.value ?? 0, inp.discount?.maxDiscount);
  const lineDisc = allocate(discount, values);
  const net = values.map((v, i) => v - lineDisc[i]);
  const netTotal = subtotal - discount;
  const serviceCharge = inp.serviceChargePercent ? Math.round((netTotal * inp.serviceChargePercent) / 100) : 0;
  const packingCharge = inp.packingCharge ?? 0;
  const deliveryCharge = inp.deliveryCharge ?? 0;
  const charges = serviceCharge + packingCharge + deliveryCharge;

  const rates = [...new Set(lines.map((l) => l.taxPercent))].sort((a, b) => a - b);
  const groupNet = rates.map((r) => lines.reduce((s, l, i) => (l.taxPercent === r ? s + net[i] : s), 0));
  const groupCharges = allocate(charges, groupNet.some((g) => g > 0) ? groupNet : groupNet.map(() => 1));
  const taxGroups: TaxGroup[] = rates.map((r, i) => {
    const taxable = groupNet[i] + (groupCharges[i] ?? 0);
    if (inp.interState) return { ratePercent: r, taxable, cgst: 0, sgst: 0, igst: Math.round((taxable * r) / 100) };
    const half = Math.round((taxable * r) / 200);
    return { ratePercent: r, taxable, cgst: half, sgst: half, igst: 0 };
  });
  const cgst = taxGroups.reduce((s, g) => s + g.cgst, 0), sgst = taxGroups.reduce((s, g) => s + g.sgst, 0), igst = taxGroups.reduce((s, g) => s + g.igst, 0);
  const tax = cgst + sgst + igst;
  const taxable = netTotal + charges;
  const raw = taxable + tax;
  const total = inp.roundOff === false ? raw : Math.round(raw / 100) * 100;
  return { subtotal, discount, serviceCharge, packingCharge, deliveryCharge, taxable, cgst, sgst, igst, tax, roundOff: total - raw, total, taxGroups };
}

// ───────── Split bills ─────────
/** Equal split: every money field is split so the parts add up exactly to the full bill. */
export function splitEqual(full: BillResult, parts: number): BillResult[] {
  if (parts < 2 || parts > 50) throw new Error("Split into 2 to 50 parts.");
  const keys = ["subtotal", "discount", "serviceCharge", "packingCharge", "deliveryCharge", "taxable", "cgst", "sgst", "igst", "roundOff"] as const;
  const shares = Object.fromEntries(keys.map((k) => [k, allocate(Math.abs(full[k]), Array(parts).fill(1)).map((v) => (full[k] < 0 ? -v : v))])) as Record<(typeof keys)[number], number[]>;
  return Array.from({ length: parts }, (_, i) => {
    const r: any = Object.fromEntries(keys.map((k) => [k, shares[k][i]]));
    r.tax = r.cgst + r.sgst + r.igst;
    r.total = r.taxable + r.tax + r.roundOff;
    r.taxGroups = full.taxGroups.map((g) => ({ ...g, taxable: Math.round(g.taxable / parts), cgst: Math.round(g.cgst / parts), sgst: Math.round(g.sgst / parts), igst: Math.round(g.igst / parts) }));
    return r as BillResult;
  });
}

/**
 * Split by items (or by person – each person is a group of item ids). Each group is billed on its own items.
 * The order-level discount and packing/delivery charges are shared in proportion to each group's value.
 * Every item must be in exactly one group.
 */
export function splitByItems(inp: BillInput, groups: string[][]): BillResult[] {
  const all = inp.lines.filter(isBillable).map((l) => l.id ?? "");
  const flat = groups.flat();
  if (new Set(flat).size !== flat.length) throw new Error("An item is in two groups.");
  const missing = all.filter((id) => !flat.includes(id));
  if (missing.length) throw new Error("Every item must be given to someone.");
  const full = computeBill(inp);
  const groupValues = groups.map((g) => inp.lines.filter((l) => g.includes(l.id ?? "") && isBillable(l)).reduce((s, l) => s + l.unitPrice * l.quantity, 0));
  const disc = allocate(full.discount, groupValues);
  const pack = allocate(full.packingCharge, groupValues);
  const del = allocate(full.deliveryCharge, groupValues);
  return groups.map((g, i) => computeBill({ ...inp, lines: inp.lines.filter((l) => g.includes(l.id ?? "")), discount: null, discountOverride: disc[i], packingCharge: pack[i], deliveryCharge: del[i] }));
}

/** Indian financial year label, e.g. April 2026 – March 2027 → "2627". */
export function fyLabel(d = new Date()): string {
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${String(y).slice(2)}${String(y + 1).slice(2)}`;
}
export function billNumber(seq: number, d = new Date()): string {
  return `${fyLabel(d)}/${String(seq).padStart(6, "0")}`;
}

// ───────── Payments ─────────
export type PayIn = { mode: string; amount: number };
/** How much is still due after these payments. Cash overpayment is change to return (not stored as paid). */
export function settle(total: number, alreadyPaid: number, payments: PayIn[]) {
  const due = Math.max(0, total - alreadyPaid);
  const nonCash = payments.filter((p) => p.mode !== "CASH").reduce((s, p) => s + p.amount, 0);
  const cash = payments.filter((p) => p.mode === "CASH").reduce((s, p) => s + p.amount, 0);
  if (nonCash > due) throw new Error("Card/UPI/wallet amount is more than the amount due.");
  const cashApplied = Math.min(cash, due - nonCash);
  return { applied: nonCash + cashApplied, change: cash - cashApplied, remaining: due - nonCash - cashApplied };
}

/** Day-end: expected cash in drawer. */
export function expectedCash(openingCash: number, cashIn: number, cashRefunds: number) {
  return openingCash + cashIn - cashRefunds;
}
