import { z } from "zod";
import { prisma } from "./db";
import { ApiError } from "./api";
import { ItemInput } from "./schemas";

/** Make sure referenced ids belong to this restaurant (tenant safety). */
export async function assertMenuRefs(restaurantId: string, d: Partial<z.infer<typeof ItemInput>>) {
  if (d.categoryId && !(await prisma.category.findFirst({ where: { id: d.categoryId, restaurantId } }))) throw new ApiError(400, "Category does not exist.");
  if (d.taxRateId && !(await prisma.taxRate.findFirst({ where: { id: d.taxRateId, restaurantId } }))) throw new ApiError(400, "Tax rate does not exist.");
  if (d.stationId && !(await prisma.kitchenStation.findFirst({ where: { id: d.stationId, restaurantId } }))) throw new ApiError(400, "Kitchen station does not exist.");
  if (d.addonGroupIds?.length) {
    const n = await prisma.addonGroup.count({ where: { id: { in: d.addonGroupIds }, restaurantId } });
    if (n !== d.addonGroupIds.length) throw new ApiError(400, "Add-on group does not exist.");
  }
}
