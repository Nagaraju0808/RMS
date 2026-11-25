import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/ratelimit";
import { createReservation } from "@/lib/reservation-service";
import { resolveFeatures, RestaurantTypeName } from "@/lib/features";

async function restaurant(slug: string) {
  const r = await prisma.restaurant.findUnique({ where: { slug }, include: { branches: true } });
  if (!r) notFound("Restaurant");
  return r;
}
export const GET = handler(async (_req: NextRequest, { params }) => {
  const r = await restaurant((await params).slug);
  return ok({ name: r.name, logoUrl: r.logoUrl, branches: r.branches.filter((b) => resolveFeatures(b.features, r.type as RestaurantTypeName).reservations).map((b) => ({ id: b.id, name: b.name, address: b.address })) });
});
/** Online table booking form. */
export const POST = handler(async (req: NextRequest, { params }) => {
  if (!rateLimit(`book:${clientIp(req)}`, 5, 60_000)) throw new ApiError(429, "Too many bookings. Please call us.");
  const r = await restaurant((await params).slug);
  const d = await parseBody(req, z.object({ branchId: z.string(), name: z.string().min(1).max(80), phone: z.string().regex(/^\+?\d{10,13}$/, "Phone number looks wrong"), guests: z.number().int().min(1).max(20), dateTime: z.string(), notes: z.string().max(300).optional() }));
  const b = r.branches.find((x) => x.id === d.branchId);
  if (!b || !resolveFeatures(b.features, r.type as RestaurantTypeName).reservations) throw new ApiError(400, "Bookings are not available at this branch.");
  const res = await createReservation(r.id, b.id, { ...d, dateTime: new Date(d.dateTime), source: "ONLINE" });
  return ok({ id: res.id, dateTime: res.dateTime }, 201);
});
