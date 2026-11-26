import Papa from "papaparse";
import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, requireSession } from "@/lib/api";
import { parseMenuRows } from "@/lib/menu";
import { audit } from "@/lib/audit";

/** Upload a CSV or XLSX file (multipart field "file"). Existing items with the same name+category are updated. */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession("menu.manage");
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Please choose a CSV or Excel file.");
  if (file.size > 2_000_000) throw new ApiError(400, "File is too big (max 2 MB).");
  let rows: Record<string, string>[] = [];
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await file.arrayBuffer() as any);
    const ws = wb.worksheets[0]; const header: string[] = [];
    ws.getRow(1).eachCell((c, i) => (header[i] = String(c.value ?? "").trim()));
    ws.eachRow((row, n) => { if (n === 1) return; const r: Record<string, string> = {}; header.forEach((h, i) => { if (h) r[h] = row.getCell(i).value == null ? "" : String(row.getCell(i).value); }); rows.push(r); });
  } else {
    rows = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true }).data;
  }
  const { items, errors } = parseMenuRows(rows);
  if (errors.length && !items.length) throw new ApiError(400, "No valid rows.", errors);
  const taxRates = await prisma.taxRate.findMany({ where: { restaurantId: s.restaurantId } });
  let created = 0, updated = 0;
  for (const it of items) {
    let cat = await prisma.category.findFirst({ where: { restaurantId: s.restaurantId, name: it.category } });
    if (!cat) cat = await prisma.category.create({ data: { restaurantId: s.restaurantId, name: it.category } });
    const taxRateId = it.taxPercent != null ? taxRates.find((t) => t.ratePercent === it.taxPercent)?.id : undefined;
    const data = { name: it.name, description: it.description, foodType: it.foodType, spiceLevel: it.spiceLevel, allergens: it.allergens, priceDineIn: it.priceDineIn, priceTakeaway: it.priceTakeaway ?? null, priceOnline: it.priceOnline ?? null, inStock: it.inStock, ...(taxRateId ? { taxRateId } : {}) };
    const existing = await prisma.menuItem.findFirst({ where: { restaurantId: s.restaurantId, categoryId: cat.id, name: it.name } });
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data });
      if (it.variants.length) { await prisma.variant.deleteMany({ where: { menuItemId: existing.id, orderItems: { none: {} } } }); await prisma.variant.createMany({ data: it.variants.map((v, i) => ({ ...v, menuItemId: existing.id, sortOrder: i })) }); }
      updated++;
    } else {
      await prisma.menuItem.create({ data: { ...data, restaurantId: s.restaurantId, categoryId: cat.id, variants: { create: it.variants.map((v, i) => ({ ...v, sortOrder: i })) } } });
      created++;
    }
  }
  await audit(s, "MENU_IMPORT", "Menu", null, { created, updated, errors: errors.length });
  return ok({ created, updated, errors });
});
