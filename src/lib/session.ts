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
const DEV_SECRET = "dev-secret-change-me-please-32chars-min";
function secret() {
  const v = process.env.JWT_SECRET || DEV_SECRET;
  // Never run production with the development secret or a short one.
  if (process.env.NODE_ENV === "production" && (v === DEV_SECRET || v.length < 32 || /change-me/.test(v))) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters in production.");
  }
  return new TextEncoder().encode(v);
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
