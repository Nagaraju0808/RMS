import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { expectedCash } from "@/lib/billing";
import { todayStr } from "@/lib/orders";
import { audit } from "@/lib/audit";

async function summary(branchId: string, date: string) {
  const from = new Date(date + "T00:00:00"), to = new Date(from.getTime() + 86400_000);
  const pays = await prisma.payment.groupBy({ by: ["mode"], where: { bill: { branchId }, createdAt: { gte: from, lt: to }, status: "SUCCESS" }, _sum: { amount: true, tip: true }, _count: true });
  const refunds = await prisma.refund.groupBy({ by: ["mode"], where: { bill: { branchId }, createdAt: { gte: from, lt: to } }, _sum: { amount: true } });
  const cashIn = pays.find((p) => p.mode === "CASH")?._sum.amount ?? 0;
  const cashRefunds = refunds.find((r) => r.mode === "CASH")?._sum.amount ?? 0;
  return { date, byMode: pays.map((p) => ({ mode: p.mode, amount: p._sum.amount ?? 0, tips: p._sum.tip ?? 0, count: p._count })), refunds: refunds.map((r) => ({ mode: r.mode, amount: r._sum.amount ?? 0 })), cashIn, cashRefunds };
}
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("cash.close"); const branchId = requireBranch(s);
  const date = req.nextUrl.searchParams.get("date") || todayStr();
  const [sum, closings] = await Promise.all([summary(branchId, date), prisma.cashClosing.findMany({ where: { branchId }, orderBy: { createdAt: "desc" }, take: 30 })]);
  return ok({ ...sum, closings });
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("cash.close"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), openingCash: z.number().int().min(0).default(0), countedCash: z.number().int().min(0), notes: z.string().max(300).optional() }));
  const date = d.date || todayStr();
  const sum = await summary(branchId, date);
  const expected = expectedCash(d.openingCash, sum.cashIn, sum.cashRefunds);
  const c = await prisma.cashClosing.create({ data: { branchId, date, openingCash: d.openingCash, expectedCash: expected, countedCash: d.countedCash, difference: d.countedCash - expected, notes: d.notes, userId: s.sub } });
  await audit(s, "CASH_CLOSING", "CashClosing", c.id, { date, expected, counted: d.countedCash, difference: c.difference });
  return ok(c, 201);
});
