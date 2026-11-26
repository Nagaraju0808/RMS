import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { Report, cell } from "./report-utils";

export async function toXlsx(r: Report, subtitle: string): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(r.title.slice(0, 30).replace(/[\\/*?:[\]]/g, ""));
  ws.addRow([r.title]).font = { bold: true, size: 14 }; ws.addRow([subtitle]); ws.addRow([]);
  const head = ws.addRow(r.columns.map((c) => c.label + (c.type === "money" ? " (₹)" : ""))); head.font = { bold: true };
  for (const row of r.rows) ws.addRow(r.columns.map((c) => cell(row[c.key], c.type)));
  if (r.totals) { const t = ws.addRow(r.columns.map((c, i) => (i === 0 ? "Total" : c.key in r.totals! ? cell(r.totals![c.key], c.type) : ""))); t.font = { bold: true }; }
  r.columns.forEach((c, i) => { ws.getColumn(i + 1).width = Math.max(12, c.label.length + 4); if (c.type === "money") ws.getColumn(i + 1).numFmt = "#,##0.00"; });
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
export function toPdf(r: Report, subtitle: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const landscape = r.columns.length > 5;
    const doc = new PDFDocument({ size: "A4", layout: landscape ? "landscape" : "portrait", margin: 36 });
    const chunks: Buffer[] = []; doc.on("data", (c) => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks)));
    const W = doc.page.width - 72, colW = W / r.columns.length;
    const fmt = (v: any, t?: string) => { const x = cell(v, t as any); return typeof x === "number" && t === "money" ? `Rs. ${x.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : String(x); };
    doc.font("Helvetica-Bold").fontSize(16).text(r.title); doc.font("Helvetica").fontSize(9).fillColor("#555").text(subtitle).fillColor("black").moveDown();
    const row = (vals: string[], bold = false) => {
      if (doc.y > doc.page.height - 60) doc.addPage();
      const y = doc.y; doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      vals.forEach((v, i) => doc.text(v.slice(0, 40), 36 + i * colW, y, { width: colW - 4, align: r.columns[i].type === "money" || r.columns[i].type === "number" ? "right" : "left", lineBreak: false }));
      doc.moveDown(0.4); doc.moveTo(36, doc.y).lineTo(36 + W, doc.y).strokeColor("#ddd").stroke(); doc.moveDown(0.3);
    };
    row(r.columns.map((c) => c.label), true);
    for (const x of r.rows.slice(0, 2000)) row(r.columns.map((c) => fmt(x[c.key], c.type)));
    if (r.totals) row(r.columns.map((c, i) => (i === 0 ? "Total" : c.key in r.totals! ? fmt(r.totals![c.key], c.type) : "")), true);
    doc.end();
  });
}
