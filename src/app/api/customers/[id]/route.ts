import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
/** Profile: visit history, favourite dishes, spend, points history, feedback. */
export const GET = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("customers.manage"); const { id } = await params;
  const c = await prisma.customer.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { tier: true, loyaltyTxns: { orderBy: { createdAt: "desc" }, take: 30 }, feedback: { orderBy: { createdAt: "desc" }, take: 10 }, reservations: { orderBy: { dateTime: "desc" }, take: 10 },
    orders: { where: { status: "PAID" }, orderBy: { createdAt: "desc" }, take: 50, include: { items: { where: { status: { not: "CANCELLED" } } }, bills: { where: { status: { not: "VOID" } } } } } } });
  if (!c) notFound("Customer");
  const fav = new Map<string, number>();
  for (const o of c.orders) for (const i of o.items) fav.set(i.name, (fav.get(i.name) ?? 0) + i.quantity);
  return ok({ ...c, favourites: [...fav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, qty]) => ({ name, qty })), noShows: c.reservations.filter((r) => r.status === "NO_SHOW").length });
});
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("customers.manage"); const { id } = await params;
  const d = await parseBody(req, z.object({ name: z.string().max(80), email: z.string().email().or(z.literal("")), birthday: z.string().regex(/^\d{2}-\d{2}$/).or(z.literal("")), anniversary: z.string().regex(/^\d{2}-\d{2}$/).or(z.literal("")), tags: z.array(z.string()) }).partial());
  const r = await prisma.customer.updateMany({ where: { id, restaurantId: s.restaurantId }, data: { ...d, email: d.email === "" ? null : d.email, birthday: d.birthday === "" ? null : d.birthday, anniversary: d.anniversary === "" ? null : d.anniversary } });
  if (!r.count) notFound("Customer");
  return ok({ ok: true });
});
