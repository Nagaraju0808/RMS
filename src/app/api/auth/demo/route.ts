import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionForUser } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";

/** DEV/DEMO ONLY: GET /api/auth/demo?as=owner&next=/dashboard logs in as a demo user (for screenshots and checks).
 *  Disabled unless DEMO_LOGIN=1, and never available in production. */
export async function GET(req: NextRequest) {
  if (process.env.DEMO_LOGIN !== "1" || process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const as = (req.nextUrl.searchParams.get("as") || "owner").replace(/[^a-z]/g, "");
  const u = await prisma.user.findUnique({ where: { email: `${as}@demo.com` } });
  if (!u) return NextResponse.json({ error: "No such demo user." }, { status: 404 });
  const next = req.nextUrl.searchParams.get("next") || "/dashboard";
  const res = NextResponse.redirect(new URL(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard", req.url));
  res.cookies.set(SESSION_COOKIE, await signSession(await sessionForUser(u)), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600 });
  return res;
}
