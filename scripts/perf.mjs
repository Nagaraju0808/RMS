// Performance check: logs in as the demo owner and times the heaviest screens' API calls.
// Usage: node scripts/perf.mjs http://localhost:3001   (5 runs each; prints median and worst in ms)
const base = process.argv[2] || "http://localhost:3000";
const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "owner@demo.com", password: "password123" }) });
const cookie = login.headers.get("set-cookie").split(";")[0];
const from = new Date(Date.now() - 89 * 86400_000).toISOString().slice(0, 10), to = new Date().toISOString().slice(0, 10);
const urls = ["/api/dashboard", "/api/orders?active=1", "/api/orders?status=PAID&limit=200", "/api/kitchen", "/api/tables", "/api/menu", "/api/bills",
  ...["sales", "items", "categories", "hourly", "payments", "discounts", "cancellations", "gst", "staff", "inventory", "profit", "branches"].map((r) => `/api/reports/${r}?from=${from}&to=${to}`),
  `/api/reports/sales?from=${from}&to=${to}&format=xlsx`, `/api/reports/profit?from=${from}&to=${to}&format=pdf`,
  "/api/smart/forecast", "/api/smart/purchase", "/api/smart/menu", "/api/smart/reviews", "/api/customers", "/api/feedback", "/api/audit", "/api/inventory"];
const rows = [];
for (const u of urls) {
  const t = [];
  let status = 0;
  for (let i = 0; i < 5; i++) { const s = performance.now(); const r = await fetch(base + u, { headers: { cookie } }); await r.arrayBuffer(); status = r.status; t.push(performance.now() - s); }
  t.sort((a, b) => a - b);
  rows.push({ url: u.replace(/\?from=.*?&to=[\d-]+/, " (90 days)"), status, median: Math.round(t[2]), worst: Math.round(t[4]) });
}
console.table(rows);
const slow = rows.filter((r) => r.median > 500);
console.log(slow.length ? `SLOW (>500 ms): ${slow.map((r) => r.url).join(", ")}` : "All endpoints under 500 ms (median).");
