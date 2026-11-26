import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { setItemsStatus } from "@/lib/kitchen-server";
/** Bump a whole ticket (optionally only one station's items). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("kitchen.view"); const { id } = await params;
  const { status, stationId } = await parseBody(req, z.object({ status: z.enum(["PREPARING", "READY", "SERVED"]), stationId: z.string().optional() }));
  const kot = await prisma.kot.findFirst({ where: { id, order: { restaurantId: s.restaurantId, branchId: s.branchId ?? undefined } }, include: { items: true } });
  if (!kot) throw new ApiError(404, "Ticket not found.");
  const ids = kot.items.filter((i) => (!stationId || i.stationId === stationId) && !["CANCELLED", "SERVED"].includes(i.status)).map((i) => i.id);
  return ok(await setItemsStatus(s, ids, status));
});
