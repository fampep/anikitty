import { NextResponse } from "next/server";
import { isProduction } from "@/lib/security/security";

export const AUTH_COOKIE_NAME = "ak_session";
/** One-time claim JWT with plaintext recovery codes (email signup / settings). */
export const RECOVERY_CODES_CLAIM_COOKIE = "ak_rc_claim";

const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function recoveryClaimCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 15,
  };
}

export function readAuthCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;

  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${AUTH_COOKIE_NAME}=`)) continue;
    const value = trimmed.slice(AUTH_COOKIE_NAME.length + 1);
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return null;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(`${name}=`)) continue;
    const value = trimmed.slice(name.length + 1);
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

export function jsonWithAuthCookie(body: unknown, token: string, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res;
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(), maxAge: 0 });
  return res;
}

export function redirectWithAuthCookie(url: string, token: string) {
  const res = NextResponse.redirect(url);
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res;
}

export function clearRecoveryClaimCookie(res: NextResponse) {
  res.cookies.set(RECOVERY_CODES_CLAIM_COOKIE, "", {
    ...recoveryClaimCookieOptions(),
    maxAge: 0,
  });
  return res;
}
