import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, notFound, ok } from "@/lib/api";
/** Customer delivery tracking page data. */
export const GET = handler(async (_req: NextRequest, { params }) => {
  const { token } = await params;
  const d = await prisma.delivery.findUnique({ where: { trackToken: token }, include: { rider: { select: { name: true } }, order: { select: { orderNo: true, status: true, branch: { select: { name: true, phone: true, restaurant: { select: { name: true } } } }, items: { select: { name: true, quantity: true, status: true } } } } } });
  if (!d) notFound("Order");
  return ok({ status: d.status, history: d.history, rider: d.rider?.name, order: d.order });
});
