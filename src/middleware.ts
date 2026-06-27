import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkAntiScrape, isProtectedContentApi } from "@/lib/anti-scrape";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const BLOCKED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);
const isProd = process.env.NODE_ENV === "production";

const PRIVATE_API_PREFIXES = ["/api/account", "/api/admin", "/api/chat", "/api/anilist"];

const CONTENT_RATE_WINDOW_MS = 10 * 60 * 1000;
const CONTENT_RATE_LIMIT = 120;
const STREAM_RATE_LIMIT = 45;

function contentRateLimitKey(req: NextRequest): string {
  const ip = getClientIp(req);
  if (req.nextUrl.pathname.startsWith("/api/kitty/stream")) {
    return `content-stream:${ip}`;
  }
  return `content-api:${ip}`;
}

function contentRateLimitMax(req: NextRequest): number {
  return req.nextUrl.pathname.startsWith("/api/kitty/stream")
    ? STREAM_RATE_LIMIT
    : CONTENT_RATE_LIMIT;
}

export function middleware(req: NextRequest) {
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

  if (isProd && isProtectedContentApi(req.nextUrl.pathname) && req.method === "GET") {
    const scrape = checkAntiScrape(req);
    if (!scrape.ok) {
      return NextResponse.json({ error: scrape.message }, { status: scrape.status });
    }

    const limited = rateLimit(
      contentRateLimitKey(req),
      contentRateLimitMax(req),
      CONTENT_RATE_WINDOW_MS,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
      );
    }
  }

  const res = NextResponse.next();

  if (PRIVATE_API_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p))) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.headers.set("Pragma", "no-cache");
  }

  if (isProtectedContentApi(req.nextUrl.pathname)) {
    res.headers.set("Cache-Control", "private, no-store");
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
