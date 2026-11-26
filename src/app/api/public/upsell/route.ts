import { NextRequest } from "next/server";
import { handler, ok } from "@/lib/api";
import { tableByToken } from "@/lib/public-table";
import { upsellFor } from "@/lib/smart-server";
/** Same suggestions for the customer's QR menu. ?token=<table qr>&ids=a,b */
export const GET = handler(async (req: NextRequest) => {
  const { restaurant } = await tableByToken(req.nextUrl.searchParams.get("token") || "", req, 60);
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 20);
  return ok(ids.length ? await upsellFor(restaurant.id, ids) : []);
});
