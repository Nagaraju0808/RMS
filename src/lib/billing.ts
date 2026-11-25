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
