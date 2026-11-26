// Minimal ESC/POS receipt builder for 58mm (32 chars) and 80mm (48 chars) thermal printers.
const ESC = 0x1b, GS = 0x1d;
export type Receipt = { header: string[]; lines: { left: string; right: string }[]; totals: { left: string; right: string; bold?: boolean }[]; footer: string[] };

export function cols(width: 58 | 80) { return width === 58 ? 32 : 48; }
export function padLine(left: string, right: string, n: number): string {
  const l = left.length + right.length + 1 > n ? left.slice(0, Math.max(0, n - right.length - 2)) + "…" : left;
  return l + " ".repeat(Math.max(1, n - l.length - right.length)) + right;
}
/** Plain text version (also used for preview and tests). */
export function receiptText(r: Receipt, width: 58 | 80): string {
  const n = cols(width), center = (s: string) => " ".repeat(Math.max(0, Math.floor((n - s.length) / 2))) + s;
  const rule = "-".repeat(n);
  return [...r.header.map(center), rule, ...r.lines.map((l) => padLine(l.left, l.right, n)), rule, ...r.totals.map((t) => padLine(t.left, t.right, n)), rule, ...r.footer.map(center), "", ""].join("\n");
}
/** Bytes to send to the printer (init, text, feed, cut). Non-ASCII (₹) is replaced with "Rs". */
export function receiptBytes(r: Receipt, width: 58 | 80): Uint8Array {
  const text = receiptText(r, width).replace(/₹/g, "Rs").replace(/[^\x0a\x20-\x7e]/g, "?");
  const out = [ESC, 0x40, ESC, 0x61, 0x00, ...Array.from(Buffer.from(text, "ascii")), ESC, 0x64, 0x03, GS, 0x56, 0x42, 0x00];
  return Uint8Array.from(out);
}
