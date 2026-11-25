import { NextRequest } from "next/server";
import { handler, requireSession } from "@/lib/api";
import { billForPrint, toReceipt } from "@/lib/bill-service";
import { receiptPdf } from "@/lib/pdf";
export const GET = handler(async (_req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const b = await billForPrint({ id, restaurantId: s.restaurantId });
  const pdf = await receiptPdf(toReceipt(b));
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename=bill-${b.billNo.replace("/", "-")}.pdf` } });
});
