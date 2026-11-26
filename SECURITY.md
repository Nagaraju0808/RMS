# Security review (Phase 12)

Date: 26 Nov 2026. What was checked, what was fixed, and what is still open – in simple English.

## How the app protects data
| Area | How it works |
|---|---|
| Login | Passwords and PINs stored with bcrypt. 5 wrong passwords lock the account for 15 minutes. Login is rate-limited per IP; PIN login also per restaurant (30 tries/min). |
| Session | Signed token (JWT, HS256) in an httpOnly, SameSite=Lax cookie (Secure in production), 12 hours. **Every API call re-checks the user in the database**, so switching someone off or changing their role works immediately. |
| Permissions | Checked on the server in every private route (`requireSession("perm")`). `node scripts/audit-routes.mjs` fails if a route forgets it. |
| Tenant isolation | Every query is filtered by the logged-in restaurant (and branch). Tested by `tests/e2e/security.spec.ts` (another restaurant gets 404) and `tests/integration`. |
| Input | Zod validation on every JSON body; JSON content type required; bodies over 1 MB refused. Prices always come from the database, never from the browser. |
| Cross-site requests | State-changing API calls from another website are refused (Origin check) and JSON content type is required. |
| Headers | X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy everywhere; Content-Security-Policy and HSTS in production. |
| Uploads | Images only, checked by their first bytes (not the file name), max 3 MB, random file names. |
| Public pages | QR menu, online order, bill link, tracking and booking use long random tokens, return only safe fields, and are rate-limited per IP. |
| Payments | Gateway behind an interface; Razorpay signature checked with a constant-time compare; live keys are refused (test mode only). |
| Secrets | No keys in code. Production refuses to start with the development JWT secret. |
| Audit | Discounts, cancellations, refunds, price changes, deletions, staff/permission changes, cash closing go to the audit log. |

## Fixed in this review
1. Deactivated users / changed roles kept access until their 12-hour token expired → now checked on every request.
2. Production could run with the default signing secret → now refuses to start.
3. No CSRF protection beyond SameSite → Origin check + JSON-only bodies.
4. Uploads trusted the browser's file type → content is checked.
5. No CSP/HSTS → added for production.
6. PIN guessing was limited only per IP → also per restaurant.
7. Large JSON bodies could reach the validator → 1 MB limit.

## Still open (see TODO.md)
- `npm audit` reports issues in **next (postcss), prisma (CLI config libraries), zod and exceljs (uuid)**. Fixing them needs
  major upgrades (Next 16, Prisma 7, Zod 4). Exposure is low: postcss and the Prisma config libraries only run at build/CLI
  time on our own files; the zod issue needs huge inputs, which the 1 MB limit blocks; exceljs only writes our own reports.
  Plan the upgrades as a separate task.
- Rate limiting is in memory (per server). With several servers behind a load balancer, move it to Redis.
- Anyone who has an order's id can leave one rating for it (ids are long and random and only shown to that customer).
- The demo login link (`/api/auth/demo`) works only with `DEMO_LOGIN=1` and never in production – keep it off on servers.
