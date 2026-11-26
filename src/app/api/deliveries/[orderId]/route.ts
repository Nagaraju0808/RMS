import { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { moveDelivery } from "@/lib/delivery-service";
import { can } from "@/lib/roles";
/** Assign a rider (manager/cashier) or update status (rider or manager). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession(); const { orderId } = await params;
  const d = await parseBody(req, z.object({ status: z.enum(["ASSIGNED", "PICKED_UP", "ON_THE_WAY", "DELIVERED", "FAILED"]), riderId: z.string().optional() }));
  if (!can(s.role, "delivery.manage", s.perms) && !can(s.role, "delivery.ride", s.perms)) throw new ApiError(403, "You do not have permission to do this.");
  if (d.status === "ASSIGNED" && !can(s.role, "delivery.manage", s.perms)) throw new ApiError(403, "Only the manager or cashier can assign riders.");
  return ok(await moveDelivery(s.restaurantId, orderId, d.status, { id: s.sub, role: s.role, name: s.name }, d.riderId));
});
