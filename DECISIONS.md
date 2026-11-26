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
45. **Reports** are computed live with SQL (no separate data warehouse). Each report returns {title, columns, rows} so the
    screen, Excel (exceljs) and PDF (pdfkit) exports always match. Sales are counted by bill date; item reports use PAID orders.
46. **Charts** are small hand-written SVG components (no chart library). Colours were checked with the colour-blind
    validator: orange #ea580c + blue #2563eb (dark mode #3b82f6); "last week" is also dashed so it never relies on colour.
47. **Staff screens render on the client only** (data loads after mount) to avoid server/browser time-zone mismatches.
48. **Demo history**: the seed adds ~60 days of past orders (≈3,100) so reports and forecasts have data. Bigger:
    `SEED_DAYS=120 SEED_ORDERS_PER_DAY=60 npm run db:seed`.
49. **AI is optional and OFF by default** (`AI_PROVIDER=off`). Every smart feature works on plain statistics:
    forecast = same-weekday average of the last 4 weeks × recent trend (capped ±30%); purchase = forecast use from recipes
    + 20% safety − stock; menu classes from popularity vs profit; reviews = keyword themes; upsell = items bought together;
    voice = word matching. With `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`, Claude (official `@anthropic-ai/sdk`,
    model `claude-opus-5-5`, low effort, server-side refusal fallback) only writes the plain-English explanations and
    review bullet points. If the AI call fails, the rule-based text is shown.
50. **Voice ordering** uses the browser's speech recognition (en-IN); browsers without it get a typed box. The parsed
    items are shown for the waiter to confirm, then added to the cart – nothing is sent to the kitchen automatically.

## Design pass (design-taste-frontend skill, app-screen rules)
51. **Style "Framed sheet"** (dealt by the skill, seed 686121829): sidebar + 48px top bar share one tinted frame; the work
    sits on a white sheet (8px inset, 16px corners, 1px edge, no shadow). Chosen because staff use DineFlow in long
    sessions across many screens; the frame holds the restaurant / branch scope, the sheet keeps the work calm.
52. **Face**: the frame is tinted banana-leaf green-grey (#f3f6f1) and the mark is a drawn banana leaf (the South Indian
    serving leaf). Typeface IBM Plex Sans (self-hosted via next/font, so it also works offline). Data hue teal #1b6c80;
    primary actions near-black; status colours (green/red/amber) only for status. Dark mode has its own token set.
53. **Signature element**: "Sold out today" strip on the dashboard – when each dish was switched to out-of-stock today
    against the same weekday last week (from the audit log).
54. **Dashboard** answers "How is today's service going?": a one-line finding under the title, live service counts,
    KPIs as the chart's tabs (running totals, today vs same weekday last week), top dishes, sold-out strip.
55. **No emoji in the UI** (icons from lucide or plain words); no gradients, no shadows at rest, underline tabs, tables
    are rules + right-aligned numbers. Kitchen tickets on time use a calm ink header; only late tickets turn orange/red.
56. **Bug fixed during the pass**: hourly/daily report buckets used UTC; SQL now converts to restaurant time
    (`src/lib/sql-tz.ts`). The demo seed also runs in restaurant time.
57. **Demo login link** `/api/auth/demo?as=owner&next=/dashboard` exists only for screenshots/checks: off unless
    `DEMO_LOGIN=1`, and never in production.
