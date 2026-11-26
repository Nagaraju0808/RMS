import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { parseVoiceOrder } from "@/lib/smart";
/** Turn spoken words ("two butter naan and one paneer tikka half") into order lines. The waiter confirms before sending. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.create");
  const { text } = await parseBody(req, z.object({ text: z.string().min(1).max(500) }));
  const items = await prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId, active: true }, select: { id: true, name: true, variants: { select: { id: true, name: true } } } });
  return ok(parseVoiceOrder(text, items));
});
