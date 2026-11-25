// Inventory maths (pure, unit-tested).
// Each ingredient is stored in a BASE unit: G (grams), ML (millilitres) or PCS (pieces).
// Ingredient.costPerUnit = paise per 1 kg (for G), per 1 litre (for ML) or per 1 piece (for PCS).
export type Unit = "G" | "KG" | "ML" | "L" | "PCS";
const FAMILY: Record<Unit, { base: "G" | "ML" | "PCS"; factor: number }> = {
  G: { base: "G", factor: 1 }, KG: { base: "G", factor: 1000 }, ML: { base: "ML", factor: 1 }, L: { base: "ML", factor: 1000 }, PCS: { base: "PCS", factor: 1 },
};
export const baseOf = (u: Unit) => FAMILY[u].base;
/** Convert a quantity to the ingredient's base unit. Throws for kg → pieces etc. */
export function toBase(qty: number, unit: Unit, base: Unit): number {
  const f = FAMILY[unit];
  if (f.base !== FAMILY[base].base) throw new Error(`Cannot convert ${unit} to ${base}.`);
  return (qty * f.factor) / FAMILY[base].factor;
}
/** Nice display: 1500 G → "1.5 kg". */
export function formatQty(qtyBase: number, base: Unit): string {
  const r = (n: number) => Math.round(n * 100) / 100;
  if (base === "G") return Math.abs(qtyBase) >= 1000 ? `${r(qtyBase / 1000)} kg` : `${r(qtyBase)} g`;
  if (base === "ML") return Math.abs(qtyBase) >= 1000 ? `${r(qtyBase / 1000)} L` : `${r(qtyBase)} ml`;
  return `${r(qtyBase)} pcs`;
}
/** Paise cost of `qtyBase` of an ingredient. */
export function costOf(qtyBase: number, base: Unit, costPerUnit: number): number {
  return Math.round(base === "PCS" ? qtyBase * costPerUnit : (qtyBase / 1000) * costPerUnit);
}

export type RecipeLine = { ingredientId: string; variantId: string | null; quantity: number; unit: Unit };
export type IngredientInfo = { id: string; unit: Unit; costPerUnit: number };
/** Ingredients used for `qty` portions. Lines for the chosen variant + lines shared by all variants (variantId null). */
export function usageFor(lines: RecipeLine[], ingredients: IngredientInfo[], variantId: string | null, qty: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines.filter((l) => l.variantId === null || l.variantId === variantId)) {
    const ing = ingredients.find((i) => i.id === l.ingredientId);
    if (!ing) continue;
    out.set(ing.id, (out.get(ing.id) ?? 0) + toBase(l.quantity, l.unit, ing.unit) * qty);
  }
  return out;
}
export function dishCost(lines: RecipeLine[], ingredients: IngredientInfo[], variantId: string | null = null): number {
  let total = 0;
  for (const [id, q] of usageFor(lines, ingredients, variantId, 1)) { const ing = ingredients.find((i) => i.id === id)!; total += costOf(q, ing.unit, ing.costPerUnit); }
  return total;
}
export const foodCostPercent = (cost: number, price: number) => (price > 0 ? Math.round((cost / price) * 1000) / 10 : 0);
export const isLow = (qty: number, reorderLevel: number) => reorderLevel > 0 && qty <= reorderLevel;
export function expiringSoon<T extends { expiryDate: Date | null; quantity: number }>(batches: T[], days: number, now = new Date()): T[] {
  const limit = now.getTime() + days * 86400_000;
  return batches.filter((b) => b.expiryDate && b.quantity > 0 && b.expiryDate.getTime() <= limit);
}
/** Purchase order status from received quantities. */
export function poStatus(lines: { quantity: number; received: number }[]): "ORDERED" | "PARTIAL" | "RECEIVED" {
  if (lines.every((l) => l.received >= l.quantity)) return "RECEIVED";
  return lines.some((l) => l.received > 0) ? "PARTIAL" : "ORDERED";
}
