import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { checkSecret, sessionForUser } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({ restaurant: z.string().min(1), pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits") });

/** Quick staff login: restaurant code (slug) + 4-digit PIN. */
export const POST = handler(async (req: NextRequest) => {
  if (!rateLimit(`pin:${clientIp(req)}`, 10, 60_000)) throw new ApiError(429, "Too many attempts. Wait a minute.");
  const { restaurant, pin } = await parseBody(req, Body);
  const r = await prisma.restaurant.findUnique({ where: { slug: restaurant.toLowerCase() } });
  if (!r) throw new ApiError(401, "Wrong restaurant code or PIN.");
  const users = await prisma.user.findMany({ where: { restaurantId: r.id, active: true, pinHash: { not: null } } });
  for (const u of users) {
    if (await checkSecret(pin, u.pinHash)) {
      const s = await sessionForUser(u);
      const res = NextResponse.json({ ok: true, role: s.role });
      res.cookies.set(SESSION_COOKIE, await signSession(s), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
      return res;
    }
  }
  throw new ApiError(401, "Wrong restaurant code or PIN.");
});
