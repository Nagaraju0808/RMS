import { NextRequest } from "next/server";
import { handler, ok, requireSession } from "@/lib/api";
import { upsellFor } from "@/lib/smart-server";
/** "Often ordered together" for the POS cart. ?ids=a,b */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("orders.create");
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 20);
  return ok(ids.length ? await upsellFor(s.restaurantId, ids) : []);
});
