import Papa from "papaparse";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, requireSession } from "@/lib/api";
import { CSV_COLUMNS, menuToRows } from "@/lib/menu";

/** Download menu as CSV (?format=csv) or Excel (?format=xlsx). */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const items = await prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId, active: true }, include: { category: true, variants: true, taxRate: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }] });
  const rows = menuToRows(items);
  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet("Menu");
    ws.columns = CSV_COLUMNS.map((c) => ({ header: c, key: c, width: 18 }));
    ws.addRows(rows);
    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=menu.xlsx" } });
  }
  const csv = Papa.unparse({ fields: [...CSV_COLUMNS], data: rows.map((r) => CSV_COLUMNS.map((c) => r[c])) });
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": "attachment; filename=menu.csv" } });
});
