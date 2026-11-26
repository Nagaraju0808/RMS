import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { ingestAggregatorOrder } from "@/lib/online-service";
/** Test button: pretend Swiggy/Zomato sent us an order (mock aggregator). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("delivery.manage"); const branchId = requireBranch(s);
  const { platform } = await parseBody(req, z.object({ platform: z.enum(["SWIGGY", "ZOMATO"]) }));
  const items = (await prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId, active: true, inStock: true, scheduleIds: { isEmpty: true } }, take: 20 })).sort(() => Math.random() - 0.5).slice(0, 2);
  const body = { order_id: `${platform.slice(0, 3)}-${Date.now()}`, customer: { name: "Test Customer", phone: "9000000000" }, items: items.map((i) => ({ item_id: i.id, name: i.name, quantity: 1, price: i.priceOnline ?? i.priceDineIn })), instructions: "Mock order" };
  return ok(await ingestAggregatorOrder(platform, s.restaurantId, branchId, body), 201);
});
