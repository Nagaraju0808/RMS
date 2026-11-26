import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Public pages: login, customer QR menu (/t), online ordering (/o), tracking, bill links, booking.
const PUBLIC = [/^\/login/, /^\/t\//, /^\/o\//, /^\/track\//, /^\/b\//, /^\/book\//, /^\/api\/public\//, /^\/api\/auth\/(login|pin|signup|demo)/, /^\/signup/, /^\/_next/, /^\/favicon/, /^\/manifest/, /^\/sw\.js/, /^\/icons?\//, /^\/offline/, /^\/api\/health/];

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
/** CSRF guard: a browser sending a state-changing API request from another site is refused.
 *  (Requests without an Origin header – server-to-server webhooks, scripts – are allowed; they carry no browser cookies.) */
function crossSite(req: NextRequest): boolean {
  if (!UNSAFE.has(req.method) || !req.nextUrl.pathname.startsWith("/api/")) return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try { return new URL(origin).host !== host; } catch { return true; }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (crossSite(req)) return NextResponse.json({ error: "Request from another website was blocked." }, { status: 403 });
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
