// Offline outbox – pure logic (no browser APIs), unit-tested in tests/unit/outbox.test.ts.
// Each entry is one API request saved while the internet was down. Entries are replayed in order.
// Safety against duplicates: new orders carry a clientId and the server returns the existing order for a repeated
// clientId; kitchen status changes are naturally repeat-safe (the server refuses a change that already happened).
export type OutboxEntry = {
  id: string;               // unique key (orders use their clientId)
  kind: "order" | "kitchen";
  url: string;
  method: "POST" | "PUT";
  body: unknown;
  label: string;            // what staff see in the offline banner ("Takeaway – 3 items")
  createdAt: number;
  attempts: number;
  lastError?: string;
};
export interface OutboxStore {
  all(): Promise<OutboxEntry[]>;
  put(e: OutboxEntry): Promise<void>;
  remove(id: string): Promise<void>;
}
export type SendResult = { status: number; error?: string } | { networkError: true };
export type SyncReport = { sent: string[]; failed: { entry: OutboxEntry; error: string }[]; remaining: number; stoppedByNetwork: boolean };

/** Add an entry; adding the same id twice keeps the first one (so double taps never queue twice). */
export async function enqueue(store: OutboxStore, e: Omit<OutboxEntry, "attempts" | "createdAt"> & { createdAt?: number }) {
  const existing = (await store.all()).find((x) => x.id === e.id);
  if (existing) return existing;
  const entry: OutboxEntry = { ...e, createdAt: e.createdAt ?? Date.now(), attempts: 0 };
  await store.put(entry);
  return entry;
}

/**
 * Replay entries oldest first.
 * - 2xx: done, removed.
 * - 4xx: the server will never accept it (item no longer on the menu, change already made…): removed and reported.
 *   Kitchen 400s mean "already in that state" and are treated as done.
 * - 5xx or no network: kept; sync stops so the order of requests is preserved.
 */
export async function syncOutbox(store: OutboxStore, send: (e: OutboxEntry) => Promise<SendResult>): Promise<SyncReport> {
  const entries = (await store.all()).sort((a, b) => a.createdAt - b.createdAt);
  const report: SyncReport = { sent: [], failed: [], remaining: 0, stoppedByNetwork: false };
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const r = await send(e);
    if ("networkError" in r) { report.stoppedByNetwork = true; report.remaining = entries.length - i; await store.put({ ...e, attempts: e.attempts + 1, lastError: "No internet" }); return report; }
    if (r.status >= 200 && r.status < 300) { await store.remove(e.id); report.sent.push(e.id); continue; }
    if (r.status >= 400 && r.status < 500 && r.status !== 401 && r.status !== 408 && r.status !== 429) {
      await store.remove(e.id);
      if (e.kind === "kitchen" && r.status === 400) report.sent.push(e.id); else report.failed.push({ entry: e, error: r.error || `Refused (${r.status})` });
      continue;
    }
    // 401 (logged out), 408/429 or 5xx: keep and try later, in the same order.
    await store.put({ ...e, attempts: e.attempts + 1, lastError: r.error || `Server error (${r.status})` });
    report.remaining = entries.length - i;
    return report;
  }
  return report;
}

/** In-memory store (tests, and fallback when IndexedDB is unavailable). */
export function memoryStore(): OutboxStore {
  const m = new Map<string, OutboxEntry>();
  return { all: async () => [...m.values()], put: async (e) => void m.set(e.id, e), remove: async (id) => void m.delete(id) };
}
