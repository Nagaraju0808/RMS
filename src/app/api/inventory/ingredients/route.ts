import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
export const IngredientInput = z.object({ name: z.string().min(1).max(80), unit: z.enum(["G", "ML", "PCS"]), costPerUnit: z.number().int().min(0), reorderLevel: z.number().min(0).default(0) });
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("inventory.manage");
  const d = await parseBody(req, IngredientInput);
  return ok(await prisma.ingredient.create({ data: { ...d, restaurantId: s.restaurantId } }), 201);
});
