// Helpers for API route handlers: auth + permission + tenant scope + Zod validation + errors.
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z, ZodError, ZodTypeAny } from "zod";
import { SESSION_COOKIE, Session, verifySession } from "./session";
import { can, Permission } from "./roles";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}
export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  return verifySession(c.get(SESSION_COOKIE)?.value);
}
export async function requireSession(perm?: Permission): Promise<Session> {
  const s = await getSession();
  if (!s) throw new ApiError(401, "Please log in.");
  if (perm && !can(s.role, perm, s.perms || [])) throw new ApiError(403, "You do not have permission to do this.");
  return s;
}
export function requireBranch(s: Session): string {
  if (!s.branchId) throw new ApiError(400, "Please choose a branch first.");
  return s.branchId;
}
export async function parseBody<S extends ZodTypeAny>(req: NextRequest | Request, schema: S): Promise<z.output<S>> {
  let json: unknown;
  try { json = await req.json(); } catch { throw new ApiError(400, "Request body must be JSON."); }
  return schema.parse(json);
}
type Handler = (req: NextRequest, ctx: { params: Promise<any> }) => Promise<Response>;
export function handler(fn: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      if (e instanceof ZodError) {
        const msg = e.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Invalid input – ${msg}`, details: e.issues }, { status: 400 });
      }
      console.error(e);
      return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
    }
  };
}
export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
export function notFound(what = "Item"): never { throw new ApiError(404, `${what} not found.`); }
