import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { Session } from "./session";
import type { User } from "@prisma/client";

export const hashSecret = (s: string) => bcrypt.hash(s, 10);
export const checkSecret = (s: string, h?: string | null) => (h ? bcrypt.compare(s, h) : Promise.resolve(false));

export async function sessionForUser(u: User, branchId?: string | null): Promise<Session> {
  let b = branchId ?? u.branchId;
  if (!b) {
    const first = await prisma.branch.findFirst({ where: { restaurantId: u.restaurantId }, orderBy: { createdAt: "asc" } });
    b = first?.id ?? null;
  }
  return { sub: u.id, name: u.name, role: u.role, restaurantId: u.restaurantId, branchId: b, perms: u.permissions };
}

export const MAX_FAILED = 5;
export async function registerFailure(u: User) {
  const failed = u.failedLogins + 1;
  await prisma.user.update({
    where: { id: u.id },
    data: { failedLogins: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + 15 * 60_000) : null },
  });
}
export const isLocked = (u: User) => !!u.lockedUntil && u.lockedUntil > new Date();
