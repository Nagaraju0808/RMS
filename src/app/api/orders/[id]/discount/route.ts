import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, ok, parseBody, requireSession } from "@/lib/api";
import { loadOrder, verifyApprover } from "@/lib/order-service";
import { checkCoupon, discountAmount, needsApproval, subtotal } from "@/lib/orders";
import { audit } from "@/lib/audit";

/** Apply a discount (percent/flat) or a coupon code. Big cashier discounts need a manager PIN. remove=true clears it. */
export const POST = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("orders.discount"); const { id } = await params;
  const d = await parseBody(req, z.object({ type: z.enum(["PERCENT", "FLAT"]).optional(), value: z.number().min(0).optional(), reason: z.string().max(200).optional(), couponCode: z.string().max(30).optional(), managerPin: z.string().optional(), remove: z.boolean().optional() }));
  const o = await loadOrder(s, id);
  if (!["OPEN", "HELD", "BILLED"].includes(o.status)) throw new ApiError(400, "This order is closed.");
  if (o.bills.some((b) => b.status !== "VOID")) throw new ApiError(400, "A bill was already made. Void the bill to change the discount.");
  if (d.remove) {
    await prisma.order.update({ where: { id }, data: { discountType: null, discountValue: 0, couponCode: null, discountReason: null } });
    await audit(s, "DISCOUNT_REMOVED", "Order", id, { orderNo: o.orderNo });
    return ok(await loadOrder(s, id));
  }
  const amount = subtotal(o.items);
  if (d.couponCode) {
    const c = await prisma.coupon.findUnique({ where: { restaurantId_code: { restaurantId: s.restaurantId, code: d.couponCode.toUpperCase() } } });
    const r = checkCoupon(c, amount);
    if (!r.ok) throw new ApiError(400, r.error);
    await prisma.order.update({ where: { id }, data: { discountType: c!.type, discountValue: c!.value, couponCode: c!.code, discountReason: `Coupon ${c!.code}` } });
    await audit(s, "DISCOUNT", "Order", id, { orderNo: o.orderNo, coupon: c!.code, amount: r.discount });
    return ok(await loadOrder(s, id));
  }
  if (!d.type || d.value == null) throw new ApiError(400, "Choose percent or flat and a value.");
  if (d.type === "PERCENT" && d.value > 100) throw new ApiError(400, "Percent cannot be more than 100.");
  const value = d.type === "FLAT" ? Math.round(d.value) : d.value;
  let approvedBy: string | undefined;
  if (needsApproval(s.role, d.type, value, amount)) approvedBy = (await verifyApprover(s.restaurantId, d.managerPin)).name;
  await prisma.order.update({ where: { id }, data: { discountType: d.type, discountValue: Math.round(value), couponCode: null, discountReason: d.reason } });
  await audit(s, "DISCOUNT", "Order", id, { orderNo: o.orderNo, type: d.type, value, amount: discountAmount(amount, d.type, value), reason: d.reason, approvedBy });
  return ok(await loadOrder(s, id));
});
