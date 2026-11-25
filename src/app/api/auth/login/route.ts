import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { checkSecret, isLocked, registerFailure, sessionForUser } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = handler(async (req: NextRequest) => {
  if (!rateLimit(`login:${clientIp(req)}`, 20, 60_000)) throw new ApiError(429, "Too many attempts. Wait a minute.");
  const { email, password } = await parseBody(req, Body);
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!u || !u.active) throw new ApiError(401, "Wrong email or password.");
  if (isLocked(u)) throw new ApiError(423, "Account locked for 15 minutes after too many wrong attempts.");
  if (!(await checkSecret(password, u.passwordHash))) { await registerFailure(u); throw new ApiError(401, "Wrong email or password."); }
  await prisma.user.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null } });
  const s = await sessionForUser(u);
  const res = NextResponse.json({ ok: true, role: s.role });
  res.cookies.set(SESSION_COOKIE, await signSession(s), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
  return res;
});
