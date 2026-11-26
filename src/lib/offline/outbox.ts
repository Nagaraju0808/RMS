"use client";
// Browser side of the offline outbox: IndexedDB storage, sending, automatic sync when the internet comes back.
import { enqueue, memoryStore, OutboxEntry, OutboxStore, syncOutbox, SyncReport } from "./outbox-core";

const DB = "dineflow-offline", STORE = "outbox";
function idbStore(): OutboxStore {
  if (typeof indexedDB === "undefined") return memoryStore();
  const db = new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "id" });
    r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
  });
  const tx = async <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) => {
    const d = await db;
    return new Promise<T>((resolve, reject) => { const q = fn(d.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => resolve(q.result); q.onerror = () => reject(q.error); });
  };
  return {
    all: () => tx<OutboxEntry[]>("readonly", (s) => s.getAll() as IDBRequest<OutboxEntry[]>),
    put: async (e) => { await tx("readwrite", (s) => s.put(e)); },
    remove: async (id) => { await tx("readwrite", (s) => s.delete(id)); },
  };
}
let store: OutboxStore | null = null;
const getStore = () => (store ??= idbStore());

type Listener = (s: { pending: OutboxEntry[]; lastReport: SyncReport | null; online: boolean }) => void;
const listeners = new Set<Listener>();
let lastReport: SyncReport | null = null;
async function notify() {
  const pending = await getStore().all();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  listeners.forEach((l) => l({ pending, lastReport, online }));
}
export function subscribeOutbox(l: Listener) { listeners.add(l); notify(); return () => { listeners.delete(l); }; }

/** Is this error "the request never reached the server"? */
export const isNetworkError = (e: unknown) => e instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);

export async function queueRequest(e: Omit<OutboxEntry, "attempts" | "createdAt">) {
  const entry = await enqueue(getStore(), e);
  notify();
  return entry;
}

let syncing = false;
export async function syncNow(): Promise<SyncReport | null> {
  if (syncing) return null;
  syncing = true;
  try {
    lastReport = await syncOutbox(getStore(), async (e) => {
      try {
        const r = await fetch(e.url, { method: e.method, headers: { "Content-Type": "application/json", "X-Offline-Replay": "1" }, body: JSON.stringify(e.body) });
        const d = await r.json().catch(() => ({}));
        return { status: r.status, error: d.error };
      } catch { return { networkError: true as const }; }
    });
    return lastReport;
  } finally { syncing = false; notify(); }
}

let started = false;
/** Call once (in the app shell): sync when the browser comes back online and every 20 s while entries wait. */
export function startOutboxSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => { notify(); syncNow(); });
  window.addEventListener("offline", notify);
  setInterval(async () => { if (navigator.onLine && (await getStore().all()).length) syncNow(); }, 20_000);
  if (navigator.onLine) syncNow();
}
