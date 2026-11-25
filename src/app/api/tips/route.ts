import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { splitTips, totalHours } from "@/lib/staff";
import { audit } from "@/lib/audit";
/** Share the day's tips (from payments) among staff who worked that day, by hours worked. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.manage"); const branchId = requireBranch(s);
  const { date } = await parseBody(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  if (await prisma.tipShare.findFirst({ where: { date, user: { restaurantId: s.restaurantId, OR: [{ branchId }, { branchId: null }] } } })) throw new ApiError(409, "Tips for this day were already shared.");
  const from = new Date(date + "T00:00:00"), to = new Date(from.getTime() + 86400_000);
  const pool = (await prisma.payment.aggregate({ where: { bill: { branchId }, createdAt: { gte: from, lt: to } }, _sum: { tip: true } }))._sum.tip ?? 0;
  if (!pool) throw new ApiError(400, "No tips were collected on this day.");
  const staff = await prisma.user.findMany({ where: { restaurantId: s.restaurantId, branchId, role: { notIn: ["OWNER", "CUSTOMER"] } }, include: { attendance: { where: { at: { gte: from, lt: new Date(to.getTime() + 12 * 3600_000) } } } } });
  const hours = Object.fromEntries(staff.map((u) => [u.id, totalHours(u.attendance.map((a) => ({ type: a.type, at: a.at })).filter((a) => a.at < to || a.type === "CLOCK_OUT"))]));
  const shares = splitTips(pool, hours);
  if (!Object.keys(shares).length) throw new ApiError(400, "Nobody clocked in on this day.");
  await prisma.tipShare.createMany({ data: Object.entries(shares).map(([userId, amount]) => ({ userId, date, amount })) });
  await audit(s, "TIPS_SHARED", "TipShare", null, { date, pool, shares });
  return ok({ pool, shares: staff.filter((u) => shares[u.id]).map((u) => ({ name: u.name, hours: hours[u.id], amount: shares[u.id] })) });
});
