import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { poStatus } from "@/lib/inventory";
/** Goods received: adds stock (with expiry dates) and updates the purchase order. received is in base units. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("inventory.manage"); const branchId = requireBranch(s); const { id } = await params;
  const d = await parseBody(req, z.object({ lines: z.array(z.object({ lineId: z.string(), received: z.number().min(0), expiryDate: z.string().optional() })) }));
  const po = await prisma.purchaseOrder.findFirst({ where: { id, branchId }, include: { lines: { include: { ingredient: true } } } });
  if (!po) notFound("Purchase order");
  if (po.status === "RECEIVED" || po.status === "CANCELLED") throw new ApiError(400, "This order is already closed.");
  await prisma.$transaction(async (tx) => {
    for (const r of d.lines) {
      const line = po.lines.find((l) => l.id === r.lineId); if (!line || r.received <= 0) continue;
      const lvl = await tx.stockLevel.upsert({ where: { branchId_ingredientId: { branchId, ingredientId: line.ingredientId } }, update: { quantity: { increment: r.received } }, create: { branchId, ingredientId: line.ingredientId, quantity: r.received } });
      await tx.stockMove.create({ data: { stockLevelId: lvl.id, type: "PURCHASE", quantity: r.received, refId: po.id, reason: "Goods received", userId: s.sub } });
      await tx.stockBatch.create({ data: { stockLevelId: lvl.id, quantity: r.received, expiryDate: r.expiryDate ? new Date(r.expiryDate) : null } });
      await tx.purchaseOrderLine.update({ where: { id: line.id }, data: { received: { increment: r.received }, expiryDate: r.expiryDate ? new Date(r.expiryDate) : undefined } });
      await tx.ingredient.update({ where: { id: line.ingredientId }, data: { costPerUnit: line.unitCost } }); // latest purchase price
    }
    const lines = await tx.purchaseOrderLine.findMany({ where: { poId: id } });
    await tx.purchaseOrder.update({ where: { id }, data: { status: poStatus(lines) } });
  });
  return ok({ ok: true });
});
