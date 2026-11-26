import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("inventory.manage"); const { id } = await params;
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(80), costPerUnit: z.number().int().min(0), reorderLevel: z.number().min(0) }).partial());
  const r = await prisma.ingredient.updateMany({ where: { id, restaurantId: s.restaurantId }, data: d });
  if (!r.count) notFound("Ingredient");
  if (d.costPerUnit != null) await audit(s, "COST_CHANGE", "Ingredient", id, d);
  return ok({ ok: true });
});
export const DELETE = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("inventory.manage"); const { id } = await params;
  const i = await prisma.ingredient.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!i) notFound("Ingredient");
  await prisma.ingredient.delete({ where: { id } });
  await audit(s, "DELETE", "Ingredient", id, { name: i.name });
  return ok({ ok: true });
});
