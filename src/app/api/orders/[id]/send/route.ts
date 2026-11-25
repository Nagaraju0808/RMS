import { NextRequest } from "next/server";
import { handler, ok, requireSession } from "@/lib/api";
import { sendKot } from "@/lib/order-service";
export const POST = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  return ok(await sendKot(s, id));
});
