import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, requireSession } from "@/lib/api";
import { CategoryInput } from "@/lib/schemas";
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const d = await parseBody(req, CategoryInput);
  return ok(await prisma.category.create({ data: { ...d, nameI18n: d.nameI18n ?? {}, restaurantId: s.restaurantId } }), 201);
});
