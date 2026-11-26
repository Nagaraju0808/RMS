import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, notFound, ok, parseBody, requireSession } from "@/lib/api";
import { audit } from "@/lib/audit";
const Body = z.object({
  name: z.string().min(1).optional(), address: z.string().nullable().optional(), phone: z.string().nullable().optional(), stateCode: z.string().optional(),
  features: z.record(z.boolean()).optional(),
  settings: z.object({ serviceChargePercent: z.number().min(0).max(30), packingChargePerItem: z.number().int().min(0), kdsWarnMins: z.number().int().min(1), kdsLateMins: z.number().int().min(1), qrAutoAccept: z.boolean(), roundOff: z.boolean(), interState: z.boolean(), avgTableMins: z.number().int().min(5) }).partial().optional(),
});
export const PUT = handler(async (req: NextRequest, { params }) => {
  const s = await requireSession("branch.manage"); const { id } = await params;
  if (s.role === "MANAGER" && s.branchId !== id) throw new ApiError(403, "Managers can only change their own branch.");
  const b = await prisma.branch.findFirst({ where: { id, restaurantId: s.restaurantId } });
  if (!b) notFound("Branch");
  const d = await parseBody(req, Body);
  await prisma.branch.update({ where: { id }, data: { ...d, features: d.features ? { ...(b.features as object), ...d.features } : undefined, settings: d.settings ? { ...(b.settings as object), ...d.settings } : undefined } });
  await audit(s, "SETTINGS_CHANGE", "Branch", id, d);
  return ok({ ok: true });
});
