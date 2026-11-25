import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";

/** Floor plan: sections, tables and the open order on each table. */
export const GET = handler(async () => {
  const s = await requireSession("tables.view"); const branchId = requireBranch(s);
  const [sections, tables] = await Promise.all([
    prisma.section.findMany({ where: { branchId }, orderBy: { sortOrder: "asc" } }),
    prisma.diningTable.findMany({ where: { branchId }, orderBy: { name: "asc" }, include: {
      orders: { where: { status: { in: ["OPEN", "HELD", "BILLED", "PENDING_APPROVAL"] } }, select: { id: true, orderNo: true, status: true, createdAt: true, guests: true, items: { select: { unitPrice: true, quantity: true, status: true, complimentary: true } } } },
      requests: { where: { resolved: false } },
    } }),
  ]);
  return ok({ sections, tables });
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("tables.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(20), seats: z.number().int().min(1).max(30).default(4), sectionId: z.string().nullable().optional(), posX: z.number().int().default(20), posY: z.number().int().default(20), shape: z.enum(["square", "round", "rect"]).default("square") }));
  if (d.sectionId && !(await prisma.section.findFirst({ where: { id: d.sectionId, branchId } }))) d.sectionId = null;
  return ok(await prisma.diningTable.create({ data: { ...d, branchId } }), 201);
});
