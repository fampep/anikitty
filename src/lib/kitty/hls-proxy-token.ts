import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { isAllowedMediaProxyUrl, sanitizeHeaderValue } from "@/lib/security/security";
import { APP_URL } from "@/lib/seo/site-seo";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/** Master playlist / media URLs expire quickly so leaked tokens go stale. */
export const HLS_TOKEN_TTL_SEC = 45 * 60;
/** Playback session cookie lifetime (slightly longer than token TTL). */
export const HLS_SESSION_TTL_SEC = 50 * 60;

export const HLS_SESSION_COOKIE = "ak_pb";

type HlsProxyPayload = {
  u: string;
  r?: string;
  o?: string;
  sid: string;
  e: number;
};

function proxyKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production-please";
  return createHash("sha256").update(`anikitty-hls-proxy:v2:${secret}`).digest();
}

function sessionHmacKey(): Buffer {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-in-production-please";
  return createHash("sha256").update(`anikitty-hls-session:v1:${secret}`).digest();
}

function encryptPayload(payload: HlsProxyPayload): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, proxyKey(), iv);
  const plain = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString("base64url");
}

function decryptPayload(token: string): HlsProxyPayload | null {
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < IV_LEN + TAG_LEN + 1) return null;
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(raw.length - TAG_LEN);
    const encrypted = raw.subarray(IV_LEN, raw.length - TAG_LEN);
    const decipher = createDecipheriv(ALGO, proxyKey(), iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    return JSON.parse(plain) as HlsProxyPayload;
  } catch {
    return null;
  }
}

export function isKittyHlsProxyPath(url: string): boolean {
  const trimmed = url.trim();
  return trimmed.includes("/api/kitty/hls");
}

export function createHlsPlaybackSessionId(): string {
  return randomBytes(16).toString("base64url");
}

/** Signed cookie value binding the browser to a playback session. */
export function mintHlsSessionCookieValue(sessionId: string, ttlSec = HLS_SESSION_TTL_SEC): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const body = `${sessionId}.${exp}`;
  const sig = createHmac("sha256", sessionHmacKey()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyHlsSessionCookieValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const parts = raw.trim().split(".");
  if (parts.length !== 3) return null;
  const [sid, expStr, sig] = parts;
  if (!sid || !expStr || !sig) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const body = `${sid}.${expStr}`;
  const expected = createHmac("sha256", sessionHmacKey()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return sid;
}

export function hlsSessionCookieHeader(sessionId: string): string {
  const value = mintHlsSessionCookieValue(sessionId);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${HLS_SESSION_COOKIE}=${value}; Path=/; Max-Age=${HLS_SESSION_TTL_SEC}; HttpOnly; SameSite=Strict${secure}`;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** Opaque same-origin playback URL — upstream target is encrypted server-side. */
export function mintKittyHlsProxyUrl(
  upstreamUrl: string,
  headers: Record<string, string> = {},
  options?: { sessionId?: string; ttlSec?: number },
): string {
  const url = upstreamUrl.trim();
  if (!url) return "";
  if (isKittyHlsProxyPath(url)) {
    if (url.startsWith("/")) return url;
    try {
      const parsed = new URL(url);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return url;
    }
  }

  const sessionId = options?.sessionId;
  if (!sessionId) {
    // Refuse to mint unbound tokens — callers must provide a playback session.
    return "";
  }

  const referer = sanitizeHeaderValue(headers.Referer ?? headers.referer);
  const origin = sanitizeHeaderValue(headers.Origin ?? headers.origin);
  const ttl = options?.ttlSec ?? HLS_TOKEN_TTL_SEC;
  const exp = Math.floor(Date.now() / 1000) + ttl;
  const token = encryptPayload({
    u: url,
    r: referer || undefined,
    o: origin || undefined,
    sid: sessionId,
    e: exp,
  });
  return `/api/kitty/hls?t=${token}`;
}

export function resolveKittyHlsProxyToken(
  token: string,
  expectedSessionId?: string | null,
): { url: string; referer: string; origin: string; sessionId: string } | null {
  const payload = decryptPayload(token.trim());
  if (!payload?.u || typeof payload.e !== "number" || !payload.sid) return null;
  if (payload.e < Math.floor(Date.now() / 1000)) return null;
  if (!isAllowedMediaProxyUrl(payload.u)) return null;
  if (expectedSessionId && payload.sid !== expectedSessionId) return null;

  return {
    url: payload.u,
    referer: payload.r ?? "",
    origin: payload.o ?? "",
    sessionId: payload.sid,
  };
}

function hostFromUrl(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

const SITE_HOST = hostFromUrl(APP_URL) ?? "anikitty.moe";

/**
 * Reject cross-site hotlinking / curl scrapers that omit browser fetch metadata.
 * Allows same-origin Referer or Sec-Fetch-Site: same-origin|none (direct nav).
 */
export function isAllowedHlsClientRequest(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const secFetchSite = (req.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (secFetchSite === "same-origin" || secFetchSite === "same-site" || secFetchSite === "none") {
    return true;
  }

  const referer = req.headers.get("referer") ?? "";
  const origin = req.headers.get("origin") ?? "";
  const refererHost = hostFromUrl(referer);
  const originHost = hostFromUrl(origin);

  if (refererHost === SITE_HOST || originHost === SITE_HOST) return true;

  // Some browsers omit Sec-Fetch-* on media; accept if Host matches site and no foreign Origin.
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (host === SITE_HOST && !originHost) return true;

  return false;
}
