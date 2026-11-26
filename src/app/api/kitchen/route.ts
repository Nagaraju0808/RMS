import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";

/** Active kitchen tickets (KOTs) for this branch. ?station=<id> filters items to one station. ?served=1 includes served (last 2h). */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("kitchen.view"); const branchId = requireBranch(s);
  const station = req.nextUrl.searchParams.get("station");
  const since = new Date(Date.now() - 12 * 3600_000);
  const kots = await prisma.kot.findMany({
    where: { order: { branchId, restaurantId: s.restaurantId, status: { in: ["OPEN", "BILLED", "PAID"] } }, createdAt: { gte: since }, items: { some: { status: { in: ["NEW", "PREPARING", "READY"] } } } },
    include: { order: { select: { id: true, orderNo: true, tokenNo: true, type: true, notes: true, source: true, table: { select: { name: true } }, customerName: true } }, items: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  const stations = await prisma.kitchenStation.findMany({ where: { restaurantId: s.restaurantId } });
  const out = kots.map((k) => ({ ...k, items: station ? k.items.filter((i) => i.stationId === station) : k.items })).filter((k) => k.items.some((i) => ["NEW", "PREPARING", "READY"].includes(i.status)));
  return ok({ kots: out, stations });
});
