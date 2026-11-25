import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { baseOf, Unit } from "@/lib/inventory";
export const GET = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("inventory.view"); const { menuItemId } = await params;
  const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId: s.restaurantId }, include: { recipe: true, variants: true } });
  if (!item) notFound("Menu item");
  return ok(item);
});
/** Replace the whole recipe of a dish. variantId null = used by all sizes. */
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("inventory.manage"); const { menuItemId } = await params;
  const { lines } = await parseBody(req, z.object({ lines: z.array(z.object({ ingredientId: z.string(), variantId: z.string().nullable(), quantity: z.number().positive(), unit: z.enum(["G", "KG", "ML", "L", "PCS"]) })) }));
  const item = await prisma.menuItem.findFirst({ where: { id: menuItemId, restaurantId: s.restaurantId }, include: { variants: true } });
  if (!item) notFound("Menu item");
  const ings = await prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId, id: { in: lines.map((l) => l.ingredientId) } } });
  for (const l of lines) {
    const ing = ings.find((i) => i.id === l.ingredientId);
    if (!ing) throw new ApiError(400, "Ingredient not found.");
    if (baseOf(l.unit) !== baseOf(ing.unit as Unit)) throw new ApiError(400, `${ing.name} is measured in ${ing.unit}, not ${l.unit}.`);
    if (l.variantId && !item.variants.some((v) => v.id === l.variantId)) throw new ApiError(400, "Size not found.");
  }
  await prisma.$transaction([prisma.recipeLine.deleteMany({ where: { menuItemId } }), prisma.recipeLine.createMany({ data: lines.map((l) => ({ ...l, menuItemId })) })]);
  return ok({ ok: true });
});
