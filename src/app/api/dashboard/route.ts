import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { localTs } from "@/lib/sql-tz";
import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
import { reportScope } from "@/lib/report-scope";
import { pctChange } from "@/lib/report-utils";

/** Live owner dashboard: today vs same day last week, hourly sales, top items, table occupancy, open orders. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("reports.view");
  const sc = await reportScope(s, req.nextUrl.searchParams);
  const ids = Prisma.join(sc.branchIds);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const now = new Date(), wkStart = new Date(today.getTime() - 7 * 86400_000), wkNow = new Date(now.getTime() - 7 * 86400_000);
  const totals = async (a: Date, b: Date) => (await prisma.$queryRaw<any[]>`SELECT COUNT(*)::int AS bills, COALESCE(SUM(total),0)::bigint AS sales FROM "Bill" WHERE "branchId" IN (${ids}) AND status IN ('PAID','PARTIALLY_PAID') AND "createdAt" >= ${a} AND "createdAt" < ${b}`)[0];
  const [t, w] = await Promise.all([totals(today, now), totals(wkStart, wkNow)]);
  const hourly = async (a: Date, b: Date) => prisma.$queryRaw<any[]>`SELECT EXTRACT(HOUR FROM ${localTs('"createdAt"')})::int AS h, COALESCE(SUM(total),0)::bigint AS s, COUNT(*)::int AS c FROM "Bill" WHERE "branchId" IN (${ids}) AND status IN ('PAID','PARTIALLY_PAID') AND "createdAt" >= ${a} AND "createdAt" < ${b} GROUP BY 1`;
  const [ht, hw] = await Promise.all([hourly(today, now), hourly(wkStart, new Date(wkStart.getTime() + 86400_000))]);
  const top = await prisma.$queryRaw<any[]>`SELECT oi.name, SUM(oi.quantity)::int AS qty FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."branchId" IN (${ids}) AND oi.status <> 'CANCELLED' AND o.status <> 'CANCELLED' AND o."createdAt" >= ${today} GROUP BY 1 ORDER BY qty DESC LIMIT 5`;
  // Sold out today (signature strip): when each item was switched off today, against the same weekday last week.
  const outToday = await prisma.auditLog.findMany({ where: { restaurantId: s.restaurantId, action: "OUT_OF_STOCK", createdAt: { gte: today, lt: now } }, orderBy: { createdAt: "asc" } });
  const outLastWeek = await prisma.auditLog.findMany({ where: { restaurantId: s.restaurantId, action: "OUT_OF_STOCK", createdAt: { gte: wkStart, lt: new Date(wkStart.getTime() + 86400_000) } } });
  const itemNames = new Map((await prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId, id: { in: [...outToday, ...outLastWeek].map((a) => a.entityId!).filter(Boolean) } }, select: { id: true, name: true } })).map((i) => [i.id, i.name]));
  const firstOut = new Map<string, Date>(); for (const a of outToday) if (a.entityId && !firstOut.has(a.entityId)) firstOut.set(a.entityId, a.createdAt);
  const soldOut = [...firstOut.entries()].map(([id, at]) => { const lw = outLastWeek.find((a) => a.entityId === id); return { name: itemNames.get(id) ?? "Item", at: at.toISOString(), lastWeek: lw ? new Date(lw.createdAt.getTime() + 7 * 86400_000).toISOString() : null }; });
  const [waitingBill, requests] = await Promise.all([
    prisma.order.count({ where: { branchId: { in: sc.branchIds }, status: "BILLED" } }),
    prisma.tableRequest.count({ where: { resolved: false, table: { branchId: { in: sc.branchIds } } } }),
  ]);
  const [tables, occupied, openOrders, kitchenQueue] = await Promise.all([
    prisma.diningTable.count({ where: { branchId: { in: sc.branchIds } } }),
    prisma.diningTable.count({ where: { branchId: { in: sc.branchIds }, status: { in: ["OCCUPIED", "BILL_PRINTED"] } } }),
    prisma.order.count({ where: { branchId: { in: sc.branchIds }, status: { in: ["OPEN", "HELD", "BILLED", "PENDING_APPROVAL"] } } }),
    prisma.orderItem.count({ where: { order: { branchId: { in: sc.branchIds } }, kotId: { not: null }, status: { in: ["NEW", "PREPARING"] } } }),
  ]);
  const n = (v: any) => Number(v ?? 0);
  const sales = n(t.sales), bills = n(t.bills), lwSales = n(w.sales), lwBills = n(w.bills);
  return ok({
    branchLabel: sc.branchLabel,
    today: { sales, bills, avgBill: bills ? Math.round(sales / bills) : 0 },
    lastWeek: { sales: lwSales, bills: lwBills, avgBill: lwBills ? Math.round(lwSales / lwBills) : 0 },
    change: { sales: pctChange(sales, lwSales), bills: pctChange(bills, lwBills) },
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, future: h > now.getHours(), today: n(ht.find((x) => x.h === h)?.s), lastWeek: n(hw.find((x) => x.h === h)?.s), billsToday: n(ht.find((x) => x.h === h)?.c), billsLastWeek: n(hw.find((x) => x.h === h)?.c) })),
    lastWeekDay: wkStart.toLocaleDateString("en-IN", { weekday: "long" }), now: now.toISOString(), soldOut, waitingBill, requests,
    topItems: top.map((x) => ({ name: x.name, qty: n(x.qty) })),
    tables: { total: tables, occupied }, openOrders, kitchenQueue,
  });
});
