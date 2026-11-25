import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { hashSecret } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { StaffInput, checkStaffWrite } from "@/lib/staff-server";
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("staff.manage"); const { id } = await params;
  const target = await prisma.user.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!target) notFound("Staff member");
  if (s.role === "MANAGER" && (["OWNER", "MANAGER"].includes(target.role) || (target.branchId && target.branchId !== s.branchId))) throw new ApiError(403, "You cannot change this person.");
  const { pin, password, email, ...d } = await parseBody(req, StaffInput.partial());
  if (id === s.sub && (d.role && d.role !== target.role || d.active === false)) throw new ApiError(400, "You cannot change your own role or switch yourself off.");
  await checkStaffWrite(s, { ...d, pin, email }, id);
  await prisma.user.update({ where: { id }, data: { ...d, ...(email !== undefined ? { email: email ? email.toLowerCase() : null } : {}), ...(pin ? { pinHash: await hashSecret(pin) } : {}), ...(password ? { passwordHash: await hashSecret(password) } : {}) } });
  await audit(s, d.permissions ? "PERMISSIONS_CHANGE" : d.active === false ? "STAFF_DEACTIVATE" : "STAFF_UPDATE", "User", id, { name: target.name, ...d, pinChanged: !!pin, passwordChanged: !!password });
  return ok({ ok: true });
});
