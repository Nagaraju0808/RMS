import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("staff.manage"); const { id } = await params;
  const { status } = await parseBody(req, z.object({ status: z.enum(["APPROVED", "REJECTED"]) }));
  const l = await prisma.leave.findFirst({ where: { id, user: { restaurantId: s.restaurantId } } });
  if (!l) notFound("Leave");
  if (l.userId === s.sub) throw new ApiError(400, "You cannot approve your own leave.");
  await prisma.leave.update({ where: { id }, data: { status } });
  await audit(s, `LEAVE_${status}`, "Leave", id);
  return ok({ ok: true });
});
