import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { getAdminPanelPath, ADMIN_INTERNAL_PATH } from "@/lib/security/admin-panel-path";

/** Must stay in sync with `AUTH_COOKIE_NAME` in auth-cookie.ts (avoid importing Node crypto helpers into middleware). */
export const SESSION_COOKIE_NAME = "ak_session";

const PUBLIC_EXACT_PAGES = new Set([
  "/",
  "/faq",
  "/dmca",
  "/status",
  "/donate",
  "/offline",
  "/changelog",
  "/sync", // AniList OAuth callback
]);

const PUBLIC_PAGE_PREFIXES = [
  "/auth/",
  "/changelog/",
  "/faq/",
  "/dmca/",
];

const PUBLIC_API_EXACT = new Set([
  "/api/health",
  "/api/announcements",
  "/api/locale",
  "/api/online",
  "/api/faq",
]);

const PUBLIC_API_PREFIXES = [
  "/api/account/auth/",
  "/api/account/email/confirm",
  "/api/admin/",
  "/api/bot/",
  "/api/webhooks/",
  "/api/auth/",
  "/api/anilist/oauth/",
  "/api/status/",
  "/api/kofi/",
  "/api/changelog",
  "/api/faq/",
];

function jwtSecretBytes(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "dev-secret-change-in-production-please",
  );
}

/** Lightweight session check for middleware — signature only, no DB session touch. */
export async function hasValidSessionCookie(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const auth = req.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      return verifySessionJwt(auth.slice(7));
    }
    return false;
  }
  return verifySessionJwt(token);
}

async function verifySessionJwt(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretBytes());
    // Purpose-tagged JWTs (2FA pending, OAuth state, etc.) are not sessions.
    if (payload.purpose) return false;
    return typeof payload.userId === "string" && payload.userId.length > 0;
  } catch {
    return false;
  }
}

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PAGES.has(pathname)) return true;
  if (PUBLIC_PAGE_PREFIXES.some((p) => pathname.startsWith(p))) return true;

  const panelPath = getAdminPanelPath();
  if (pathname === panelPath || pathname.startsWith(`${panelPath}/`)) return true;
  if (pathname === ADMIN_INTERNAL_PATH || pathname.startsWith(`${ADMIN_INTERNAL_PATH}/`)) {
    return true;
  }

  if (pathname.startsWith("/api/")) {
    if (PUBLIC_API_EXACT.has(pathname)) return true;
    if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return true;
    return false;
  }

  return false;
}

export function accessGateLoginRedirect(req: NextRequest): URL {
  const url = req.nextUrl.clone();
  const returnTo = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  url.pathname = "/";
  url.search = "";
  if (returnTo && returnTo !== "/") {
    url.searchParams.set("next", returnTo);
  }
  return url;
}
