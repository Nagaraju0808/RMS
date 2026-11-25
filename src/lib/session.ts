// Signed JWT session stored in an httpOnly cookie. Works in middleware (edge) and node.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "df_session";
export type Session = {
  sub: string; // user id
  name: string;
  role: string;
  restaurantId: string;
  branchId: string | null;
  perms: string[];
};
function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me-please-32chars-min");
}
export async function signSession(s: Session): Promise<string> {
  return new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(secret());
}
export async function verifySession(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
