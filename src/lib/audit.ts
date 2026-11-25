import { prisma } from "./db";
import type { Session } from "./session";
/** Record an important action (discount, cancel, refund, price change, delete...). */
export async function audit(s: Pick<Session, "restaurantId" | "branchId" | "sub" | "name"> | null, action: string, entity: string, entityId?: string | null, details?: unknown, restaurantId?: string) {
  const rid = s?.restaurantId ?? restaurantId;
  if (!rid) return;
  await prisma.auditLog.create({
    data: { restaurantId: rid, branchId: s?.branchId ?? null, userId: s?.sub ?? null, userName: s?.name ?? "system", action, entity, entityId: entityId ?? null, details: (details ?? undefined) as any },
  });
}
