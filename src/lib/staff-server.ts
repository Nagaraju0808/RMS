import { z } from "zod";
import { prisma } from "./db";
import { ApiError } from "./api";
import { checkSecret } from "./auth";
import { PERMISSIONS } from "./roles";

export const StaffInput = z.object({
  name: z.string().min(1).max(80), email: z.string().email().optional().or(z.literal("")), phone: z.string().max(15).optional(),
  role: z.enum(["OWNER", "MANAGER", "CASHIER", "WAITER", "CHEF", "DELIVERY"]), branchId: z.string().nullable().optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits").optional(), password: z.string().min(8).optional(),
  permissions: z.array(z.string()).optional(), hourlyRate: z.number().int().min(0).optional(), monthlySalary: z.number().int().min(0).optional(), active: z.boolean().optional(),
});
/** Only the owner can create owners/managers; managers create staff for their own branch. PINs must be unique in a restaurant. */
export async function checkStaffWrite(s: { role: string; restaurantId: string; branchId: string | null }, d: Partial<z.infer<typeof StaffInput>>, selfId?: string) {
  if (s.role === "MANAGER" && d.role && ["OWNER", "MANAGER"].includes(d.role)) throw new ApiError(403, "Only the owner can add owners or managers.");
  if (s.role === "MANAGER" && d.branchId !== undefined && d.branchId !== s.branchId) throw new ApiError(403, "Managers can only add staff to their own branch.");
  if (d.branchId && !(await prisma.branch.findFirst({ where: { id: d.branchId, restaurantId: s.restaurantId } }))) throw new ApiError(400, "Branch not found.");
  if (d.permissions?.some((p) => !(p in PERMISSIONS))) throw new ApiError(400, "Unknown permission.");
  if (d.pin) {
    const users = await prisma.user.findMany({ where: { restaurantId: s.restaurantId, pinHash: { not: null }, id: selfId ? { not: selfId } : undefined } });
    for (const u of users) if (await checkSecret(d.pin, u.pinHash)) throw new ApiError(409, "This PIN is already used by someone else. Choose another.");
  }
  if (d.email && (await prisma.user.findFirst({ where: { email: d.email.toLowerCase(), id: selfId ? { not: selfId } : undefined } }))) throw new ApiError(409, "This email is already used.");
}
