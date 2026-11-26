import { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseBody, requireBranch, requireSession } from "@/lib/api";
import { moveStock } from "@/lib/stock-service";
import { audit } from "@/lib/audit";
/** Stock in (purchase without PO), wastage (with reason) or manual adjustment. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("inventory.manage"); const branchId = requireBranch(s);
  const d = await parseBody(req, z.object({ ingredientId: z.string(), type: z.enum(["PURCHASE", "WASTAGE", "ADJUSTMENT"]), quantity: z.number().refine((n) => n !== 0, "Quantity cannot be 0"), unit: z.enum(["G", "KG", "ML", "L", "PCS"]), reason: z.string().max(200).optional(), expiryDate: z.string().optional() }));
  if (d.type === "WASTAGE" && !d.reason) d.reason = "Wastage";
  const lvl = await moveStock(s.restaurantId, branchId, s.sub, { ...d, expiryDate: d.expiryDate ? new Date(d.expiryDate) : null });
  if (d.type !== "PURCHASE") await audit(s, d.type, "Stock", d.ingredientId, { quantity: d.quantity, unit: d.unit, reason: d.reason });
  return ok(lvl);
});
