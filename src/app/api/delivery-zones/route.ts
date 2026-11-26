import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
export const GET = handler(async () => {
  const s = await requireSession("delivery.manage"); const branchId = requireBranch(s);
  return ok(await prisma.deliveryZone.findMany({ where: { branchId }, orderBy: { charge: "asc" } }));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("branch.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ name: z.string().min(1), pincodes: z.array(z.string().regex(/^\d{6}$/, "Pincode must be 6 digits")).min(1), charge: z.number().int().min(0), minOrder: z.number().int().min(0).default(0), etaMins: z.number().int().min(5).default(40) }));
  return ok(await prisma.deliveryZone.create({ data: { ...d, branchId } }), 201);
});
