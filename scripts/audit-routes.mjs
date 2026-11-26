// Security check: every API route must call requireSession() unless it is deliberately public.
// Run: node scripts/audit-routes.mjs   (exit code 1 if a route is unprotected)
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
const PUBLIC = [/^api\/public\//, /^api\/auth\/(login|pin|signup|logout|demo)\//, /^api\/health\//];
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f === "route.ts" && files.push(p); } };
walk("src/app/api");
let bad = 0;
for (const f of files.sort()) {
  const rel = f.replace(/^src\/app\//, "").replace(/route\.ts$/, "");
  const src = readFileSync(f, "utf8");
  const methods = [...src.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)/g)].map((m) => m[1]);
  const isPublic = PUBLIC.some((r) => r.test(rel));
  const guarded = /requireSession\(/.test(src);
  const usesHandler = /handler\(/.test(src) || /export async function/.test(src);
  const status = isPublic ? "public" : guarded ? "ok" : "MISSING requireSession";
  if (status.startsWith("MISSING")) bad++;
  console.log(`${status.padEnd(24)} ${methods.join(",").padEnd(18)} /${rel}${usesHandler ? "" : "  (no error handler)"}`);
}
console.log(`\n${files.length} routes checked, ${bad} unprotected.`);
process.exit(bad ? 1 : 0);
