import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { ScheduleInput } from "@/lib/schemas";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const d = await parseBody(req, ScheduleInput);
  return ok(await prisma.menuSchedule.create({ data: { ...d, restaurantId: s.restaurantId } }), 201);
});
