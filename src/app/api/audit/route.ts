import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
/** Audit log with filters: ?userId ?action ?from ?to ?page. Managers see their branch only. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("audit.view");
  const sp = req.nextUrl.searchParams;
  const where: any = { restaurantId: s.restaurantId };
  if (s.role === "MANAGER") where.OR = [{ branchId: s.branchId }, { branchId: null }];
  if (sp.get("userId")) where.userId = sp.get("userId");
  if (sp.get("action")) where.action = sp.get("action");
  if (sp.get("from") || sp.get("to")) where.createdAt = { ...(sp.get("from") ? { gte: new Date(sp.get("from") + "T00:00:00") } : {}), ...(sp.get("to") ? { lt: new Date(new Date(sp.get("to") + "T00:00:00").getTime() + 86400_000) } : {}) };
  const page = Math.max(0, Number(sp.get("page") || 0));
  const [rows, total, actions, users] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: page * 50, take: 50 }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ where: { restaurantId: s.restaurantId }, distinct: ["action"], select: { action: true } }),
    prisma.user.findMany({ where: { restaurantId: s.restaurantId }, select: { id: true, name: true } }),
  ]);
  return ok({ rows, total, page, actions: actions.map((a) => a.action).sort(), users });
});
