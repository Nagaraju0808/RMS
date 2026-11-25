import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
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
  const hourly = async (a: Date, b: Date) => prisma.$queryRaw<any[]>`SELECT EXTRACT(HOUR FROM "createdAt")::int AS h, COALESCE(SUM(total),0)::bigint AS s FROM "Bill" WHERE "branchId" IN (${ids}) AND status IN ('PAID','PARTIALLY_PAID') AND "createdAt" >= ${a} AND "createdAt" < ${b} GROUP BY 1`;
  const [ht, hw] = await Promise.all([hourly(today, now), hourly(wkStart, new Date(wkStart.getTime() + 86400_000))]);
  const top = await prisma.$queryRaw<any[]>`SELECT oi.name, SUM(oi.quantity)::int AS qty FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."branchId" IN (${ids}) AND oi.status <> 'CANCELLED' AND o.status <> 'CANCELLED' AND o."createdAt" >= ${today} GROUP BY 1 ORDER BY qty DESC LIMIT 5`;
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
    hourly: Array.from({ length: 24 }, (_, h) => ({ hour: h, today: n(ht.find((x) => x.h === h)?.s), lastWeek: n(hw.find((x) => x.h === h)?.s) })),
    topItems: top.map((x) => ({ name: x.name, qty: n(x.qty) })),
    tables: { total: tables, occupied }, openOrders, kitchenQueue,
  });
});
