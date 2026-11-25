# DineFlow – project memory for Claude Code

## Goal
A complete restaurant management app that works for ANY type of restaurant (fine dining, QSR,
café, cloud kitchen, bar, food truck, multi-branch chains). Full plan: `RESTAURANT_APP_PLAN.md`.

## Tech stack
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + small shadcn-style UI kit (`src/components/ui`)
- PostgreSQL 16 + Prisma 6 (`prisma/schema.prisma` already covers ALL phases)
- Socket.IO for live updates – runs inside the custom server `server.ts` (same port as Next)
- PWA (manifest + service worker) for tablets/phones
- Vitest (unit tests in `tests/unit`), Playwright (e2e in `tests/e2e`)
- Docker Compose for Postgres (and the app with `--profile app`)

## Rules (always follow)
- Multi-tenant: every tenant table has `restaurantId` (and `branchId` where needed). Every API query
  MUST filter by `session.restaurantId` / `session.branchId`. One restaurant never sees another's data.
- Roles: OWNER, MANAGER, CASHIER, WAITER, CHEF, DELIVERY, CUSTOMER. Permissions live in `src/lib/roles.ts`
  and are checked on the SERVER with `requireSession("perm.name")` (`src/lib/api.ts`).
- Restaurant type → feature flags per branch (`src/lib/features.ts`, stored in `Branch.features`).
- Money = integer paise. Never floats for stored money. Default INR, currency configurable.
- Indian GST (CGST/SGST or IGST, HSN/SAC on tax rates); bill maths is in `src/lib/billing.ts`.
- Audit log for discount / cancel / refund / price change / delete: `audit()` in `src/lib/audit.ts`.
- Validate input with Zod; API errors are plain-English messages (`handler()` wrapper).
- Big touch buttons on POS/kitchen; light & dark mode.
- External services (payments, SMS/WhatsApp, AI) are behind interfaces with MOCK implementations
  (`src/lib/services/*`). Never put real keys in code.

## Folder structure
```
server.ts                 custom server (Next + Socket.IO)
prisma/schema.prisma      full DB schema; prisma/seed*.ts demo data
src/app/login             login page (email+password, 4-digit PIN)
src/app/(app)/*           staff screens (sidebar layout, role-based nav)
src/app/t, o, track, b, book   public customer pages (QR menu, online order, tracking, bill, booking)
src/app/api/*             API routes (all use handler()+requireSession())
src/lib/*                 business logic (pure functions are unit-tested)
src/components/ui         UI kit; src/components/app  shell/context
tests/unit, tests/e2e     tests
```

## Commands
- Start DB: `service postgresql start` (or `docker compose up -d db`)
- Create tables: `npx prisma db push` · Seed demo: `npm run db:seed` · Reset: `npm run db:reset`
- Run app: `npm run dev` → http://localhost:3000
- Unit tests: `npm test` · Type check: `npm run typecheck` · E2E: `npm run test:e2e`
- Demo logins: owner@demo.com / manager@ / cashier@ / waiter@ / chef@ / rider@ — password `password123`.
  PINs (restaurant code `demo`): owner 1111, manager 2222, cashier 3333, waiter 4444, chef 5555, rider 6666.

## Phase checklist
- [x] Phase 0 – Project setup, database, login, roles
- [x] Phase 1 – Restaurant/branch setup, menu (signup, onboarding wizard, settings, menu CRUD, variants, add-ons, combos, time menus, CSV/Excel import-export, demo menu)
- [x] Phase 2 – Tables (drag-drop floor plan, sections, status colours, merge/move), POS, waiter phone view, hold/resume, KOT, tokens, discounts/coupons/complimentary with manager PIN
- [x] Phase 3 – Kitchen display (Socket.IO live, sound, stations, orange/red timers, New→Preparing→Ready→Served, ready alerts)
- [x] Phase 4 – Billing: GST (CGST/SGST/IGST per rate), service/packing charge, round-off, split (equal/items/person), merge bills, split payments, Razorpay test + mock gateway, ESC/POS 58/80mm, PDF, share link (mock), refunds, void, day-end cash closing
- [x] Phase 5 – QR ordering: per-table QR sheet, public menu (en/te/hi), cart, auto-accept or waiter approval, call waiter / ask bill alerts, live status, pay from phone (mock/Razorpay test), rating
- [x] Phase 6 – Reservations (staff + online form, 7-day calendar, auto table pick, clash check, no-show tracking), waitlist with wait estimate + "table ready" message (mock), online ordering site /o/<slug> with pincode delivery zones, delivery assignment, rider phone view, customer tracking, aggregator interface + mock Swiggy/Zomato webhook
- [ ] Phase 7 – Inventory, recipes, suppliers
- [ ] Phase 8 – Staff, attendance, audit log
- [ ] Phase 9 – Customers, loyalty, feedback
- [ ] Phase 10 – Reports and dashboard
- [ ] Phase 11 – AI features
- [ ] Phase 12 – Offline mode, security check, testing, deployment

See `DECISIONS.md` for choices made while building, `TODO.md` for known gaps.
