import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, parseBody, requireSession } from "@/lib/api";
import { SESSION_COOKIE, signSession } from "@/lib/session";

/** Switch active branch (owners can switch to any branch of their restaurant). */
export const POST = handler(async (req: NextRequest) => {
  const s = await requireSession();
  const { branchId } = await parseBody(req, z.object({ branchId: z.string() }));
  const b = await prisma.branch.findFirst({ where: { id: branchId, restaurantId: s.restaurantId } });
  if (!b) throw new ApiError(404, "Branch not found.");
  const u = await prisma.user.findUnique({ where: { id: s.sub } });
  if (s.role !== "OWNER" && u?.branchId && u.branchId !== branchId) throw new ApiError(403, "You can only use your own branch.");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await signSession({ ...s, branchId }), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
  return res;
});
