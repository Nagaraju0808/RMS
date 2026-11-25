import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { costOf, toBase, Unit } from "@/lib/inventory";
export const GET = handler(async () => {
  const s = await requireSession("inventory.manage"); const branchId = requireBranch(s);
  return ok(await prisma.purchaseOrder.findMany({ where: { branchId }, include: { supplier: true, lines: { include: { ingredient: true } } }, orderBy: { createdAt: "desc" }, take: 100 }));
});
/** Create a purchase order. Quantities in any unit; unit cost per kg / litre / piece (paise). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("inventory.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ supplierId: z.string(), dueDate: z.string().optional(), lines: z.array(z.object({ ingredientId: z.string(), quantity: z.number().positive(), unit: z.enum(["G", "KG", "ML", "L", "PCS"]), unitCost: z.number().int().min(0) })).min(1) }));
  if (!(await prisma.supplier.findFirst({ where: { id: d.supplierId, restaurantId: s.restaurantId } }))) throw new ApiError(400, "Supplier not found.");
  const ings = await prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId, id: { in: d.lines.map((l) => l.ingredientId) } } });
  const lines = d.lines.map((l) => { const ing = ings.find((i) => i.id === l.ingredientId); if (!ing) throw new ApiError(400, "Ingredient not found."); try { return { ingredientId: ing.id, quantity: toBase(l.quantity, l.unit, ing.unit as Unit), unitCost: l.unitCost, base: ing.unit as Unit }; } catch (e: any) { throw new ApiError(400, e.message); } });
  const total = lines.reduce((a, l) => a + costOf(l.quantity, l.base, l.unitCost), 0);
  return ok(await prisma.purchaseOrder.create({ data: { branchId, supplierId: d.supplierId, status: "ORDERED", total, dueDate: d.dueDate ? new Date(d.dueDate) : null, lines: { create: lines.map(({ base: _b, ...l }) => l) } } }), 201);
});
