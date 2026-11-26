import { describe, it, expect } from "vitest";
import { enqueue, memoryStore, syncOutbox, OutboxEntry } from "@/lib/offline/outbox-core";

const order = (id: string, t: number) => ({ id, kind: "order" as const, url: "/api/orders", method: "POST" as const, body: { clientId: id }, label: id, createdAt: t });
describe("offline outbox", () => {
  it("double taps never queue twice", async () => {
    const s = memoryStore();
    await enqueue(s, order("a", 1)); await enqueue(s, order("a", 2));
    expect(await s.all()).toHaveLength(1);
  });
  it("replays oldest first and removes sent entries", async () => {
    const s = memoryStore(); const seen: string[] = [];
    await enqueue(s, order("b", 2)); await enqueue(s, order("a", 1));
    const r = await syncOutbox(s, async (e) => { seen.push(e.id); return { status: 201 }; });
    expect(seen).toEqual(["a", "b"]); expect(r.sent).toEqual(["a", "b"]); expect(await s.all()).toHaveLength(0);
  });
  it("stops on network error and keeps order (no skipping ahead)", async () => {
    const s = memoryStore(); const seen: string[] = [];
    for (const [id, t] of [["a", 1], ["b", 2], ["c", 3]] as const) await enqueue(s, order(id, t));
    const r = await syncOutbox(s, async (e) => { seen.push(e.id); return e.id === "b" ? { networkError: true } : { status: 201 }; });
    expect(seen).toEqual(["a", "b"]); expect(r.stoppedByNetwork).toBe(true); expect(r.remaining).toBe(2);
    expect((await s.all()).map((e) => e.id).sort()).toEqual(["b", "c"]);
    expect((await s.all()).find((e) => e.id === "b")!.attempts).toBe(1);
  });
  it("server errors are retried later; refusals are reported and dropped", async () => {
    const s = memoryStore();
    await enqueue(s, order("a", 1)); await enqueue(s, order("b", 2));
    const r1 = await syncOutbox(s, async (e) => (e.id === "a" ? { status: 400, error: "Paneer Tikka is not available right now." } : { status: 503 }));
    expect(r1.failed[0].error).toMatch(/not available/); expect(r1.remaining).toBe(1);
    expect((await s.all()).map((e) => e.id)).toEqual(["b"]);
  });
  it("a repeated kitchen change that the server refuses counts as done", async () => {
    const s = memoryStore();
    await enqueue(s, { id: "k1", kind: "kitchen", url: "/api/kitchen/items/x", method: "POST", body: { status: "READY" }, label: "x" });
    const r = await syncOutbox(s, async () => ({ status: 400, error: "Cannot change to READY." }));
    expect(r.sent).toEqual(["k1"]); expect(r.failed).toHaveLength(0);
  });
  it("replaying the same order twice is safe because the server dedupes on clientId", async () => {
    const server = new Map<string, number>(); let created = 0;
    const send = async (e: OutboxEntry) => { const id = (e.body as any).clientId; if (!server.has(id)) { server.set(id, ++created); return { status: 201 }; } return { status: 200 }; };
    const s = memoryStore(); await enqueue(s, order("x", 1));
    await send((await s.all())[0]); // the request reached the server but the reply was lost…
    await syncOutbox(s, send);       // …so it is sent again
    expect(created).toBe(1);
  });
});
