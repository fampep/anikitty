import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedContentApi } from "@/lib/security/anti-scrape";
import {
  ADMIN_INTERNAL_PATH,
  getAdminPanelPath,
} from "@/lib/security/admin-panel-path";
import {
  accessGateLoginRedirect,
  hasValidSessionCookie,
  isPublicPath,
} from "@/lib/auth/access-gate";

const BLOCKED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);
const isProd = process.env.NODE_ENV === "production";

/**
 * Retired domains. DNS alone cannot redirect — pointing the old name at this
 * origin just serves the app under it — so the move happens here, at the HTTP
 * layer, and works regardless of registrar or CDN.
 */
const LEGACY_HOSTS = new Set(["anikitty.moe", "www.anikitty.moe"]);
const LEGACY_REDIRECT_TARGET = "https://anikitty.site/home";

/** Forwarded host first — behind a proxy, `host` is the internal address. */
function requestHost(req: NextRequest): string {
  const raw =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  // Split off any port, and take the first entry if a proxy chained them.
  return raw.split(",")[0]!.trim().toLowerCase().split(":")[0]!;
}

const PRIVATE_API_PREFIXES = [
  "/api/account",
  "/api/admin",
  "/api/bot",
  "/api/chat",
  "/api/anilist",
];

export async function middleware(req: NextRequest) {
  if (BLOCKED_METHODS.has(req.method)) {
    return new NextResponse(null, { status: 405 });
  }

  if (isProd) {
    const proto = req.headers.get("x-forwarded-proto");
    if (proto === "http") {
      const url = req.nextUrl.clone();
      url.protocol = "https:";
      return NextResponse.redirect(url, 308);
    }
  }

  // Retired domain — send every path to the new home before anything else runs.
  if (LEGACY_HOSTS.has(requestHost(req))) {
    const res = NextResponse.redirect(LEGACY_REDIRECT_TARGET, 301);
    // The old host served real pages before this existed, so caches upstream
    // may still hold a 200 for it. Refuse to be cached so every hit re-asks and
    // gets the redirect instead of a stale copy of the old site.
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.headers.set("Pragma", "no-cache");
    return res;
  }

  const pathname = req.nextUrl.pathname;
  const panelPath = getAdminPanelPath();

  // Hide the predictable /admin URL — rewrite the secret panel path instead.
  if (pathname === ADMIN_INTERNAL_PATH || pathname.startsWith(`${ADMIN_INTERNAL_PATH}/`)) {
    if (panelPath !== ADMIN_INTERNAL_PATH) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (panelPath !== ADMIN_INTERNAL_PATH) {
    if (pathname === panelPath || pathname.startsWith(`${panelPath}/`)) {
      const url = req.nextUrl.clone();
      url.pathname =
        pathname === panelPath
          ? ADMIN_INTERNAL_PATH
          : `${ADMIN_INTERNAL_PATH}${pathname.slice(panelPath.length)}`;
      const res = NextResponse.rewrite(url);
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.headers.set("X-Robots-Tag", "noindex, nofollow");
      return res;
    }
  }

  // Never expose DB / infra probes via common scanner paths.
  if (
    pathname === "/.env" ||
    pathname.startsWith("/.env.") ||
    pathname === "/wp-admin" ||
    pathname === "/phpmyadmin" ||
    pathname === "/server-status"
  ) {
    return new NextResponse(null, { status: 404 });
  }

  // Site-wide access gate: app + content APIs require a session.
  if (!isPublicPath(pathname)) {
    const authed = await hasValidSessionCookie(req);
    if (!authed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Authentication required" },
          {
            status: 401,
            headers: {
              "Cache-Control": "no-store, no-cache, must-revalidate, private",
            },
          },
        );
      }
      const res = NextResponse.redirect(accessGateLoginRedirect(req));
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      return res;
    }
  }

  const res = NextResponse.next();

  if (PRIVATE_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("Pragma", "no-cache");
  }

  if (isProtectedContentApi(pathname)) {
    res.headers.set("Cache-Control", "private, no-store");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
