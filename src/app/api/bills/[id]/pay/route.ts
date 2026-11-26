import { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { recordPayments } from "@/lib/bill-service";
import { audit } from "@/lib/audit";

/** Record counter payments. Split payment: send several {mode, amount}. Card/UPI here = paid on the counter machine. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const { payments } = await parseBody(req, z.object({ payments: z.array(z.object({ mode: z.enum(["CASH", "CARD", "UPI", "WALLET"]), amount: z.number().int().min(0), tip: z.number().int().min(0).optional(), gatewayRef: z.string().max(100).optional() })).min(1).max(6) }));
  const r = await recordPayments(s.restaurantId, id, payments);
  await audit(s, "PAYMENT", "Bill", id, { payments, change: r.change });
  return ok(r);
});
