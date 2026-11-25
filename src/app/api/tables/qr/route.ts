import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { handler, ok, requireBranch, requireSession } from "@/lib/api";
/** QR code images (data URLs) for every table of the branch. */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("tables.manage"); const branchId = requireBranch(s);
  const origin = process.env.PUBLIC_URL || req.nextUrl.origin;
  const tables = await prisma.diningTable.findMany({ where: { branchId }, orderBy: { name: "asc" }, include: { section: true } });
  return ok(await Promise.all(tables.map(async (t) => {
    const url = `${origin}/t/${t.qrToken}`;
    return { id: t.id, name: t.name, section: t.section?.name, url, dataUrl: await QRCode.toDataURL(url, { margin: 1, width: 300 }) };
  })));
});
/** Make new QR codes for all tables (old printed codes stop working). */
export const POST = handler(async () => {
  const s = await requireSession("tables.manage"); const branchId = requireBranch(s);
  const tables = await prisma.diningTable.findMany({ where: { branchId } });
  for (const t of tables) await prisma.diningTable.update({ where: { id: t.id }, data: { qrToken: crypto.randomUUID().replace(/-/g, "") } });
  return ok({ ok: true });
});
