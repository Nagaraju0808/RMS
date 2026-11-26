// "Smart" features built on simple statistics. They always work; the AI service only adds plain-English explanations.

/** Daily sales per item → forecast for the next `days` days using the same weekday average of recent weeks plus trend. */
export function forecastItem(daily: { date: string; qty: number }[], startDate: Date, days = 7, weeks = 4) {
  const byDate = new Map(daily.map((d) => [d.date, d.qty]));
  const key = (d: Date) => d.toLocaleDateString("en-CA");
  // trend: last 14 days vs previous 14 days (capped ±30%)
  const sumRange = (from: number, to: number) => { let s = 0; for (let i = from; i < to; i++) { const d = new Date(startDate); d.setDate(d.getDate() - i - 1); s += byDate.get(key(d)) ?? 0; } return s; };
  const recent = sumRange(0, 14), before = sumRange(14, 28);
  const trend = before > 0 ? Math.max(-0.3, Math.min(0.3, (recent - before) / before)) : 0;
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(startDate); day.setDate(day.getDate() + i);
    const samples: number[] = [];
    for (let w = 1; w <= weeks; w++) { const d = new Date(day); d.setDate(d.getDate() - 7 * w); if (d < startDate) samples.push(byDate.get(key(d)) ?? 0); }
    const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0;
    return { date: key(day), qty: Math.round(avg * (1 + trend) * 10) / 10 };
  });
}
export function trendPercent(daily: { date: string; qty: number }[], startDate: Date) {
  const sum = (from: number, to: number) => daily.filter((d) => { const t = (startDate.getTime() - new Date(d.date + "T00:00:00").getTime()) / 86400_000; return t > from && t <= to; }).reduce((a, d) => a + d.qty, 0);
  const a = sum(0, 7), b = sum(7, 14);
  return b ? Math.round(((a - b) / b) * 100) : 0;
}

/** Purchase suggestion: forecast use (from recipes) + safety stock − current stock, rounded up to a buying unit. */
export function purchaseNeed(forecastUse: number, stock: number, safetyPercent = 20, roundTo = 1): number {
  const need = forecastUse * (1 + safetyPercent / 100) - Math.max(0, stock);
  return need <= 0 ? 0 : Math.ceil(need / roundTo) * roundTo;
}

export const MENU_ADVICE = {
  Star: "Popular and profitable – keep it, feature it on the menu and keep quality steady.",
  Plowhorse: "Popular but earns little – raise the price a little or reduce portion cost (recipe).",
  Puzzle: "Profitable but few people order it – promote it, rename it, or ask waiters to suggest it.",
  Dog: "Not popular and earns little – think about removing it or reworking it.",
} as const;

// ── Reviews (fallback summary without AI) ──
const THEMES: Record<string, string[]> = {
  "Food taste": ["tasty", "delicious", "loved", "excellent", "great food", "crispy", "yummy", "bland", "taste"],
  "Food temperature": ["cold", "hot", "warm"],
  "Speed of service": ["slow", "late", "wait", "quick", "fast", "delay"],
  "Staff behaviour": ["polite", "rude", "friendly", "waiter", "service", "staff"],
  "Spice level": ["spicy", "too spicy", "mild"],
  "Ambience": ["ambience", "clean", "dirty", "noisy", "music"],
  "Price / value": ["expensive", "price", "value", "cheap", "costly"],
};
const NEG = ["cold", "slow", "late", "rude", "bland", "dirty", "noisy", "expensive", "costly", "too spicy", "delay", "bad", "worst"];
export function summarizeReviewsBasic(reviews: { rating: number; comment: string | null }[]) {
  const withText = reviews.filter((r) => r.comment?.trim());
  const points: { theme: string; mentions: number; sentiment: "positive" | "negative" | "mixed" }[] = [];
  for (const [theme, words] of Object.entries(THEMES)) {
    const hits = withText.filter((r) => words.some((w) => r.comment!.toLowerCase().includes(w)));
    if (!hits.length) continue;
    const neg = hits.filter((r) => r.rating <= 2 || NEG.some((w) => r.comment!.toLowerCase().includes(w))).length;
    points.push({ theme, mentions: hits.length, sentiment: neg === 0 ? "positive" : neg === hits.length ? "negative" : "mixed" });
  }
  points.sort((a, b) => b.mentions - a.mentions);
  const avg = reviews.length ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10 : 0;
  return { average: avg, count: reviews.length, points };
}

// ── Upsell: items often ordered together ──
export function coOccurrence(orders: string[][], ids: string[], limit = 3): { id: string; score: number }[] {
  const count = new Map<string, number>(); const base = new Set(ids);
  let support = 0;
  for (const o of orders) {
    if (!o.some((x) => base.has(x))) continue; support++;
    for (const x of new Set(o)) if (!base.has(x)) count.set(x, (count.get(x) ?? 0) + 1);
  }
  return [...count.entries()].filter(([, c]) => c >= 2).map(([id, c]) => ({ id, score: Math.round((c / Math.max(1, support)) * 100) / 100 })).sort((a, b) => b.score - a.score).slice(0, limit);
}

// ── Voice order parsing (fallback without AI) ──
const NUM: Record<string, number> = { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, ek: 1, do: 2, teen: 3, char: 4, okati: 1, rendu: 2, moodu: 3 };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/** "two butter naan and one paneer tikka half" → [{menuItemId, variantId, quantity}] */
export function parseVoiceOrder(text: string, items: { id: string; name: string; variants: { id: string; name: string }[] }[]) {
  const parts = text.toLowerCase().split(/,|;| and | plus | aur | mariyu /).map((p) => norm(p)).filter(Boolean);
  const out: { menuItemId: string; variantId: string | null; quantity: number; heard: string; name: string }[] = [];
  const unknown: string[] = [];
  for (const p of parts) {
    const words = p.split(" ");
    let qty = 1;
    if (/^\d+$/.test(words[0])) { qty = Number(words.shift()); } else if (words[0] in NUM) { qty = NUM[words.shift()!]; }
    const rest = words.join(" ");
    let best: { item: (typeof items)[number]; score: number } | null = null;
    for (const it of items) {
      const nameWords = norm(it.name).split(" ").filter((w) => w.length > 1 && !/^\d+$/.test(w) && w !== "pcs");
      const hit = nameWords.filter((w) => rest.includes(w)).length;
      const cover = nameWords.length ? hit / nameWords.length : 0;
      const score = cover >= 0.5 || hit >= 2 ? hit + cover : 0; // more matching words win, then coverage
      if (hit && (!best || score > best.score)) best = { item: it, score };
    }
    if (!best || best.score <= 0) { unknown.push(p); continue; }
    const v = best.item.variants.find((x) => rest.includes(norm(x.name))) ?? null;
    out.push({ menuItemId: best.item.id, variantId: v?.id ?? null, quantity: Math.min(99, Math.max(1, qty)), heard: p, name: best.item.name + (v ? ` (${v.name})` : "") });
  }
  return { items: out, unknown };
}
