import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { estimateWaitMins } from "@/lib/reservations";
import { resolveSettings } from "@/lib/features";
import { emitToBranch } from "@/lib/realtime";

export const GET = handler(async () => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s);
  return ok(await prisma.waitlistEntry.findMany({ where: { branchId, OR: [{ status: { in: ["WAITING", "NOTIFIED"] } }, { createdAt: { gte: new Date(Date.now() - 12 * 3600_000) } }] }, orderBy: { createdAt: "asc" } }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(80), phone: z.string().min(8).max(15), guests: z.number().int().min(1).max(50) }));
  const [branch, ahead, tables] = await Promise.all([
    prisma.branch.findUniqueOrThrow({ where: { id: branchId } }),
    prisma.waitlistEntry.count({ where: { branchId, status: "WAITING", guests: { gte: Math.max(1, d.guests - 2) } } }),
    prisma.diningTable.findMany({ where: { branchId, seats: { gte: d.guests } }, select: { status: true } }),
  ]);
  const quotedMins = estimateWaitMins(ahead, tables.length, tables.filter((t) => t.status === "FREE").length, resolveSettings(branch.settings).avgTableMins);
  const e = await prisma.waitlistEntry.create({ data: { ...d, branchId, quotedMins } });
  emitToBranch(branchId, "waitlist:updated", {});
  return ok(e, 201);
});
