import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { hashSecret } from "@/lib/auth";
import { StaffInput, checkStaffWrite } from "@/lib/staff-server";
import { audit } from "@/lib/audit";
import { PERMISSIONS } from "@/lib/roles";

const STAFF_FIELDS = { id: true, name: true, email: true, phone: true, role: true, branchId: true, permissions: true, active: true, hourlyRate: true, monthlySalary: true, createdAt: true } as const;
export const GET = handler(async () => {
  const s = await requireSession("staff.manage");
  const where = { restaurantId: s.restaurantId, ...(s.role === "MANAGER" ? { OR: [{ branchId: s.branchId }, { branchId: null, role: { not: "OWNER" as const } }] } : {}) };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const staff = await prisma.user.findMany({ where, select: { ...STAFF_FIELDS, attendance: { where: { at: { gte: today } }, orderBy: { at: "desc" }, take: 1 } }, orderBy: [{ active: "desc" }, { name: "asc" }] });
  return ok({ staff: staff.map(({ attendance, ...u }) => ({ ...u, onDuty: attendance[0]?.type === "CLOCK_IN" })), permissions: Object.keys(PERMISSIONS) });
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.manage");
  const { pin, password, email, ...d } = await parseBody(req, StaffInput);
  if (s.role === "MANAGER") d.branchId = d.branchId ?? s.branchId;
  await checkStaffWrite(s, { ...d, pin, email });
  if (!pin && !password) throw new ApiError(400, "Give a 4-digit PIN or a password so they can log in.");
  const u = await prisma.user.create({ data: { ...d, email: email ? email.toLowerCase() : null, restaurantId: s.restaurantId, pinHash: pin ? await hashSecret(pin) : null, passwordHash: password ? await hashSecret(password) : null }, select: STAFF_FIELDS });
  await audit(s, "STAFF_CREATE", "User", u.id, { name: u.name, role: u.role });
  return ok(u, 201);
});
