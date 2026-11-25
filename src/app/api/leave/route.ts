import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { can } from "@/lib/roles";
export const GET = handler(async () => {
  const s = await requireSession("staff.self");
  const all = can(s.role, "staff.manage", s.perms);
  return ok(await prisma.leave.findMany({ where: all ? { user: { restaurantId: s.restaurantId } } : { userId: s.sub }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 100 }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.self");
  const d = await parseBody(req, z.object({ fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), reason: z.string().max(200).optional() }));
  if (d.toDate < d.fromDate) throw new ApiError(400, "End date is before start date.");
  return ok(await prisma.leave.create({ data: { ...d, userId: s.sub } }), 201);
});
