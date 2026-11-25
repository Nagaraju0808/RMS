import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody } from "@/lib/api";
import { tableByToken } from "@/lib/public-table";
import { LineSchema } from "@/lib/order-service";
import { placeQrOrder } from "@/lib/qr-orders";

/** Customer places an order from the table QR (no login). */
export const POST = handler(async (req: NextRequest, { params }) => {
  const { token } = await params;
  const { table, branch, settings } = await tableByToken(token, req, 10);
  const d = await parseBody(req, z.object({ items: z.array(LineSchema).min(1).max(30), customerName: z.string().max(60).optional(), customerPhone: z.string().regex(/^\+?\d{10,13}$/, "Phone number looks wrong").optional().or(z.literal("")) }));
  return ok(await placeQrOrder({ restaurantId: branch.restaurantId, branchId: branch.id, tableId: table.id, tableName: table.name, autoAccept: settings.qrAutoAccept }, { items: d.items, customerName: d.customerName || undefined, customerPhone: d.customerPhone || undefined }), 201);
});

/** Live status of this table's current orders and bills (for the customer's phone). */
export const GET = handler(async (req: NextRequest, { params }) => {
  const { token } = await params;
  const { table } = await tableByToken(token, req, 120);
  const orders = await prisma.order.findMany({
    where: { tableId: table.id, status: { in: ["OPEN", "HELD", "BILLED", "PENDING_APPROVAL", "PAID"] }, createdAt: { gte: new Date(Date.now() - 6 * 3600_000) } },
    select: { id: true, status: true, closedAt: true, items: { select: { id: true, name: true, quantity: true, status: true, unitPrice: true, complimentary: true, menuItemId: true } }, bills: { where: { status: { not: "VOID" } }, select: { publicToken: true, total: true, paid: true, status: true, splitLabel: true } } },
    orderBy: { createdAt: "asc" },
  });
  // Hide orders that were paid more than 30 minutes ago (previous guests).
  return ok(orders.filter((o) => o.status !== "PAID" || (o.closedAt && Date.now() - o.closedAt.getTime() < 30 * 60_000)));
});
