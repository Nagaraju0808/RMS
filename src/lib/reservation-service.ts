import { prisma } from "./db";
import { ApiError } from "./api";
import { findClash, suggestTable } from "./reservations";
import { resolveSettings } from "./features";
import { sendMessage } from "./services/messaging";

export async function createReservation(restaurantId: string, branchId: string, d: { name: string; phone: string; guests: number; dateTime: Date; tableId?: string | null; notes?: string; source: string }) {
  if (isNaN(d.dateTime.getTime())) throw new ApiError(400, "Date/time is not valid.");
  if (d.dateTime.getTime() < Date.now() - 15 * 60_000) throw new ApiError(400, "This time is in the past.");
  const branch = await prisma.branch.findFirstOrThrow({ where: { id: branchId, restaurantId }, include: { restaurant: true } });
  const dur = resolveSettings(branch.settings).avgTableMins * 2;
  const near = await prisma.reservation.findMany({ where: { branchId, dateTime: { gte: new Date(d.dateTime.getTime() - dur * 60_000), lte: new Date(d.dateTime.getTime() + dur * 60_000) } } });
  let tableId = d.tableId ?? null;
  if (tableId) {
    if (!(await prisma.diningTable.findFirst({ where: { id: tableId, branchId } }))) throw new ApiError(400, "Table not found.");
    const c = findClash({ tableId, dateTime: d.dateTime, status: "BOOKED" }, near, dur);
    if (c) throw new ApiError(409, `That table is already booked by ${c.name} at ${c.dateTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}.`);
  } else {
    const tables = await prisma.diningTable.findMany({ where: { branchId }, select: { id: true, seats: true } });
    tableId = suggestTable(d.guests, d.dateTime, tables, near, dur)?.id ?? null;
  }
  const customer = await prisma.customer.upsert({ where: { restaurantId_phone: { restaurantId, phone: d.phone } }, update: {}, create: { restaurantId, phone: d.phone, name: d.name } });
  const r = await prisma.reservation.create({ data: { branchId, tableId, customerId: customer.id, name: d.name, phone: d.phone, guests: d.guests, dateTime: d.dateTime, notes: d.notes, source: d.source } });
  await sendMessage(restaurantId, "SMS", d.phone, `${branch.restaurant.name}: table for ${d.guests} booked on ${d.dateTime.toLocaleString("en-IN")}. See you!`);
  return r;
}
