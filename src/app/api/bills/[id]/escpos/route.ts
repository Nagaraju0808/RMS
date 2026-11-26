import { NextRequest } from "next/server";
import { handler, requireSession } from "@/lib/api";
import { billForPrint, toReceipt } from "@/lib/bill-service";
import { receiptBytes } from "@/lib/escpos";
/** Raw ESC/POS bytes for a thermal printer (?width=58 or 80). Send to the printer with a print bridge / WebUSB / `lp -o raw`. */
export const GET = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("billing.manage"); const { id } = await params;
  const width = req.nextUrl.searchParams.get("width") === "58" ? 58 : 80;
  const b = await billForPrint({ id, restaurantId: s.restaurantId });
  return new Response(new Uint8Array(receiptBytes(toReceipt(b), width)), { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename=bill-${width}mm.bin` } });
});
