import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError, handler, parseBody } from "@/lib/api";
import { hashSecret, sessionForUser } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import { DEFAULT_SETTINGS, defaultFeatures } from "@/lib/features";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({ restaurantName: z.string().min(2).max(100), ownerName: z.string().min(1), email: z.string().email(), password: z.string().min(8, "Password must be at least 8 characters"), pin: z.string().regex(/^\d{4}$/) });

/** Create a new restaurant + owner account, then go to the onboarding wizard. */
export const POST = handler(async (req: NextRequest) => {
  if (!rateLimit(`signup:${clientIp(req)}`, 5, 60_000)) throw new ApiError(429, "Too many sign-ups. Wait a minute.");
  const d = await parseBody(req, Body);
  if (await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } })) throw new ApiError(409, "This email is already registered.");
  let slug = d.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "restaurant";
  if (await prisma.restaurant.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const r = await prisma.restaurant.create({ data: { name: d.restaurantName, slug, branches: { create: { name: "Main branch", features: defaultFeatures("FINE_DINING"), settings: DEFAULT_SETTINGS } }, taxRates: { create: { name: "GST 5%", ratePercent: 5, hsnSac: "996331", isDefault: true } } } });
  const u = await prisma.user.create({ data: { restaurantId: r.id, name: d.ownerName, email: d.email.toLowerCase(), role: "OWNER", passwordHash: await hashSecret(d.password), pinHash: await hashSecret(d.pin) } });
  const res = NextResponse.json({ ok: true, slug });
  res.cookies.set(SESSION_COOKIE, await signSession(await sessionForUser(u)), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 12 * 3600 });
  return res;
});
