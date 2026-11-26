import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { sendMessage } from "@/lib/services/messaging";
/** Send the bill link by WhatsApp / SMS / email (mock provider logs it). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const d = await parseBody(req, z.object({ channel: z.enum(["WHATSAPP", "SMS", "EMAIL"]), to: z.string().min(5).max(100) }));
  const bill = await prisma.bill.findFirst({ where: { id, restaurantId: s.restaurantId }, include: { branch: { include: { restaurant: true } } } });
  if (!bill) throw new ApiError(404, "Bill not found.");
  const url = `${req.nextUrl.origin}/b/${bill.publicToken}`;
  await sendMessage(s.restaurantId, d.channel, d.to, `Thank you for dining at ${bill.branch.restaurant.name}! Your bill ${bill.billNo} of ₹${(bill.total / 100).toFixed(2)}: ${url}`);
  return ok({ ok: true, url });
});
