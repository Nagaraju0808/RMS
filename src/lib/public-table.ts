import { prisma } from "./db";
import { ApiError } from "./api";
import { clientIp, rateLimit } from "./ratelimit";
import { resolveFeatures, resolveSettings, RestaurantTypeName } from "./features";
/** Find the table behind a QR token (public, no login). */
export async function tableByToken(token: string, req?: Request, limit = 60) {
  if (req && !rateLimit(`qr:${clientIp(req)}`, limit, 60_000)) throw new ApiError(429, "Too many requests. Please wait a moment.");
  const table = await prisma.diningTable.findUnique({ where: { qrToken: token }, include: { branch: { include: { restaurant: true } } } });
  if (!table) throw new ApiError(404, "This QR code is not valid. Please ask the staff.");
  const features = resolveFeatures(table.branch.features, table.branch.restaurant.type as RestaurantTypeName);
  if (!features.qrOrdering) throw new ApiError(403, "QR ordering is switched off here. Please order with the waiter.");
  return { table, branch: table.branch, restaurant: table.branch.restaurant, settings: resolveSettings(table.branch.settings), features };
}
