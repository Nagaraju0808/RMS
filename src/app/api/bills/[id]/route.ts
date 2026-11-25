import { NextRequest } from "next/server";
import { handler, ok, requireSession } from "@/lib/api";
import { billForPrint, toReceipt } from "@/lib/bill-service";
import { receiptText } from "@/lib/escpos";
export const GET = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const b = await billForPrint({ id, restaurantId: s.restaurantId });
  return ok({ ...b, receipt80: receiptText(toReceipt(b), 80), receipt58: receiptText(toReceipt(b), 58) });
});
