# Restaurant Management App – Complete Plan + Claude Code Prompts

Name used here: **DineFlow** (change it to anything you like).

---

## PART 1 – THE OUTLINE (what the app will have)

### 1. Who will use the app (user roles)
| Role | What they do |
|---|---|
| Owner | Sees all branches, reports, money, settings |
| Manager | Runs one branch: staff, menu, stock, offers |
| Cashier | Takes orders, makes bills, collects payment |
| Waiter / Captain | Takes table orders on a phone or tablet |
| Chef / Kitchen staff | Sees orders on the kitchen screen, marks them ready |
| Delivery person | Sees delivery orders, updates delivery status |
| Customer | Scans QR, orders, pays, books tables, earns points |

### 2. Works for any kind of restaurant
At setup, the owner picks the restaurant type. The app turns features on or off:
- Fine dining / family restaurant (tables, waiters, reservations)
- Quick service / fast food (counter orders, token numbers)
- Café / bakery (quick billing, weighing items)
- Cloud kitchen (only online orders, no tables)
- Bar / pub (open tabs, happy hours)
- Food truck / kiosk (small screen, works offline)
- Chain with many branches (central menu, central reports)

### 3. Main modules

**A. Setup**
- Many restaurants in one system (each one's data kept separate)
- Many branches per restaurant
- Tax settings (GST: CGST + SGST / IGST), currency, language, logo

**B. Menu**
- Categories, items, photos, price
- Sizes/variants (half/full, small/large), add-ons (extra cheese), combos
- Veg / non-veg / egg / vegan tags, spice level, allergens
- Different prices for dine-in, takeaway, online
- Time-based menus (breakfast, lunch, happy hour)
- "Out of stock" switch with one tap

**C. Tables and floor plan**
- Drag-and-drop floor layout (sections like AC, outdoor, rooftop)
- Table colour shows status: free, occupied, bill printed, needs cleaning
- Merge tables, move order to another table
- A unique QR code for every table

**D. Orders (POS – point of sale)**
- Dine-in, takeaway, delivery, online orders – all in one screen
- KOT (kitchen order ticket) sent to the kitchen automatically
- Hold order, add notes ("less spicy"), cancel with reason
- Split bill (by item, by person, equal split), merge bills
- Discounts, coupons, complimentary items (with manager approval)

**E. Kitchen Display System (KDS)**
- Screen in kitchen shows new orders live
- Separate stations (tandoor, Chinese, bar, desserts)
- Timer on each order, colour turns red if it is late
- Chef taps "Preparing" → "Ready"; waiter gets an alert

**F. QR ordering by customers (no app download needed)**
- Customer scans table QR → sees menu on phone → orders → pays
- "Call waiter" and "Ask for bill" buttons
- Menu in many languages (English, Telugu, Hindi, …)

**G. Billing and payments**
- GST bill with correct tax split, service charge, rounding
- Cash, card, UPI (QR), wallet, split payment
- Print on thermal printer, or send bill by WhatsApp / SMS / email
- Refunds, day-end cash closing (cash drawer check)

**H. Reservations and waitlist**
- Book a table online or by phone
- Waitlist with SMS/WhatsApp alert "your table is ready"
- No-show tracking

**I. Online orders and delivery**
- Own online ordering website for the restaurant
- Space to connect Swiggy / Zomato / other platforms later
- Assign delivery person, live order status for customer

**J. Inventory (stock)**
- Raw materials (rice, oil, chicken…) with units
- Recipe for each dish → stock reduces automatically when a dish is sold
- Low-stock alerts, wastage entry, expiry dates
- Suppliers, purchase orders, goods received

**K. Staff**
- Staff list, roles, PIN login for quick access
- Attendance, shifts, tips, simple salary report
- Who did what (audit log: who gave a discount, who cancelled a bill)

**L. Customers and loyalty (CRM)**
- Customer list built from phone numbers
- Loyalty points, birthday/anniversary offers
- Feedback and ratings after each meal
- Send offers by SMS / WhatsApp / email

**M. Reports and dashboard**
- Today's sales, orders, average bill value – live
- Item-wise sales, best and worst sellers
- Busy hours, branch comparison, payment-mode report
- Food cost and profit per dish
- GST report for filing
- Export to Excel / PDF

**N. New "smart" (AI) features**
- Sales forecast: "Expect 30% more orders this Saturday"
- Stock suggestion: "Order 12 kg chicken for tomorrow"
- Menu advice: which dishes earn most and which to remove
- Auto-summary of customer reviews
- Voice order taking for waiters
- Recommends add-ons to customers ("people also ordered…")

**O. Reliability and safety**
- Works offline; syncs when internet comes back (very important for POS)
- Secure login, role-based permissions, data backups
- Every important action is recorded

### 4. Technology (suggested – simple and popular)
- **Frontend (screens):** Next.js + React + TypeScript + Tailwind CSS
- **Backend (server):** Next.js API routes or NestJS (Node.js)
- **Database:** PostgreSQL with Prisma
- **Live updates (kitchen screen, table status):** Socket.IO
- **Phones/tablets:** PWA (installable web app, works offline)
- **Payments:** Razorpay (UPI, card) – test mode first
- **Messages:** WhatsApp/SMS provider (add later)
- **Testing:** Vitest + Playwright
- **Running everything:** Docker

### 5. Build order (phases)
| Phase | What gets built |
|---|---|
| 0 | Project setup, database, login, roles |
| 1 | Restaurant/branch setup, menu |
| 2 | Tables, POS orders, KOT |
| 3 | Kitchen screen (live) |
| 4 | Billing, GST, payments, printing |
| 5 | QR ordering for customers |
| 6 | Reservations, waitlist, online orders, delivery |
| 7 | Inventory, recipes, suppliers |
| 8 | Staff, attendance, audit log |
| 9 | Customers, loyalty, feedback |
| 10 | Reports and dashboard |
| 11 | AI features |
| 12 | Offline mode, security check, testing, deployment |

---

## PART 2 – HOW TO USE CLAUDE CODE FOR THIS

1. Make an empty folder, e.g. `dineflow`, and open Claude Code in it.
2. Put **this file** inside that folder.
3. Paste the **Master Prompt** (below) first. It sets up the project and creates `CLAUDE.md` (Claude Code's memory file for the project).
4. Then paste **one phase prompt at a time**. Do not paste all phases together – big jumps cause mistakes.
5. After each phase: run the app, click through it yourself, then say **"commit this phase"**.
6. If something breaks, just describe what you see ("the bill total is wrong when I add a discount") and paste the error message.

---

## PART 3 – THE PROMPTS

### MASTER PROMPT (paste this first)

```
You are building "DineFlow", a complete, production-quality restaurant management
application that works for ANY type of restaurant (fine dining, quick service, café,
cloud kitchen, bar, food truck, multi-branch chains).

Read RESTAURANT_APP_PLAN.md in this folder. It contains the full feature list,
user roles, tech stack and build phases. Follow it.

Tech stack: Next.js (App Router) + React + TypeScript + Tailwind CSS + shadcn/ui,
PostgreSQL + Prisma, Socket.IO for live updates, PWA for tablets/phones,
Vitest for unit tests, Playwright for end-to-end tests, Docker Compose for local run.

Rules for the whole project:
- Multi-tenant: every table in the database has restaurantId (and branchId where
  needed). One restaurant must never see another's data.
- Role-based access: OWNER, MANAGER, CASHIER, WAITER, CHEF, DELIVERY, CUSTOMER.
  Check permissions on the server, not only in the UI.
- Restaurant type decides which features are switched on (feature flags per branch).
- Money is stored as integers in paise (never floats). Default currency INR,
  but make currency configurable.
- Indian GST support (CGST/SGST/IGST, HSN/SAC codes), configurable for other countries.
- Every important action (discount, cancel, refund, price change) goes into an audit log.
- Clean folder structure, reusable components, input validation with Zod,
  clear error messages, seed data for a demo restaurant.
- Mobile/tablet friendly UI, large touch buttons for POS and kitchen screens,
  light and dark mode.
- Write tests for business logic (bill totals, tax, stock deduction, split bill).

Now do Phase 0 only:
1. First show me a short plan and the folder structure, then build it.
2. Set up the project, Docker Compose with PostgreSQL, Prisma, Tailwind, shadcn/ui.
3. Design the full database schema for ALL phases (so we don't redo it later),
   but only build screens for Phase 0.
4. Build login (email+password and quick 4-digit staff PIN), roles, and a basic
   layout with a sidebar that shows menu items based on role.
5. Create CLAUDE.md that records: the project goal, tech stack, rules above,
   commands to run/test, and a checklist of phases with their status.
6. Add a README with simple steps to run the app.
7. Run the app and tests, fix any errors, then tell me in simple English how to
   open it and what to check.
Explain things in simple, plain English – I am not an expert.
```

### PHASE 1 – Restaurant setup and menu
```
Read CLAUDE.md. Now do Phase 1:
- Onboarding wizard: restaurant name, logo, type (fine dining / QSR / café /
  cloud kitchen / bar / food truck), branches, tax settings, currency, languages.
  Restaurant type switches features on/off.
- Menu management: categories, items with photos, variants (half/full, sizes),
  add-ons/modifiers, combos, veg/non-veg/egg/vegan tags, spice level, allergens,
  separate prices for dine-in/takeaway/online, time-based menus
  (breakfast/lunch/happy hour), one-tap "out of stock".
- Bulk import/export menu from Excel/CSV.
- Seed a demo menu (South Indian + North Indian + Chinese + drinks).
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 2 – Tables and POS orders
```
Read CLAUDE.md. Now do Phase 2:
- Drag-and-drop floor plan with sections; table status colours
  (free / occupied / bill printed / cleaning); merge and move tables.
- POS screen for dine-in, takeaway, delivery: fast item search, category tabs,
  variants/add-ons popup, item notes, hold/resume order, cancel with reason.
- Token numbers for quick-service mode.
- Generate KOT (kitchen order ticket) when order is sent; extra items create a new KOT.
- Discounts (percent/flat), coupons, complimentary items needing manager PIN.
- Waiter mobile view to take orders at the table.
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 3 – Kitchen Display System
```
Read CLAUDE.md. Now do Phase 3:
- Live kitchen screen using Socket.IO: new orders appear instantly with a sound.
- Kitchen stations (tandoor, Chinese, bar, desserts); items go to the right station.
- Timer per order, turns orange then red when late (configurable limits).
- Status flow: New → Preparing → Ready → Served. Waiter/cashier gets a live alert
  when food is ready.
- Large touch-friendly design for a TV or tablet in the kitchen.
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 4 – Billing and payments
```
Read CLAUDE.md. Now do Phase 4:
- Bill generation with GST split (CGST/SGST or IGST), service charge, packing
  charge, round-off, all calculated on the server.
- Split bill (by item, by person, equal), merge bills.
- Payment modes: cash, card, UPI, wallet, and split payment across modes.
  Integrate Razorpay in TEST mode only, behind an interface so other gateways
  can be added later.
- Print to 80mm/58mm thermal printer (ESC/POS) and browser print; PDF bill;
  share bill link by WhatsApp/SMS/email (provider behind an interface, mock for now).
- Refunds with reason, day-end closing (cash drawer count vs system).
Write strong tests for all bill maths. Run everything, update CLAUDE.md,
and tell me what to check.
```

### PHASE 5 – QR ordering for customers
```
Read CLAUDE.md. Now do Phase 5:
- Unique QR code per table (downloadable/printable sheet).
- Customer scans → mobile menu (no login needed, phone number optional) →
  add to cart → place order → order goes to kitchen (setting: auto-accept or
  waiter must approve).
- "Call waiter" and "Ask for bill" buttons that alert staff live.
- Customer can pay from phone (Razorpay test mode) and give a rating.
- Menu language switch (English, Telugu, Hindi to start).
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 6 – Reservations, waitlist, online orders, delivery
```
Read CLAUDE.md. Now do Phase 6:
- Table reservations (online form + staff entry), calendar view, no-show tracking.
- Walk-in waitlist with estimated wait time and "table ready" message (mock sender).
- Restaurant's own online ordering page (delivery/pickup), delivery zones and charges.
- Delivery management: assign rider, rider mobile view, status updates,
  customer tracking page.
- An "aggregator" interface (for Swiggy/Zomato etc.) with a mock implementation,
  so real integrations can be plugged in later.
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 7 – Inventory
```
Read CLAUDE.md. Now do Phase 7:
- Raw materials with units (kg, g, litre, piece) and unit conversions.
- Recipe for each menu item/variant; stock reduces automatically on each sale
  and is returned on cancellation.
- Low-stock alerts, expiry tracking, wastage entry with reason, stock counting.
- Suppliers, purchase orders, goods received, supplier payments due.
- Food cost per dish and food-cost % report.
Add tests (especially stock deduction), run everything, update CLAUDE.md,
and tell me what to check.
```

### PHASE 8 – Staff
```
Read CLAUDE.md. Now do Phase 8:
- Staff profiles, roles, permissions editor, PIN login.
- Shifts, clock-in/clock-out attendance, leave, tips sharing.
- Simple monthly salary summary (export to Excel).
- Audit log screen: filter by staff, action, date (discounts, cancellations,
  refunds, price changes, deletions).
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 9 – Customers and loyalty
```
Read CLAUDE.md. Now do Phase 9:
- Customer profiles from phone numbers: visit history, favourite dishes, total spend.
- Loyalty points (earn and redeem rules set by owner), membership tiers.
- Birthday/anniversary offers, coupon campaigns to customer groups
  (message sending behind an interface, mock for now).
- Feedback after meal, ratings dashboard, alert manager on low ratings.
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 10 – Reports and dashboard
```
Read CLAUDE.md. Now do Phase 10:
- Live owner dashboard: today's sales, orders, average bill, top items,
  table occupancy, comparison with last week.
- Reports with date filters and branch filters: sales, item-wise, category-wise,
  hourly (busy hours), payment modes, discounts given, cancellations, GST report,
  staff performance, inventory and food cost, profit per dish.
- Export every report to Excel and PDF.
- Clean charts that are easy to read.
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 11 – Smart (AI) features
```
Read CLAUDE.md. Now do Phase 11. Put all AI behind one service interface with an
API key in .env, and make every AI feature optional with a fallback when it is off.
- Sales forecast for the next 7 days per item (start with simple statistics on
  past sales; AI only to explain results in plain words).
- Smart purchase suggestion based on forecast + recipes + current stock.
- Menu engineering: classify dishes (popular & profitable, etc.) with suggestions.
- Review summary: summarise customer feedback into key points.
- Upsell suggestions on POS and QR menu ("often ordered together").
- Voice order taking for waiters (speech to order items, waiter confirms before sending).
Add tests, run everything, update CLAUDE.md, and tell me what to check.
```

### PHASE 12 – Offline, security, testing, deployment
```
Read CLAUDE.md. Now do Phase 12:
- Offline mode for POS and kitchen: save orders locally (IndexedDB) when internet
  is down and sync safely when it returns (no duplicate orders).
- Security review: check every API for permission and tenant checks, rate limiting,
  secure headers, password hashing, input validation. Fix anything you find.
- Full Playwright end-to-end test: owner setup → menu → order → kitchen → bill →
  payment → report.
- Performance check on large demo data (10,000 orders).
- Production Dockerfile, environment variable guide, database backup script,
  and step-by-step deployment guide in simple English.
Update CLAUDE.md and give me a final summary of what is complete and what is left.
```

---

## PART 4 – USEFUL FOLLOW-UP PROMPTS

- "Explain how [feature] works in simple English, file by file."
- "Run all tests and fix whatever fails."
- "Review the code of this phase for bugs and security problems before we move on."
- "Add sample data so I can demo this to a restaurant owner."
- "Make the POS screen faster to use on a 10-inch tablet."
- "Commit this phase with a clear message."

## Tips
- Go phase by phase. Test each phase yourself before moving on.
- Keep payments in **test mode** until the whole app is checked.
- If Claude Code's answer gets long or confusing, ask: "Summarise what you changed in 5 simple points."
