import type { NextRequest } from "next/server";

/** Header set by the Anikitty frontend on JSON API calls (not on HLS segment loads). */
export const CLIENT_HEADER = "x-anikitty-client";
export const CLIENT_HEADER_VALUE = "1";

const PROTECTED_PREFIXES = ["/api/anime", "/api/kitty", "/api/episode", "/api/miruro"] as const;

/** HLS/chapters/subtitles are loaded by the video engine without custom headers. */
const MEDIA_PROXY_PREFIXES = [
  "/api/kitty/hls",
  "/api/kitty/chapters",
  "/api/kitty/subtitles",
] as const;

export function clientApiHeaders(): Record<string, string> {
  return { [CLIENT_HEADER]: CLIENT_HEADER_VALUE };
}

export function isProtectedContentApi(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isMediaProxyApi(pathname: string): boolean {
  return MEDIA_PROXY_PREFIXES.some((p) => pathname.startsWith(p));
}

function getAllowedHostnames(): Set<string> {
  const hosts = new Set<string>(["localhost", "127.0.0.1"]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      hosts.add(new URL(appUrl).hostname.toLowerCase());
    } catch {
      /* ignore invalid env */
    }
  }

  const extra = process.env.ALLOWED_SITE_HOSTS;
  if (extra) {
    for (const h of extra.split(",")) {
      const trimmed = h.trim().toLowerCase();
      if (trimmed) hosts.add(trimmed);
    }
  }

  return hosts;
}

function hostnameAllowed(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const allowed = getAllowedHostnames();

  for (const entry of allowed) {
    if (h === entry || h.endsWith(`.${entry}`)) return true;
  }

  return false;
}

function urlFromSite(url: string): boolean {
  try {
    return hostnameAllowed(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** True when the request looks like it came from a browser on our site. */
export function isSameSiteBrowserRequest(req: NextRequest): boolean {
  const secFetchSite = req.headers.get("sec-fetch-site")?.toLowerCase();
  if (secFetchSite === "same-origin" || secFetchSite === "same-site") return true;

  const origin = req.headers.get("origin");
  if (origin && urlFromSite(origin)) return true;

  const referer = req.headers.get("referer");
  if (referer && urlFromSite(referer)) return true;

  return false;
}

export function hasClientMarker(req: NextRequest): boolean {
  return req.headers.get(CLIENT_HEADER) === CLIENT_HEADER_VALUE;
}

export type AntiScrapeResult =
  | { ok: true }
  | { ok: false; status: 403 | 429; message: string };

/**
 * Blocks scripted scraping of episode/stream metadata in production.
 * Media proxy routes (HLS) only require same-origin browser signals.
 */
export function checkAntiScrape(req: NextRequest): AntiScrapeResult {
  if (process.env.NODE_ENV !== "production") return { ok: true };

  const { pathname } = req.nextUrl;
  if (!isProtectedContentApi(pathname)) return { ok: true };

  if (req.method === "OPTIONS") return { ok: true };

  if (!isSameSiteBrowserRequest(req)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  if (!isMediaProxyApi(pathname) && !hasClientMarker(req)) {
    return { ok: false, status: 403, message: "Forbidden" };
  }

  return { ok: true };
}
