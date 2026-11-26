import { NextRequest } from "next/server";
import { z } from "zod";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { addItems, LineSchema } from "@/lib/order-service";
/** Add items to an existing order. send=true → a new KOT goes to the kitchen. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.create"); const { id } = await params;
  const d = await parseBody(req, z.object({ items: z.array(LineSchema).min(1), send: z.boolean().default(false) }));
  return ok(await addItems(s, id, d.items, d.send));
});
