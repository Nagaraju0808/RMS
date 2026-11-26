import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, notFound, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
import { emitToBranch } from "@/lib/realtime";
/** Change status (CONFIRMED / SEATED / COMPLETED / CANCELLED / NO_SHOW), table or time. */
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("reservations.manage"); const branchId = requireBranch(s); const { id } = await params;
  const d = await parseBody(req, z.object({ status: z.enum(["BOOKED", "CONFIRMED", "SEATED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(), tableId: z.string().nullable().optional(), dateTime: z.string().optional(), guests: z.number().int().min(1).optional(), notes: z.string().max(300).optional() }));
  const r = await prisma.reservation.findFirst({ where: { id, branchId } });
  if (!r) notFound("Reservation");
  if (d.tableId && !(await prisma.diningTable.findFirst({ where: { id: d.tableId, branchId } }))) notFound("Table");
  await prisma.reservation.update({ where: { id }, data: { ...d, dateTime: d.dateTime ? new Date(d.dateTime) : undefined } });
  if (d.status === "SEATED" && (d.tableId ?? r.tableId)) { await prisma.diningTable.update({ where: { id: (d.tableId ?? r.tableId)! }, data: { status: "OCCUPIED" } }); emitToBranch(branchId, "table:updated", {}); }
  if (d.status === "NO_SHOW" || d.status === "CANCELLED") await audit(s, d.status, "Reservation", id, { name: r.name, phone: r.phone });
  return ok({ ok: true });
});
