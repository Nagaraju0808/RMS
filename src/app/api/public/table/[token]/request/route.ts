import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody } from "@/lib/api";
import { tableByToken } from "@/lib/public-table";
import { emitToBranch } from "@/lib/realtime";
/** "Call waiter" / "Ask for bill" buttons. Repeated taps within 2 minutes do not create duplicates. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const { token } = await params;
  const { table, branch } = await tableByToken(token, req, 10);
  const { type } = await parseBody(req, z.object({ type: z.enum(["CALL_WAITER", "ASK_BILL"]) }));
  const recent = await prisma.tableRequest.findFirst({ where: { tableId: table.id, type, resolved: false, createdAt: { gte: new Date(Date.now() - 120_000) } } });
  if (!recent) await prisma.tableRequest.create({ data: { tableId: table.id, type } });
  emitToBranch(branch.id, "table:request", { tableId: table.id, table: table.name, type });
  return ok({ ok: true });
});
