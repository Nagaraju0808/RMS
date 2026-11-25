import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { createBills } from "@/lib/bill-service";

/** Today's bills (or ?date=YYYY-MM-DD). */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("billing.manage"); const branchId = requireBranch(s);
  const date = req.nextUrl.searchParams.get("date");
  const from = date ? new Date(date + "T00:00:00") : new Date(new Date().setHours(0, 0, 0, 0));
  const to = new Date(from.getTime() + 86400_000);
  return ok(await prisma.bill.findMany({ where: { restaurantId: s.restaurantId, branchId, createdAt: { gte: from, lt: to } }, include: { payments: true, refunds: true, order: { select: { orderNo: true, type: true, table: { select: { name: true } }, customerName: true } } }, orderBy: { createdAt: "desc" } }));
});
const Split = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("equal"), parts: z.number().int().min(2).max(50) }),
  z.object({ mode: z.literal("items"), groups: z.array(z.array(z.string())).min(2), labels: z.array(z.string()).optional() }),
]);
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("billing.manage");
  const d = await parseBody(req, z.object({ orderId: z.string(), split: Split.default({ mode: "none" }) }));
  return ok(await createBills(s, d.orderId, d.split), 201);
});
