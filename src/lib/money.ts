// All money is integer paise. These helpers never use floats for storage.
export function rupeesToPaise(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (!isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}
export function formatMoney(paise: number, currency = "INR"): string {
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2 }).format(paise / 100);
}
/** percent of an amount, rounded half-up to whole paise */
export function percentOf(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}
