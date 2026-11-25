import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
/** Shifts with assignments for the next 7 days. */
export const GET = handler(async () => {
  const s = await requireSession("staff.self"); const branchId = requireBranch(s);
  const from = new Date().toLocaleDateString("en-CA");
  return ok(await prisma.shift.findMany({ where: { branchId }, include: { assignments: { where: { date: { gte: from } }, include: { user: { select: { id: true, name: true, role: true } } } } }, orderBy: { startTime: "asc" } }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ name: z.string().min(1), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/) }));
  return ok(await prisma.shift.create({ data: { ...d, branchId } }), 201);
});
