// Menu business logic: price by channel, time-based availability, CSV import/export.
export type Channel = "DINE_IN" | "TAKEAWAY" | "DELIVERY" | "ONLINE" | "QR";
type Priced = { priceDineIn: number; priceTakeaway?: number | null; priceOnline?: number | null };

/** Price for an order channel. Takeaway/online fall back to dine-in price if not set. */
export function priceFor(p: Priced, channel: Channel): number {
  if (channel === "TAKEAWAY") return p.priceTakeaway ?? p.priceDineIn;
  if (channel === "DELIVERY" || channel === "ONLINE") return p.priceOnline ?? p.priceDineIn;
  return p.priceDineIn; // DINE_IN and QR (customer at table)
}

export type Schedule = { id: string; startTime: string; endTime: string; days: number[]; discountPercent?: number };
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };

/** Is a schedule active at `now`? Supports windows that cross midnight (e.g. 22:00–02:00). */
export function scheduleActive(s: Schedule, now: Date): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = toMin(s.startTime), end = toMin(s.endTime);
  if (start <= end) return s.days.includes(now.getDay()) && mins >= start && mins < end;
  // crosses midnight: after start counts for today, before end counts for previous day
  if (mins >= start) return s.days.includes(now.getDay());
  if (mins < end) return s.days.includes((now.getDay() + 6) % 7);
  return false;
}
/** Item with no schedules is always available; otherwise at least one schedule must be active. */
export function itemAvailable(item: { scheduleIds: string[]; inStock: boolean; active: boolean }, schedules: Schedule[], now = new Date()): boolean {
  if (!item.active || !item.inStock) return false;
  if (!item.scheduleIds.length) return true;
  return schedules.some((s) => item.scheduleIds.includes(s.id) && scheduleActive(s, now));
}
/** Happy-hour discount (largest active discount among the item's schedules). */
export function happyHourPercent(scheduleIds: string[], schedules: Schedule[], now = new Date()): number {
  return Math.max(0, ...schedules.filter((s) => scheduleIds.includes(s.id) && scheduleActive(s, now)).map((s) => s.discountPercent || 0));
}

// ── CSV ──
export const CSV_COLUMNS = ["category", "name", "description", "foodType", "spiceLevel", "allergens", "priceDineIn", "priceTakeaway", "priceOnline", "variants", "inStock", "taxPercent"] as const;
export type CsvRow = Record<(typeof CSV_COLUMNS)[number], string>;

/** Prices in CSV are in rupees ("249.50"); variants as "Half:180|Full:320". */
export type ParsedItem = {
  category: string; name: string; description?: string; foodType: "VEG" | "NON_VEG" | "EGG" | "VEGAN";
  spiceLevel: number; allergens: string[]; priceDineIn: number; priceTakeaway?: number; priceOnline?: number;
  variants: { name: string; priceDineIn: number }[]; inStock: boolean; taxPercent?: number;
};
const rp = (v: string | undefined) => { if (v == null || v.trim() === "") return undefined; const n = Number(v); if (!isFinite(n) || n < 0) throw new Error(`bad price "${v}"`); return Math.round(n * 100); };

export function parseMenuRows(rows: Partial<CsvRow>[]): { items: ParsedItem[]; errors: string[] } {
  const items: ParsedItem[] = []; const errors: string[] = [];
  rows.forEach((r, i) => {
    const line = i + 2; // header is line 1
    try {
      if (!r.name?.trim()) throw new Error("name is empty");
      if (!r.category?.trim()) throw new Error("category is empty");
      const ft = (r.foodType || "VEG").trim().toUpperCase().replace("-", "_");
      if (!["VEG", "NON_VEG", "EGG", "VEGAN"].includes(ft)) throw new Error(`foodType must be VEG, NON_VEG, EGG or VEGAN`);
      const price = rp(r.priceDineIn);
      if (price == null) throw new Error("priceDineIn is required");
      const variants = (r.variants || "").split("|").map((v) => v.trim()).filter(Boolean).map((v) => {
        const [name, p] = v.split(":");
        const pr = rp(p); if (!name || pr == null) throw new Error(`bad variant "${v}" (use Name:price)`);
        return { name: name.trim(), priceDineIn: pr };
      });
      items.push({
        category: r.category.trim(), name: r.name.trim(), description: r.description?.trim() || undefined, foodType: ft as any,
        spiceLevel: Math.min(3, Math.max(0, parseInt(r.spiceLevel || "0") || 0)),
        allergens: (r.allergens || "").split(/[|;]/).map((a) => a.trim()).filter(Boolean),
        priceDineIn: price, priceTakeaway: rp(r.priceTakeaway), priceOnline: rp(r.priceOnline), variants,
        inStock: !["no", "false", "0"].includes((r.inStock || "yes").trim().toLowerCase()),
        taxPercent: r.taxPercent ? Number(r.taxPercent) : undefined,
      });
    } catch (e: any) { errors.push(`Line ${line}: ${e.message}`); }
  });
  return { items, errors };
}

export function menuToRows(items: { name: string; description?: string | null; foodType: string; spiceLevel: number; allergens: string[]; priceDineIn: number; priceTakeaway?: number | null; priceOnline?: number | null; inStock: boolean; category: { name: string }; variants: { name: string; priceDineIn: number }[]; taxRate?: { ratePercent: number } | null }[]): CsvRow[] {
  const r = (p?: number | null) => (p == null ? "" : (p / 100).toFixed(2));
  return items.map((i) => ({
    category: i.category.name, name: i.name, description: i.description || "", foodType: i.foodType, spiceLevel: String(i.spiceLevel),
    allergens: i.allergens.join("|"), priceDineIn: r(i.priceDineIn), priceTakeaway: r(i.priceTakeaway), priceOnline: r(i.priceOnline),
    variants: i.variants.map((v) => `${v.name}:${r(v.priceDineIn)}`).join("|"), inStock: i.inStock ? "yes" : "no",
    taxPercent: i.taxRate ? String(i.taxRate.ratePercent) : "",
  }));
}
