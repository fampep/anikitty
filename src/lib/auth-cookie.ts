import { NextResponse } from "next/server";
import { isProduction } from "@/lib/security";

export const AUTH_COOKIE_NAME = "ak_session";

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
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

export function jsonWithAuthCookie(body: unknown, token: string, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res;
}

export function clearAuthCookie(res: NextResponse) {
  res.cookies.set(AUTH_COOKIE_NAME, "", { ...authCookieOptions(), maxAge: 0 });
  return res;
}
