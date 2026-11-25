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
20. **Kitchen timers** start when the KOT is created; limits come from branch settings (default orange 10 min, red 20 min).
    Tapping an item moves it one step; "undo one step" is allowed for mis-taps. Ready alerts go to all staff in the branch.
21. **Bill numbers**: `<financial year>/<6-digit sequence per branch>` e.g. `2627/000042` (unique, ≤16 chars as GST needs).
22. **Cash change**: only the amount actually applied to the bill is stored as a CASH payment; the change is shown to the cashier.
23. **Card/UPI at the counter** are recorded as payments (the machine/QR is outside the app). "Online payment" uses the
    gateway interface: mock by default; Razorpay only with `rzp_test_` keys (live keys are refused).
24. **Printing**: browser print + raw ESC/POS download (58/80mm) + PDF. Sending ESC/POS straight to a USB/LAN printer needs
    a small print bridge on the shop PC – listed in TODO.md.
25. **Time zone**: server dates (day-end, tokens, reports) use `Asia/Kolkata` by default (`APP_TZ`).
26. **Changing a billed order**: cancel (void) the unpaid bill first; the order goes back to OPEN.
27. **QR orders**: with auto-accept ON they are added to the table's open order and go to the kitchen at once.
    With auto-accept OFF (default) each customer order waits as "QR approval"; accepting merges it into the table's
    open order and sends the KOT. The customer's phone shows items of the table's current orders (anyone at the table
    can see them – the QR is the table's key). Paid orders disappear from the phone 30 min after payment.
28. **Customer languages**: English, Telugu, Hindi for buttons; dish/category names come from the `nameI18n` fields
    (fill them in the menu editor). Missing translation → English name.
29. **Public endpoints** (`/api/public/*`) are rate-limited per IP and only return safe fields (no cost prices).
30. **Online orders** (own website) are accepted automatically, go to the kitchen at once and get a bill straight away;
    the customer can pay online (gateway) or cash on delivery/pickup. Delivery charge comes from the pincode zone.
31. **Reservations** block a table for 2 × "average table time" (default 90 min). No table chosen → smallest free table that fits.
    No-shows are counted per phone number and shown next to future bookings.
32. **Aggregators**: `src/lib/services/aggregators.ts` defines the interface; Swiggy/Zomato are MOCKS. Webhook:
    `POST /api/public/aggregator/<SWIGGY|ZOMATO>?branch=<id>` with header `x-aggregator-secret` (env `AGGREGATOR_SECRET`).
    Aggregator orders are type ONLINE (platform rider picks up). Items are matched by our item id or exact name.
33. **Stock units**: every ingredient has a base unit g / ml / pcs. Recipes and purchases may use kg / L too (converted).
    Ingredient cost is entered per kg / per litre / per piece. Stock can go negative (the kitchen never stops a sale);
    the low-stock alert tells the manager.
34. **When stock moves**: deducted when the item is SENT TO THE KITCHEN (KOT), not when billed; returned once if the item
    or order is cancelled. Recipe lines can be for one size (Half/Full) or for all sizes.
35. **Food cost**: from the recipe when one exists, otherwise from the item's manual "cost price" estimate.
36. **Integration tests** use a separate database `dineflow_test` (`npm run test:integration`). Prisma refuses
    `--force-reset` from an AI agent, so the test setup does a normal `db push` and the seed wipes/re-creates demo data.
37. **Permissions editor** adds EXTRA permissions on top of the role (stored in `User.permissions`); role defaults
    cannot be removed per person. Managers can only add/edit CASHIER/WAITER/CHEF/DELIVERY staff of their own branch.
38. **PINs are unique per restaurant** (checked against bcrypt hashes when saving).
39. **Salary** (simple, as asked): monthly staff = salary × (days present + approved leave days) ÷ 26 (max 100%);
    hourly staff = hours × rate. Tips added on top. A forgotten clock-out counts as max 14 hours.
40. **Tips** recorded on payments are shared per day by hours worked, once per day.
41. **Customers** are created/linked automatically when an order with a phone number is fully paid (phone normalised to
    10 digits). Points are earned on the amount paid (default 5 points per ₹100; 1 point = ₹1) × tier multiplier.
42. **Redeeming points** turns them into a flat discount on the order before the bill is made, max 50% of the order.
43. **Low ratings (≤2★)** show a live alert to managers and send a WhatsApp (mock) to the owner/branch managers who have a phone.
44. Schema tweak: customer links on orders/reservations/feedback use `onDelete: SetNull`; PO lines cascade with ingredients.
