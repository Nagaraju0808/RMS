import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
const Body = z.object({ shiftId: z.string(), userId: z.string(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), remove: z.boolean().optional() });
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, Body);
  const [shift, user] = await Promise.all([prisma.shift.findFirst({ where: { id: d.shiftId, branchId } }), prisma.user.findFirst({ where: { id: d.userId, restaurantId: s.restaurantId } })]);
  if (!shift || !user) throw new ApiError(404, "Shift or staff member not found.");
  if (d.remove) { await prisma.shiftAssignment.deleteMany({ where: { shiftId: d.shiftId, userId: d.userId, date: d.date } }); return ok({ ok: true }); }
  await prisma.shiftAssignment.upsert({ where: { shiftId_userId_date: { shiftId: d.shiftId, userId: d.userId, date: d.date } }, update: {}, create: { shiftId: d.shiftId, userId: d.userId, date: d.date } });
  return ok({ ok: true });
});
