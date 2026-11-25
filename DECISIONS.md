# Decisions made while building (no one was available to ask)

1. **Branch name**: work is on `build-all-phases` as requested.
2. **Versions**: Next.js 15.5, React 19.1, Prisma 6.19, Tailwind 4, TypeScript 5.9. (Newer majors
   – Next 16, Prisma 8 RC, TypeScript 7 – exist but TS 7 broke `next.config.ts`, so stable versions were pinned.)
   `next.config.mjs` is used instead of `next.config.ts` for the same reason.
3. **shadcn/ui**: the shadcn CLI is interactive, so a small set of shadcn-style components was written
   by hand in `src/components/ui/index.tsx` (Button, Input, Card, Dialog, Badge, Table, Tabs…).
4. **Backend**: Next.js API routes (not NestJS) – one app, one process, simpler to run.
5. **Socket.IO**: runs in a custom `server.ts` together with Next, so API routes can emit events directly.
   Consequence: deploy as a normal Node server (not serverless/Vercel).
6. **Auth**: own JWT session (jose, HS256) in an httpOnly cookie, bcrypt for passwords and PINs.
   PIN login = restaurant code + 4-digit PIN. 5 wrong passwords lock the account for 15 minutes.
7. **Database changes**: `prisma db push` is used during development for speed (no migration files yet).
8. **Full schema up-front**: all tables for phases 0–12 are in `schema.prisma` from Phase 0.
9. **Signup**: added a public `/signup` page (restaurant + owner account) that leads into the onboarding wizard (`/onboarding`).
10. **Photos/logo upload** are saved to `public/uploads/<restaurantId>/` (swap for S3/Cloud storage in production).
11. **Menu delete**: items that were ever sold are archived (`active=false`) instead of deleted, so reports stay correct.
12. **Prices in CSV/Excel** are written in rupees (e.g. 249.50) for humans; stored as paise.
13. **Channel prices**: takeaway/online price blank = dine-in price. QR (at table) uses dine-in price.
14. **Manager approval**: complimentary items always need an OWNER/MANAGER (own login or their 4-digit PIN).
    Cashier discounts above **10%** need a manager PIN. Coupons do not need approval.
15. **KOT**: "Send KOT" puts all not-yet-sent items on a new numbered KOT; adding items later creates KOT #2, #3…
    Items already sent can only be cancelled (with reason, by cashier/manager), not edited.
16. **Order numbers** restart every day per branch; **token numbers** (QSR/café/food truck) also restart daily.
17. **Merge tables**: items of table A's order move into table B's order; A is marked "merged" and freed when B is settled.
18. **Offline-safe order creation**: every order sent by POS carries a `clientId`; sending the same one again returns the
    existing order (no duplicates). This is reused by offline sync in Phase 12.
19. **GST on charges**: service, packing and delivery charges are taxed at the same rate(s) as the food (composite supply),
    spread in proportion. Discount is applied before tax. CGST = SGST = half rate each, computed per tax-rate group.
