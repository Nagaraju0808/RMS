import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Public pages: login, customer QR menu (/t), online ordering (/o), tracking, bill links, booking.
const PUBLIC = [/^\/login/, /^\/t\//, /^\/o\//, /^\/track\//, /^\/b\//, /^\/book\//, /^\/api\/public\//, /^\/api\/auth\/(login|pin|signup)/, /^\/signup/, /^\/_next/, /^\/favicon/, /^\/manifest/, /^\/sw\.js/, /^\/icons?\//, /^\/offline/, /^\/api\/health/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/" || PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const s = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please log in." }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
