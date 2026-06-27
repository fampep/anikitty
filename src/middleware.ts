import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BLOCKED_METHODS = new Set(["TRACE", "TRACK", "CONNECT"]);

export function middleware(req: NextRequest) {
  if (BLOCKED_METHODS.has(req.method)) {
    return new NextResponse(null, { status: 405 });
  }

  const res = NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/account")) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.headers.set("Pragma", "no-cache");
  }

  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    res.headers.set("Pragma", "no-cache");
  }

  return res;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
