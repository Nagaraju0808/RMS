import { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api";
import { billForPrint, billItems, toReceipt } from "@/lib/bill-service";
import { receiptText } from "@/lib/escpos";
/** Public bill link (shared by WhatsApp/SMS). The token is a long random id. */
export const GET = handler(async (_req: NextRequest, { params }) => {
  const { token } = await params;
  const b = await billForPrint({ publicToken: token });
  return ok({ billNo: b.billNo, total: b.total, paid: b.paid, status: b.status, restaurant: b.branch.restaurant.name, orderId: b.order.id, items: billItems(b).map((i) => ({ name: i.name, quantity: i.quantity })), receipt: receiptText(toReceipt(b), 80) });
});
