import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { handler, ok, requireSession } from "@/lib/api";
import { leaveDaysInMonth, presentDays, salaryFor, totalHours } from "@/lib/staff";
/** Monthly salary summary (?month=YYYY-MM, &format=xlsx for Excel). */
export const GET = handler(async (req: NextRequest) => {
  const s = await requireSession("staff.manage");
  const month = req.nextUrl.searchParams.get("month") || new Date().toISOString().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1), to = new Date(y, m, 1);
  const users = await prisma.user.findMany({ where: { restaurantId: s.restaurantId, active: true, role: { not: "CUSTOMER" }, ...(s.role === "MANAGER" ? { branchId: s.branchId } : {}) }, include: { attendance: { where: { at: { gte: from, lt: to } } }, leaves: { where: { status: "APPROVED" } }, tips: { where: { date: { startsWith: month } } } }, orderBy: { name: "asc" } });
  const rows = users.map((u) => {
    const punches = u.attendance.map((a) => ({ type: a.type, at: a.at }));
    const hours = totalHours(punches), present = presentDays(punches), leave = u.leaves.reduce((a, l) => a + leaveDaysInMonth(l.fromDate, l.toDate, month), 0), tips = u.tips.reduce((a, t) => a + t.amount, 0);
    return { name: u.name, role: u.role, hours, present, leave, ...salaryFor(u, hours, present, leave, tips) };
  });
  if (req.nextUrl.searchParams.get("format") === "xlsx") {
    const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet(`Salary ${month}`);
    ws.columns = [{ header: "Name", key: "name", width: 22 }, { header: "Role", key: "role", width: 12 }, { header: "Hours", key: "hours", width: 8 }, { header: "Days present", key: "present", width: 12 }, { header: "Leave days", key: "leave", width: 10 }, { header: "Base (₹)", key: "base", width: 12 }, { header: "Tips (₹)", key: "tips", width: 10 }, { header: "Total (₹)", key: "total", width: 12 }];
    ws.addRows(rows.map((r) => ({ ...r, base: r.base / 100, tips: r.tips / 100, total: r.total / 100 })));
    ws.getRow(1).font = { bold: true };
    return new Response(await wb.xlsx.writeBuffer() as ArrayBuffer, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename=salary-${month}.xlsx` } });
  }
  return ok({ month, rows });
});
