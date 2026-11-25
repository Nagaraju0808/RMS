import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { can } from "@/lib/roles";
import { emitToBranch } from "@/lib/realtime";

const Body = z.object({ name: z.string().min(1).max(20), seats: z.number().int().min(1).max(30), sectionId: z.string().nullable(), posX: z.number().int().min(0).max(5000), posY: z.number().int().min(0).max(5000), shape: z.enum(["square", "round", "rect"]), status: z.enum(["FREE", "OCCUPIED", "BILL_PRINTED", "CLEANING", "RESERVED"]) }).partial();
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("tables.view"); const branchId = requireBranch(s); const { id } = await params;
  const d = await parseBody(req, Body);
  const layoutChange = Object.keys(d).some((k) => k !== "status");
  if (layoutChange && !can(s.role, "tables.manage", s.perms)) throw new ApiError(403, "Only managers can change the floor plan.");
  const t = await prisma.diningTable.findFirst({ where: { id, branchId } });
  if (!t) notFound("Table");
  if (d.status === "FREE") {
    const open = await prisma.order.count({ where: { tableId: id, status: { in: ["OPEN", "HELD", "BILLED"] } } });
    if (open) throw new ApiError(400, "This table still has an open order. Settle or move it first.");
    await prisma.diningTable.updateMany({ where: { mergedIntoId: id }, data: { mergedIntoId: null, status: "FREE" } });
  }
  await prisma.diningTable.update({ where: { id }, data: { ...d, ...(d.status === "FREE" ? { mergedIntoId: null } : {}) } });
  emitToBranch(branchId, "table:updated", { id });
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("tables.manage"); const branchId = requireBranch(s); const { id } = await params;
  const t = await prisma.diningTable.findFirst({ where: { id, branchId }, include: { _count: { select: { orders: true } } } });
  if (!t) notFound("Table");
  if (t._count.orders) throw new ApiError(400, "This table has order history and cannot be deleted. Rename it instead.");
  await prisma.diningTable.delete({ where: { id } });
  return ok({ ok: true });
});
