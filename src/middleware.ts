import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isProtectedContentApi } from "@/lib/security/anti-scrape";

const BLOCKED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);
const isProd = process.env.NODE_ENV === "production";

const PRIVATE_API_PREFIXES = ["/api/account", "/api/admin", "/api/chat", "/api/anilist"];

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
