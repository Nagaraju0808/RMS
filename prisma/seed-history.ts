import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { computeBill, billNumber } from "../src/lib/billing";

// ~60 days of past paid orders (with bills, payments, customers, feedback, attendance) so reports and forecasts have data.
// Set SEED_DAYS / SEED_ORDERS_PER_DAY to make it bigger (e.g. 10,000 orders for the performance test).
export async function seedHistory(p: PrismaClient, rid: string, b1: string, b2: string) {
  const DAYS = Number(process.env.SEED_DAYS || 60), PER_DAY = Number(process.env.SEED_ORDERS_PER_DAY || 30);
  let seed = 42; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const items = await p.menuItem.findMany({ where: { restaurantId: rid, active: true }, include: { variants: true, taxRate: true } });
  const popular = items.filter((i) => /Biryani|Dosa|Naan|Paneer Butter|Butter Chicken|Coffee|Chai|Idli|Fried Rice|Manchurian/.test(i.name));
  const tables = await p.diningTable.findMany({ where: { branchId: b1 } });
  const waiters = await p.user.findMany({ where: { restaurantId: rid, role: { in: ["WAITER", "CASHIER"] } } });
  const names = ["Anil", "Priya", "Rahul", "Sneha", "Vikram", "Divya", "Kiran", "Lakshmi", "Suresh", "Meera", "Arjun", "Kavya", "Ravi", "Pooja", "Sai", "Harsha"];
  const customers = await Promise.all(Array.from({ length: 80 }, (_, i) => p.customer.create({ data: { restaurantId: rid, phone: `98480${String(10000 + i).slice(-5)}`, name: `${pick(names)} ${String.fromCharCode(65 + (i % 26))}.`, birthday: `${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}` } })));
  const comments = ["Loved the biryani!", "Great service", "Food was cold", "Dosa was crispy and tasty", "Too slow today", "Nice ambience", "Paneer was excellent", "A bit too spicy", "Will come again", "Waiter was very polite"];
  const orders: any[] = [], orderItems: any[] = [], kots: any[] = [], bills: any[] = [], payments: any[] = [], feedback: any[] = [];
  const spend = new Map<string, { total: number; visits: number; last: Date }>();
  let billSeq = 0;
  for (let d = DAYS; d >= 0; d--) {
    for (const [branchId, scale] of [[b1, 1], [b2, 0.5]] as const) {
      const day = new Date(); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
      const weekend = [0, 5, 6].includes(day.getDay());
      const n = Math.round(PER_DAY * scale * (weekend ? 1.35 : 1) * (0.85 + rnd() * 0.3));
      for (let k = 0; k < n; k++) {
        const hour = pick([8, 9, 12, 13, 13, 14, 14, 15, 19, 20, 20, 21, 21, 22]);
        const at = new Date(day.getTime() + hour * 3600_000 + Math.floor(rnd() * 3600_000));
        if (at.getTime() > Date.now() - 10 * 60_000) continue; // today: only orders that already happened
        const type = branchId === b1 && rnd() < 0.6 ? "DINE_IN" : pick(["TAKEAWAY", "DELIVERY", "ONLINE"]) as any;
        const id = randomUUID(), kotId = randomUUID();
        const cust = rnd() < 0.45 ? pick(customers) : null;
        const lines: any[] = [];
        for (let j = 0; j < 1 + Math.floor(rnd() * 4); j++) {
          const it = rnd() < 0.7 ? pick(popular) : pick(items); const v = it.variants.length ? pick(it.variants) : null;
          lines.push({ id: randomUUID(), orderId: id, kotId, menuItemId: it.id, variantId: v?.id ?? null, stationId: it.stationId, name: v ? `${it.name} (${v.name})` : it.name, unitPrice: v ? v.priceDineIn : it.priceDineIn, quantity: 1 + Math.floor(rnd() * 2), taxPercent: it.taxRate?.ratePercent ?? 5, status: "SERVED", createdAt: at, startedAt: at, readyAt: new Date(at.getTime() + (8 + rnd() * 20) * 60_000), servedAt: new Date(at.getTime() + 30 * 60_000) });
        }
        const cancelled = rnd() < 0.02;
        const disc = !cancelled && rnd() < 0.1 ? { type: "PERCENT" as const, value: pick([5, 10, 15]) } : null;
        orders.push({ id, restaurantId: rid, branchId, orderNo: k + 1, type, status: cancelled ? "CANCELLED" : "PAID", tableId: type === "DINE_IN" && branchId === b1 ? pick(tables).id : null, waiterId: pick(waiters).id, customerId: cust?.id ?? null, customerPhone: cust?.phone ?? null, customerName: cust?.name ?? null, guests: 1 + Math.floor(rnd() * 4), discountType: disc?.type ?? null, discountValue: disc?.value ?? 0, discountReason: disc ? "Regular customer" : null, cancelReason: cancelled ? pick(["Customer left", "Wrong order"]) : null, source: type === "ONLINE" ? pick(["ONLINE", "SWIGGY", "ZOMATO"]) : "POS", kotCounter: 1, createdAt: at, updatedAt: at, closedAt: new Date(at.getTime() + 50 * 60_000) });
        kots.push({ id: kotId, orderId: id, kotNo: 1, createdAt: at });
        if (cancelled) { lines.forEach((l) => { l.status = "CANCELLED"; l.cancelReason = "Order cancelled"; }); orderItems.push(...lines); continue; }
        orderItems.push(...lines);
        const b = computeBill({ lines, discount: disc, serviceChargePercent: type === "DINE_IN" ? 5 : 0 });
        const billId = randomUUID();
        bills.push({ id: billId, restaurantId: rid, branchId, orderId: id, billNo: billNumber(++billSeq, at), subtotal: b.subtotal, discount: b.discount, serviceCharge: b.serviceCharge, cgst: b.cgst, sgst: b.sgst, igst: b.igst, roundOff: b.roundOff, total: b.total, paid: b.total, status: "PAID", breakdown: { taxGroups: b.taxGroups, taxable: b.taxable }, createdAt: at });
        payments.push({ id: randomUUID(), billId, mode: pick(["CASH", "UPI", "UPI", "UPI", "CARD", "ONLINE"]), amount: b.total, tip: rnd() < 0.2 ? 2000 : 0, createdAt: at });
        if (cust) { const s = spend.get(cust.id) ?? { total: 0, visits: 0, last: at }; spend.set(cust.id, { total: s.total + b.total, visits: s.visits + 1, last: at }); }
        if (rnd() < 0.15) { const r = pick([5, 5, 5, 4, 4, 4, 3, 2, 1]); feedback.push({ id: randomUUID(), orderId: id, customerId: cust?.id ?? null, branchId, rating: r, foodRating: Math.min(5, r + (rnd() < 0.5 ? 0 : 1)), serviceRating: r, comment: r >= 4 ? pick(comments.filter((c) => !/cold|slow|spicy/.test(c))) : pick(["Food was cold", "Too slow today", "A bit too spicy"]), createdAt: at }); }
      }
    }
  }
  const chunk = async (rows: any[], fn: (r: any[]) => Promise<any>) => { for (let i = 0; i < rows.length; i += 2000) await fn(rows.slice(i, i + 2000)); };
  await chunk(orders, (r) => p.order.createMany({ data: r }));
  await chunk(kots, (r) => p.kot.createMany({ data: r }));
  await chunk(orderItems, (r) => p.orderItem.createMany({ data: r }));
  await chunk(bills, (r) => p.bill.createMany({ data: r }));
  await chunk(payments, (r) => p.payment.createMany({ data: r }));
  await chunk(feedback, (r) => p.feedback.createMany({ data: r }));
  await p.branch.update({ where: { id: b1 }, data: { billCounter: billSeq } });
  const todayKey = new Date().toLocaleDateString("en-CA");
  for (const b of [b1, b2]) await p.branch.update({ where: { id: b }, data: { orderDate: todayKey, orderCounter: orders.filter((o) => o.branchId === b && o.createdAt.toLocaleDateString("en-CA") === todayKey).reduce((m, o) => Math.max(m, o.orderNo), 0) } });
  for (const [id, s] of spend) await p.customer.update({ where: { id }, data: { totalSpend: s.total, visits: s.visits, lastVisitAt: s.last, points: Math.floor(s.total / 10000) * 5 } });
  // attendance for the last 14 days
  const staff = await p.user.findMany({ where: { restaurantId: rid, role: { notIn: ["OWNER"] } } });
  const att: any[] = [];
  for (let d = 14; d >= 1; d--) for (const u of staff) { if (rnd() < 0.15) continue; const day = new Date(); day.setDate(day.getDate() - d); day.setHours(9 + Math.floor(rnd() * 3), Math.floor(rnd() * 60), 0, 0); att.push({ userId: u.id, type: "CLOCK_IN", at: day }, { userId: u.id, type: "CLOCK_OUT", at: new Date(day.getTime() + (7 + rnd() * 3) * 3600_000) }); }
  await p.attendance.createMany({ data: att });
  // Sold-out events for the dashboard strip: today (so far) and the same weekday last week.
  const byName = (n: string) => items.find((i) => i.name === n)!;
  const owner = await p.user.findFirst({ where: { restaurantId: rid, role: "MANAGER" } });
  const lw = new Date(); lw.setDate(lw.getDate() - 7);
  const at = (base: Date, h: number, m: number) => { const x = new Date(base); x.setHours(h, m, 0, 0); return x; };
  const events: [string, Date][] = [["Medu Vada", at(lw, 10, 50)], ["Idli (2 pcs)", at(lw, 11, 5)], ["Qubani Ka Meetha", at(lw, 21, 40)], ["Ghee Roast Dosa", at(lw, 13, 20)]];
  const nowD = new Date();
  for (const [n, mins] of [["Medu Vada", 95], ["Idli (2 pcs)", 40]] as const) { const t = new Date(nowD.getTime() - mins * 60_000); if (t.getDate() === nowD.getDate() && t.getHours() >= 7) events.push([n, t]); }
  for (const [n, t] of events) if (t.toDateString() === nowD.toDateString()) await p.menuItem.update({ where: { id: byName(n).id }, data: { inStock: false } });
  for (const [n, t] of events) await p.auditLog.create({ data: { restaurantId: rid, branchId: b1, userId: owner?.id, userName: owner?.name, action: "OUT_OF_STOCK", entity: "MenuItem", entityId: byName(n).id, createdAt: t } });
  console.log(`History: ${orders.length} orders, ${feedback.length} ratings`);
}
