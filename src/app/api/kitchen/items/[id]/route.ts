import { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { setItemsStatus } from "@/lib/kitchen-server";
import { can } from "@/lib/roles";
import { ApiError } from "@/lib/api";
/** Change one item's kitchen status. Chefs move items; waiters/cashiers can mark READY items as SERVED. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession(); const { id } = await params;
  const { status } = await parseBody(req, z.object({ status: z.enum(["NEW", "PREPARING", "READY", "SERVED"]) }));
  if (!can(s.role, "kitchen.view", s.perms) && !(status === "SERVED" && can(s.role, "orders.create", s.perms))) throw new ApiError(403, "You do not have permission to do this.");
  return ok(await setItemsStatus(s, [id], status));
});
