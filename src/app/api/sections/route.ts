import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("tables.manage"); const branchId = requireBranch(s);
  const { name } = await parseBody(req, z.object({ name: z.string().min(1).max(40) }));
  const n = await prisma.section.count({ where: { branchId } });
  return ok(await prisma.section.create({ data: { name, branchId, sortOrder: n } }), 201);
});
