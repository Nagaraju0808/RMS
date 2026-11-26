import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { sendMessage } from "@/lib/services/messaging";
import { emitToBranch } from "@/lib/realtime";
/** NOTIFIED sends "your table is ready" (SMS/WhatsApp – mock). */
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s); const { id } = await params;
  const { status, channel } = await parseBody(req, z.object({ status: z.enum(["WAITING", "NOTIFIED", "SEATED", "LEFT"]), channel: z.enum(["SMS", "WHATSAPP"]).default("WHATSAPP") }));
  const e = await prisma.waitlistEntry.findFirst({ where: { id, branchId }, include: { branch: { include: { restaurant: true } } } });
  if (!e) notFound("Waitlist entry");
  if (status === "NOTIFIED") await sendMessage(s.restaurantId, channel, e.phone, `Hi ${e.name}, your table at ${e.branch.restaurant.name} is ready! Please come to the host desk.`);
  await prisma.waitlistEntry.update({ where: { id }, data: { status, notifiedAt: status === "NOTIFIED" ? new Date() : undefined } });
  emitToBranch(branchId, "waitlist:updated", {});
  return ok({ ok: true });
});
