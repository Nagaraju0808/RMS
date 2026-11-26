"use client";
// Tiny fetch wrapper for client components. Throws an Error with the server's message.
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}
export const rs = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** GET that remembers the last good answer on this device and falls back to it when there is no internet.
 *  Used by the screens that must keep working offline (POS menu, tables, kitchen, the logged-in user). */
export async function cachedApi<T = any>(url: string): Promise<T & { _offline?: boolean }> {
  const key = `df-cache:${url}`;
  try {
    const d = await api<T>(url);
    try { localStorage.setItem(key, JSON.stringify(d)); } catch {}
    return d as any;
  } catch (e) {
    if (e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine)) {
      try { const c = localStorage.getItem(key); if (c) { const v = JSON.parse(c); if (v && typeof v === "object" && !Array.isArray(v)) v._offline = true; return v; } } catch {}
    }
    throw e;
  }
}
