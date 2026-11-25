import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { can } from "@/lib/roles";
import { totalHours, workedSessions } from "@/lib/staff";
/** My attendance (or ?userId= for managers) for ?month=YYYY-MM. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.self");
  const sp = req.nextUrl.searchParams;
  const userId = sp.get("userId") && can(s.role, "staff.manage", s.perms) ? sp.get("userId")! : s.sub;
  const u = await prisma.user.findFirst({ where: { id: userId, restaurantId: s.restaurantId } });
  if (!u) throw new ApiError(404, "Staff member not found.");
  const month = sp.get("month") || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const punches = await prisma.attendance.findMany({ where: { userId, at: { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) } }, orderBy: { at: "asc" } });
  const last = await prisma.attendance.findFirst({ where: { userId }, orderBy: { at: "desc" } });
  return ok({ user: { id: u.id, name: u.name }, onDuty: last?.type === "CLOCK_IN" && Date.now() - last.at.getTime() < 16 * 3600_000, sessions: workedSessions(punches), hours: totalHours(punches) });
});
/** Clock in / clock out (yourself). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.self");
  const { type } = await parseBody(req, z.object({ type: z.enum(["CLOCK_IN", "CLOCK_OUT"]) }));
  const last = await prisma.attendance.findFirst({ where: { userId: s.sub }, orderBy: { at: "desc" } });
  const on = last?.type === "CLOCK_IN" && Date.now() - last.at.getTime() < 16 * 3600_000;
  if (type === "CLOCK_IN" && on) throw new ApiError(400, "You are already clocked in.");
  if (type === "CLOCK_OUT" && !on) throw new ApiError(400, "You are not clocked in.");
  return ok(await prisma.attendance.create({ data: { userId: s.sub, type } }), 201);
});
