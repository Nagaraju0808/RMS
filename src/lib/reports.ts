// All reports. Each returns { title, columns, rows } so the screen, Excel and PDF use the same data.
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { Report, fillHours, sumBy, menuClass } from "./report-utils";
import { dishCost, Unit } from "./inventory";

export type Scope = { restaurantId: string; branchIds: string[]; from: Date; to: Date };
const bIn = (s: Scope) => Prisma.join(s.branchIds);
const n = (v: any) => Number(v ?? 0);

async function sales(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT to_char(b."createdAt", 'YYYY-MM-DD') AS day, COUNT(*)::int AS bills, SUM(b.subtotal)::bigint AS gross, SUM(b.discount)::bigint AS discount, SUM(b.cgst + b.sgst + b.igst)::bigint AS tax, SUM(b.total)::bigint AS total
    FROM "Bill" b WHERE b."branchId" IN (${bIn(s)}) AND b.status IN ('PAID','PARTIALLY_PAID','REFUNDED') AND b."createdAt" >= ${s.from} AND b."createdAt" < ${s.to} GROUP BY 1 ORDER BY 1`;
  const r = rows.map((x) => ({ day: x.day, bills: n(x.bills), gross: n(x.gross), discount: n(x.discount), tax: n(x.tax), total: n(x.total), avgBill: x.bills ? Math.round(n(x.total) / n(x.bills)) : 0 }));
  const columns = [{ key: "day", label: "Date" }, { key: "bills", label: "Bills", type: "number" }, { key: "gross", label: "Item sales", type: "money" }, { key: "discount", label: "Discounts", type: "money" }, { key: "tax", label: "Tax", type: "money" }, { key: "total", label: "Total", type: "money" }, { key: "avgBill", label: "Avg bill", type: "money" }] as Report["columns"];
  return { title: "Sales by day", columns, rows: r, chart: { x: "day", y: "total", kind: "bar" }, totals: sumBy(r, columns.filter((c) => c.key !== "avgBill")) };
}
async function itemsReport(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT oi.name, c.name AS category, SUM(oi.quantity)::int AS qty, SUM(oi."unitPrice" * oi.quantity)::bigint AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "MenuItem" m ON m.id = oi."menuItemId" JOIN "Category" c ON c.id = m."categoryId"
    WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'PAID' AND oi.status <> 'CANCELLED' AND NOT oi.complimentary AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to}
    GROUP BY 1, 2 ORDER BY revenue DESC`;
  const r = rows.map((x, i) => ({ rank: i + 1, name: x.name, category: x.category, qty: n(x.qty), revenue: n(x.revenue) }));
  return { title: "Item-wise sales (best to worst)", columns: [{ key: "rank", label: "#" }, { key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "qty", label: "Qty sold", type: "number" }, { key: "revenue", label: "Revenue", type: "money" }], rows: r, chart: { x: "name", y: "revenue", kind: "bar" } };
}
async function categories(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT c.name AS category, SUM(oi.quantity)::int AS qty, SUM(oi."unitPrice" * oi.quantity)::bigint AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" JOIN "MenuItem" m ON m.id = oi."menuItemId" JOIN "Category" c ON c.id = m."categoryId"
    WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'PAID' AND oi.status <> 'CANCELLED' AND NOT oi.complimentary AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} GROUP BY 1 ORDER BY revenue DESC`;
  const total = rows.reduce((a, x) => a + n(x.revenue), 0);
  return { title: "Category-wise sales", columns: [{ key: "category", label: "Category" }, { key: "qty", label: "Qty", type: "number" }, { key: "revenue", label: "Revenue", type: "money" }, { key: "share", label: "Share", type: "percent" }], rows: rows.map((x) => ({ category: x.category, qty: n(x.qty), revenue: n(x.revenue), share: total ? Math.round((n(x.revenue) / total) * 1000) / 10 : 0 })), chart: { x: "category", y: "revenue", kind: "bar" } };
}
async function hourly(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT EXTRACT(HOUR FROM o."createdAt")::int AS hour, COUNT(*)::int AS orders, COALESCE(SUM(b.total),0)::bigint AS sales
    FROM "Order" o LEFT JOIN "Bill" b ON b."orderId" = o.id AND b.status = 'PAID' WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'PAID' AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} GROUP BY 1`;
  const days = Math.round((s.to.getTime() - s.from.getTime()) / 86400_000);
  return { title: "Busy hours", columns: [{ key: "hour", label: "Hour" }, { key: "orders", label: "Orders", type: "number" }, { key: "avgOrdersPerDay", label: "Avg orders / day", type: "number" }, { key: "sales", label: "Sales", type: "money" }], rows: fillHours(rows, days), chart: { x: "hour", y: "orders", kind: "bar" } };
}
async function payments(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT p.mode, COUNT(*)::int AS count, SUM(p.amount)::bigint AS amount, SUM(p.tip)::bigint AS tips FROM "Payment" p JOIN "Bill" b ON b.id = p."billId"
    WHERE b."branchId" IN (${bIn(s)}) AND p."createdAt" >= ${s.from} AND p."createdAt" < ${s.to} GROUP BY 1 ORDER BY amount DESC`;
  const refunds = await prisma.$queryRaw<any[]>`SELECT r.mode, SUM(r.amount)::bigint AS amount FROM "Refund" r JOIN "Bill" b ON b.id = r."billId" WHERE b."branchId" IN (${bIn(s)}) AND r."createdAt" >= ${s.from} AND r."createdAt" < ${s.to} GROUP BY 1`;
  const r = rows.map((x) => ({ mode: x.mode, count: n(x.count), amount: n(x.amount), tips: n(x.tips), refunds: n(refunds.find((y) => y.mode === x.mode)?.amount) }));
  const cols: Report["columns"] = [{ key: "mode", label: "Mode" }, { key: "count", label: "Payments", type: "number" }, { key: "amount", label: "Amount", type: "money" }, { key: "tips", label: "Tips", type: "money" }, { key: "refunds", label: "Refunds", type: "money" }];
  return { title: "Payment modes", columns: cols, rows: r, chart: { x: "mode", y: "amount", kind: "bar" }, totals: sumBy(r, cols) };
}
async function discounts(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT to_char(b."createdAt", 'YYYY-MM-DD') AS day, o."orderNo", COALESCE(o."couponCode", o."discountReason", '') AS reason, u.name AS staff, b.subtotal, b.discount
    FROM "Bill" b JOIN "Order" o ON o.id = b."orderId" LEFT JOIN "User" u ON u.id = o."waiterId" WHERE b."branchId" IN (${bIn(s)}) AND b.status <> 'VOID' AND b.discount > 0 AND b."createdAt" >= ${s.from} AND b."createdAt" < ${s.to} ORDER BY b."createdAt" DESC LIMIT 2000`;
  const comp = await prisma.$queryRaw<any[]>`SELECT to_char(o."createdAt", 'YYYY-MM-DD') AS day, o."orderNo", 'Complimentary: ' || oi.name AS reason, u.name AS staff, (oi."unitPrice"*oi.quantity)::bigint AS subtotal, (oi."unitPrice"*oi.quantity)::bigint AS discount
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" LEFT JOIN "User" u ON u.id = o."waiterId" WHERE o."branchId" IN (${bIn(s)}) AND oi.complimentary AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to}`;
  const r = [...rows, ...comp].map((x) => ({ day: x.day, orderNo: x.orderNo, reason: x.reason, staff: x.staff, subtotal: n(x.subtotal), discount: n(x.discount) }));
  const cols: Report["columns"] = [{ key: "day", label: "Date" }, { key: "orderNo", label: "Order #" }, { key: "reason", label: "Reason / coupon" }, { key: "staff", label: "Staff" }, { key: "subtotal", label: "Order value", type: "money" }, { key: "discount", label: "Discount", type: "money" }];
  return { title: "Discounts & complimentary", columns: cols, rows: r, totals: sumBy(r, cols) };
}
async function cancellations(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT to_char(o."createdAt", 'YYYY-MM-DD HH24:MI') AS at, o."orderNo", oi.name, oi.quantity, (oi."unitPrice"*oi.quantity)::bigint AS value, COALESCE(oi."cancelReason", o."cancelReason") AS reason, (oi."kotId" IS NOT NULL) AS sent
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."branchId" IN (${bIn(s)}) AND oi.status = 'CANCELLED' AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} AND COALESCE(o."cancelReason",'') NOT LIKE 'Merged%' ORDER BY o."createdAt" DESC LIMIT 2000`;
  const r = rows.map((x) => ({ at: x.at, orderNo: x.orderNo, name: x.name, quantity: x.quantity, value: n(x.value), reason: x.reason, sentToKitchen: x.sent ? "yes" : "no" }));
  const cols: Report["columns"] = [{ key: "at", label: "When" }, { key: "orderNo", label: "Order #" }, { key: "name", label: "Item" }, { key: "quantity", label: "Qty", type: "number" }, { key: "value", label: "Value", type: "money" }, { key: "reason", label: "Reason" }, { key: "sentToKitchen", label: "Was cooked?" }];
  return { title: "Cancellations", columns: cols, rows: r, totals: sumBy(r, cols) };
}
async function gst(s: Scope): Promise<Report> {
  const bills = await prisma.bill.findMany({ where: { branchId: { in: s.branchIds }, status: { in: ["PAID", "PARTIALLY_PAID", "REFUNDED"] }, createdAt: { gte: s.from, lt: s.to } }, select: { breakdown: true } });
  const taxRates = await prisma.taxRate.findMany({ where: { restaurantId: s.restaurantId } });
  const g = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
  for (const b of bills) for (const t of ((b.breakdown as any)?.taxGroups ?? []) as any[]) {
    const x = g.get(t.ratePercent) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    g.set(t.ratePercent, { taxable: x.taxable + t.taxable, cgst: x.cgst + t.cgst, sgst: x.sgst + t.sgst, igst: x.igst + t.igst });
  }
  const r = [...g.entries()].sort((a, b) => a[0] - b[0]).map(([rate, x]) => ({ rate: `${rate}%`, hsnSac: taxRates.find((t) => t.ratePercent === rate)?.hsnSac ?? "", ...x, totalTax: x.cgst + x.sgst + x.igst }));
  const cols: Report["columns"] = [{ key: "rate", label: "GST rate" }, { key: "hsnSac", label: "HSN/SAC" }, { key: "taxable", label: "Taxable value", type: "money" }, { key: "cgst", label: "CGST", type: "money" }, { key: "sgst", label: "SGST", type: "money" }, { key: "igst", label: "IGST", type: "money" }, { key: "totalTax", label: "Total tax", type: "money" }];
  return { title: `GST summary (${bills.length} invoices)`, columns: cols, rows: r, totals: sumBy(r, cols) };
}
async function staff(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT u.name, u.role, COUNT(DISTINCT o.id)::int AS orders, COALESCE(SUM(b.total),0)::bigint AS sales, COALESCE(SUM(b.discount),0)::bigint AS discounts
    FROM "Order" o JOIN "User" u ON u.id = o."waiterId" LEFT JOIN "Bill" b ON b."orderId" = o.id AND b.status = 'PAID' WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'PAID' AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} GROUP BY 1, 2 ORDER BY sales DESC`;
  const cancels = await prisma.$queryRaw<any[]>`SELECT u.name, COUNT(*)::int AS c FROM "Order" o JOIN "User" u ON u.id = o."waiterId" WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'CANCELLED' AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} GROUP BY 1`;
  const prep = await prisma.$queryRaw<any[]>`SELECT AVG(EXTRACT(EPOCH FROM (oi."readyAt" - oi."createdAt"))/60)::float AS mins FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."branchId" IN (${bIn(s)}) AND oi."readyAt" IS NOT NULL AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to}`;
  return { title: `Staff performance (kitchen average prep time: ${Math.round(n(prep[0]?.mins) * 10) / 10} min)`, columns: [{ key: "name", label: "Staff" }, { key: "role", label: "Role" }, { key: "orders", label: "Orders", type: "number" }, { key: "sales", label: "Sales", type: "money" }, { key: "avgBill", label: "Avg bill", type: "money" }, { key: "discounts", label: "Discounts given", type: "money" }, { key: "cancelled", label: "Cancelled orders", type: "number" }],
    rows: rows.map((x) => ({ name: x.name, role: x.role, orders: n(x.orders), sales: n(x.sales), avgBill: x.orders ? Math.round(n(x.sales) / n(x.orders)) : 0, discounts: n(x.discounts), cancelled: n(cancels.find((c) => c.name === x.name)?.c) })), chart: { x: "name", y: "sales", kind: "bar" } };
}
async function inventory(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT i.name, i.unit, i."costPerUnit" AS cost, SUM(CASE WHEN m.type IN ('SALE','CANCEL_RETURN') THEN -m.quantity ELSE 0 END)::float AS used, SUM(CASE WHEN m.type = 'WASTAGE' THEN -m.quantity ELSE 0 END)::float AS wasted, SUM(CASE WHEN m.type = 'PURCHASE' THEN m.quantity ELSE 0 END)::float AS purchased
    FROM "StockMove" m JOIN "StockLevel" l ON l.id = m."stockLevelId" JOIN "Ingredient" i ON i.id = l."ingredientId" WHERE l."branchId" IN (${bIn(s)}) AND m."createdAt" >= ${s.from} AND m."createdAt" < ${s.to} GROUP BY 1, 2, 3 ORDER BY 1`;
  const val = (q: number, unit: string, cost: number) => Math.round(unit === "PCS" ? q * cost : (q / 1000) * cost);
  const r = rows.map((x) => ({ name: x.name, unit: x.unit, used: Math.round(n(x.used)), usedValue: val(n(x.used), x.unit, n(x.cost)), wasted: Math.round(n(x.wasted)), wastedValue: val(n(x.wasted), x.unit, n(x.cost)), purchased: Math.round(n(x.purchased)) }));
  const cols: Report["columns"] = [{ key: "name", label: "Ingredient" }, { key: "unit", label: "Unit" }, { key: "used", label: "Used in sales", type: "number" }, { key: "usedValue", label: "Cost of used", type: "money" }, { key: "wasted", label: "Wasted", type: "number" }, { key: "wastedValue", label: "Cost of waste", type: "money" }, { key: "purchased", label: "Purchased", type: "number" }];
  return { title: "Inventory use & wastage", columns: cols, rows: r, totals: sumBy(r, cols.filter((c) => c.type === "money")) };
}
async function profit(s: Scope): Promise<Report> {
  const sold = await prisma.$queryRaw<any[]>`SELECT oi."menuItemId" AS id, oi."variantId" AS vid, oi.name, SUM(oi.quantity)::int AS qty, SUM(oi."unitPrice"*oi.quantity)::bigint AS revenue
    FROM "OrderItem" oi JOIN "Order" o ON o.id = oi."orderId" WHERE o."branchId" IN (${bIn(s)}) AND o.status = 'PAID' AND oi.status <> 'CANCELLED' AND NOT oi.complimentary AND o."createdAt" >= ${s.from} AND o."createdAt" < ${s.to} GROUP BY 1, 2, 3`;
  const [items, ings] = await Promise.all([prisma.menuItem.findMany({ where: { restaurantId: s.restaurantId }, include: { recipe: true } }), prisma.ingredient.findMany({ where: { restaurantId: s.restaurantId } })]);
  const info = ings.map((i) => ({ id: i.id, unit: i.unit as Unit, costPerUnit: i.costPerUnit }));
  const r = sold.map((x) => {
    const it = items.find((i) => i.id === x.id);
    const unitCost = it?.recipe.length ? dishCost(it.recipe.map((l) => ({ ...l, unit: l.unit as Unit })), info, x.vid) : it?.costPrice ?? 0;
    const cost = unitCost * n(x.qty), rev = n(x.revenue);
    return { name: x.name, qty: n(x.qty), revenue: rev, cost, profit: rev - cost, foodCost: rev ? Math.round((cost / rev) * 1000) / 10 : 0, profitPerItem: n(x.qty) ? Math.round((rev - cost) / n(x.qty)) : 0 };
  });
  const avgQty = r.reduce((a, x) => a + x.qty, 0) / Math.max(1, r.length), avgProfit = r.reduce((a, x) => a + x.profitPerItem, 0) / Math.max(1, r.length);
  const rows = r.map((x) => ({ ...x, class: menuClass(x.qty, x.profitPerItem, avgQty, avgProfit) })).sort((a, b) => b.profit - a.profit);
  const cols: Report["columns"] = [{ key: "name", label: "Dish" }, { key: "qty", label: "Qty", type: "number" }, { key: "revenue", label: "Revenue", type: "money" }, { key: "cost", label: "Food cost", type: "money" }, { key: "foodCost", label: "Food cost %", type: "percent" }, { key: "profit", label: "Gross profit", type: "money" }, { key: "class", label: "Menu class" }];
  return { title: "Profit per dish", columns: cols, rows, chart: { x: "name", y: "profit", kind: "bar" }, totals: sumBy(rows, cols.filter((c) => c.type === "money")) };
}
async function branches(s: Scope): Promise<Report> {
  const rows = await prisma.$queryRaw<any[]>`SELECT br.name AS branch, COUNT(b.id)::int AS bills, COALESCE(SUM(b.total),0)::bigint AS total FROM "Branch" br LEFT JOIN "Bill" b ON b."branchId" = br.id AND b.status = 'PAID' AND b."createdAt" >= ${s.from} AND b."createdAt" < ${s.to} WHERE br.id IN (${bIn(s)}) GROUP BY 1 ORDER BY total DESC`;
  return { title: "Branch comparison", columns: [{ key: "branch", label: "Branch" }, { key: "bills", label: "Bills", type: "number" }, { key: "total", label: "Sales", type: "money" }, { key: "avgBill", label: "Avg bill", type: "money" }], rows: rows.map((x) => ({ branch: x.branch, bills: n(x.bills), total: n(x.total), avgBill: x.bills ? Math.round(n(x.total) / n(x.bills)) : 0 })), chart: { x: "branch", y: "total", kind: "bar" } };
}
export const REPORTS: Record<string, { label: string; run: (s: Scope) => Promise<Report> }> = {
  sales: { label: "Sales", run: sales }, items: { label: "Item-wise", run: itemsReport }, categories: { label: "Category-wise", run: categories }, hourly: { label: "Busy hours", run: hourly },
  payments: { label: "Payment modes", run: payments }, discounts: { label: "Discounts", run: discounts }, cancellations: { label: "Cancellations", run: cancellations }, gst: { label: "GST", run: gst },
  staff: { label: "Staff", run: staff }, inventory: { label: "Inventory & waste", run: inventory }, profit: { label: "Profit per dish", run: profit }, branches: { label: "Branches", run: branches },
};
