import { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { approveQrOrder } from "@/lib/qr-orders";
import { audit } from "@/lib/audit";
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const { accept } = await parseBody(req, z.object({ accept: z.boolean() }));
  const r = await approveQrOrder(s, id, accept);
  if (!accept) await audit(s, "REJECT_QR_ORDER", "Order", id);
  return ok(r);
});
