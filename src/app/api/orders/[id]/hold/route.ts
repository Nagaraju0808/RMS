import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder } from "@/lib/order-service";
/** hold=true parks the order; hold=false resumes it. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const { hold } = await parseBody(req, z.object({ hold: z.boolean() }));
  const o = await loadOrder(s, id);
  if (!["OPEN", "HELD"].includes(o.status)) throw new ApiError(400, "Only open orders can be held.");
  await prisma.order.update({ where: { id }, data: { status: hold ? "HELD" : "OPEN" } });
  return ok(await loadOrder(s, id));
});
