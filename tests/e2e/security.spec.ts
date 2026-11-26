import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Every non-public API route must refuse a request without a login.
const routes: { path: string; methods: string[] }[] = [];
const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === "route.ts") routes.push({ path: "/" + p.replace(/^src\/app\//, "").replace(/\/route\.ts$/, "").replace(/\[[^\]]+\]/g, "x"), methods: [...readFileSync(p, "utf8").matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]) }); } };
walk("src/app/api");
const PUBLIC = /^\/api\/(public|auth\/(login|pin|signup|logout|demo))/;

test("all private API routes return 401 without a login", async ({ request }) => {
  const leaks: string[] = [];
  for (const r of routes.filter((r) => !PUBLIC.test(r.path))) for (const m of r.methods) {
    const res = await request.fetch(r.path, { method: m, data: m === "GET" ? undefined : {}, headers: { "content-type": "application/json" } });
    if (res.status() !== 401) leaks.push(`${m} ${r.path} → ${res.status()}`);
  }
  expect(leaks).toEqual([]);
});

async function loginAs(request: any, email: string) {
  const res = await request.post("/api/auth/login", { data: { email, password: "password123" } });
  expect(res.ok()).toBeTruthy();
}

test("another restaurant cannot read or change this restaurant's data", async ({ playwright, baseURL }) => {
  const demo = await playwright.request.newContext({ baseURL }); await loginAs(demo, "owner@demo.com");
  const other = await playwright.request.newContext({ baseURL }); await loginAs(other, "owner@other.com");
  const orders = await (await demo.get("/api/orders?status=PAID&limit=1")).json();
  const menu = await (await demo.get("/api/menu")).json();
  const id = orders[0].id, itemId = menu.items[0].id;
  expect((await other.get(`/api/orders/${id}`)).status()).toBe(404);
  expect((await other.post(`/api/orders/${id}/cancel`, { data: { reason: "hack attempt" } })).status()).toBe(404);
  expect((await other.patch(`/api/menu/items/${itemId}`, { data: { inStock: false } })).status()).toBe(404);
  const otherMenu = await (await other.get("/api/menu")).json();
  expect(otherMenu.items.find((i: any) => i.id === itemId)).toBeUndefined();
  const reps = await (await other.get("/api/reports/sales")).json();
  expect(reps.rows.length).toBe(0);
});

test("roles are enforced on the server", async ({ playwright, baseURL }) => {
  const waiter = await playwright.request.newContext({ baseURL }); await loginAs(waiter, "waiter@demo.com");
  expect((await waiter.get("/api/reports/sales")).status()).toBe(403);
  expect((await waiter.get("/api/staff")).status()).toBe(403);
  expect((await waiter.put("/api/settings", { data: { name: "Hacked" } })).status()).toBe(403);
  const chef = await playwright.request.newContext({ baseURL }); await loginAs(chef, "chef@demo.com");
  expect((await chef.post("/api/bills", { data: { orderId: "x" } })).status()).toBe(403);
});

test("cross-site requests and bad logins are refused", async ({ request }) => {
  const r = await request.post("/api/auth/login", { data: { email: "owner@demo.com", password: "password123" }, headers: { origin: "https://evil.example" } });
  expect(r.status()).toBe(403);
  const bad = await request.post("/api/auth/login", { data: { email: "owner@demo.com", password: "wrong" } });
  expect(bad.status()).toBe(401);
  expect((await request.get("/api/public/menu/not-a-real-token")).status()).toBe(404);
});
