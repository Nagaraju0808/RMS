import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
/** Ratings dashboard: average, distribution, last 30 days, low ratings. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("customers.manage");
  const days = Number(req.nextUrl.searchParams.get("days") || 30);
  const branchIds = (await prisma.branch.findMany({ where: { restaurantId: s.restaurantId }, select: { id: true } })).map((b) => b.id);
  const list = await prisma.feedback.findMany({ where: { branchId: { in: branchIds }, createdAt: { gte: new Date(Date.now() - days * 86400_000) } }, include: { customer: { select: { name: true, phone: true } }, order: { select: { orderNo: true } } }, orderBy: { createdAt: "desc" } });
  const avg = (k: "rating" | "foodRating" | "serviceRating") => { const v = list.map((f) => f[k]).filter((x): x is number => x != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : null; };
  return ok({ count: list.length, avg: avg("rating"), food: avg("foodRating"), service: avg("serviceRating"), distribution: [1, 2, 3, 4, 5].map((n) => list.filter((f) => f.rating === n).length), low: list.filter((f) => f.rating <= 2), recent: list.slice(0, 50) });
});
