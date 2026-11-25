import PDFDocument from "pdfkit";
import type { Receipt } from "./escpos";
/** Simple A5-ish PDF bill from the receipt data (Helvetica cannot draw ₹, so "Rs." is used). */
export function receiptPdf(r: Receipt): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: [300, 200 + 16 * (r.header.length + r.lines.length + r.totals.length + r.footer.length)], margin: 20 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c)); doc.on("end", () => resolve(Buffer.concat(chunks)));
    const fix = (s: string) => s.replace(/₹/g, "Rs.");
    r.header.forEach((h, i) => doc.font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(i === 0 ? 14 : 9).text(fix(h), { align: "center" }));
    const row = (l: string, rt: string, bold = false) => { const y = doc.y; doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9).text(fix(l), 20, y, { width: 190 }); doc.text(fix(rt), 210, y, { width: 70, align: "right" }); };
    doc.moveDown(0.5); doc.moveTo(20, doc.y).lineTo(280, doc.y).stroke(); doc.moveDown(0.3);
    r.lines.forEach((l) => row(l.left, l.right));
    doc.moveDown(0.3); doc.moveTo(20, doc.y).lineTo(280, doc.y).stroke(); doc.moveDown(0.3);
    r.totals.forEach((t) => row(t.left, t.right, t.bold));
    doc.moveDown(); r.footer.forEach((f) => doc.font("Helvetica").fontSize(9).text(fix(f), 20, doc.y, { align: "center", width: 260 }));
    doc.end();
  });
}
