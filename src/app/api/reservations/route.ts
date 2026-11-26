import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { createReservation } from "@/lib/reservation-service";

/** Reservations between ?from and ?to (ISO dates). Default: today + next 7 days. Includes no-show count per phone. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s);
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(new Date().setHours(0, 0, 0, 0));
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date(from.getTime() + 8 * 86400_000);
  const list = await prisma.reservation.findMany({ where: { branchId, dateTime: { gte: from, lt: to } }, include: { table: true }, orderBy: { dateTime: "asc" } });
  const phones = [...new Set(list.map((r) => r.phone))];
  const noShows = await prisma.reservation.groupBy({ by: ["phone"], where: { branch: { restaurantId: s.restaurantId }, phone: { in: phones }, status: "NO_SHOW" }, _count: true });
  return ok(list.map((r) => ({ ...r, noShows: noShows.find((n) => n.phone === r.phone)?._count ?? 0 })));
});
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ name: z.string().min(1).max(80), phone: z.string().min(8).max(15), guests: z.number().int().min(1).max(50), dateTime: z.string(), tableId: z.string().nullable().optional(), notes: z.string().max(300).optional(), source: z.enum(["STAFF", "PHONE"]).default("STAFF") }));
  return ok(await createReservation(s.restaurantId, branchId, { ...d, dateTime: new Date(d.dateTime) }), 201);
});
