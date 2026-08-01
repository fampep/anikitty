import { isAllowedMediaProxyUrl } from "@/lib/security/security";
import { withKittyProxyAuthHeaders } from "@/lib/kitty/kitty-api-core";
import { rewriteKittyApiUrlToDirectOrigin } from "@/lib/kitty/kitty-api-node-origins.server";
import {
  HLS_SESSION_COOKIE,
  isAllowedHlsClientRequest,
  mintKittyHlsProxyUrl,
  peekKittyHlsProxyTokenCast,
  readCookie,
  resolveKittyHlsProxyToken,
  verifyHlsSessionCookieValue,
} from "@/lib/kitty/hls-proxy-token";

function isM3u8ByUrl(url: string): boolean {
  return url.endsWith(".m3u8") || url.includes(".m3u8?") || url.includes(".m3u8&");
}

function isM3u8ByContentType(ct: string): boolean {
  return ct.includes("mpegurl") || ct.includes("m3u8");
}

function isSpoofedMediaContentType(ct: string): boolean {
  const lower = ct.toLowerCase();
  return lower.startsWith("image/") || lower.includes("text/html") || lower.includes("text/plain");
}

/** Bare nested media URL returned instead of a real `#EXTM3U` playlist body. */
function extractSingleNestedMediaUrl(body: string, baseUrl: string): string | null {
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  if (lines.length !== 1) return null;
  const only = lines[0]!;
  try {
    const abs = new URL(only, baseUrl).toString();
    if (!/^https?:\/\//i.test(abs)) return null;
    return abs;
  } catch {
    return null;
  }
}

function looksLikeMp4Buffer(buf: ArrayBuffer): boolean {
  if (buf.byteLength < 12) return false;
  const bytes = new Uint8Array(buf);
  // ....ftyp
  return (
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  );
}

function contentTypeForBufferedMedia(
  rewriteBase: string,
  contentType: string,
  buffer: ArrayBuffer,
): string {
  if (looksLikeMp4Buffer(buffer)) return "video/mp4";
  return fixSegmentContentType(rewriteBase, contentType);
}

/**
 * When upstream is an Anikoto `/proxy?url=…` URL, resolve relative playlist
 * paths against the real CDN URL — not the proxy host.
 */
function resolveRewriteBase(decoded: string): string {
  try {
    const u = new URL(decoded);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    if (path === "/proxy" || path.endsWith("/proxy")) {
      const inner = u.searchParams.get("url");
      if (inner) {
        try {
          return decodeURIComponent(inner);
        } catch {
          return inner;
        }
      }
    }
  } catch {
    /* fall through */
  }
  return decoded;
}

/**
 * Absolutize a playlist URI. WHATWG `new URL(relative, base)` drops the base
 * query string when the relative has none — Byse/SprintCDN put auth on the
 * master URL only, so we copy it onto bare relatives.
 */
function absolutizePlaylistUri(raw: string, base: URL): string {
  const t = raw.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith("//")) return `${base.protocol}${t}`;
  const abs = new URL(t, base);
  if (!abs.search && base.search && !t.includes("?")) {
    abs.search = base.search;
  }
  return abs.toString();
}

function fixSegmentContentType(url: string, contentType: string): string {
  const ct = contentType.toLowerCase();
  if (!isSpoofedMediaContentType(ct)) {
    if (ct && !ct.includes("text")) return contentType;
    if (url.includes(".mp4")) return "video/mp4";
    return "video/MP2T";
  }
  try {
    const path = new URL(url).pathname.toLowerCase();
    if (/\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(path)) return contentType;
    if (path.endsWith(".mp4")) return "video/mp4";
    if (path.endsWith(".m4s")) return "video/iso.segment";
  } catch {
    /* fall through */
  }
  return "video/MP2T";
}

function buildProxyUrl(
  abs: string,
  referer: string,
  origin: string,
  cookie: string,
  sessionId: string,
  cast: boolean,
): string {
  return mintKittyHlsProxyUrl(
    abs,
    {
      Referer: referer,
      Origin: origin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    { sessionId, cast },
  );
}

/**
 * Keep nested KittyAPI `/proxy` playlist lines on the same node origin that
 * successfully served the parent playlist. KittyAPI rewrites with
 * PROXY_PUBLIC_ORIGIN (CF hostname); Coolify fetching those nested CF URLs
 * often gets sticky 502 HTML while the IP-pinned master hop worked.
 */
function pinKittyProxyToParentOrigin(childUrl: string, parentProxyUrl: string): string {
  try {
    const parent = new URL(parentProxyUrl);
    const child = new URL(childUrl);
    const parentPath = parent.pathname.replace(/\/+$/, "") || "/";
    const childPath = child.pathname.replace(/\/+$/, "") || "/";
    if (parentPath !== "/proxy" && !parentPath.endsWith("/proxy")) return childUrl;
    if (childPath !== "/proxy" && !childPath.endsWith("/proxy")) return childUrl;
    if (parent.host === child.host && parent.protocol === child.protocol) return childUrl;
    child.protocol = parent.protocol;
    child.host = parent.host;
    return child.toString();
  } catch {
    return childUrl;
  }
}

function rewriteUriInTag(
  line: string,
  manifestUrl: string,
  referer: string,
  origin: string,
  cookie: string,
  sessionId: string,
  cast: boolean,
  parentProxyUrl?: string,
): string {
  const base = new URL(manifestUrl);

  const wrap = (abs: string) => {
    const pinned =
      parentProxyUrl && abs.includes("/proxy?")
        ? pinKittyProxyToParentOrigin(abs, parentProxyUrl)
        : abs;
    return buildProxyUrl(pinned, referer, origin, cookie, sessionId, cast);
  };

  return line
    .replace(/URI="([^"]+)"/gi, (_, uri) => {
      try {
        const abs = absolutizePlaylistUri(uri, base);
        return `URI="${wrap(abs)}"`;
      } catch {
        return `URI="${uri}"`;
      }
    })
    .replace(/URI='([^']+)'/gi, (_, uri) => {
      try {
        const abs = absolutizePlaylistUri(uri, base);
        return `URI='${wrap(abs)}'`;
      } catch {
        return `URI='${uri}'`;
      }
    });
}

function rewriteManifest(
  body: string,
  manifestUrl: string,
  referer: string,
  origin: string,
  cookie: string,
  sessionId: string,
  cast: boolean,
  parentProxyUrl?: string,
): string {
  const base = new URL(manifestUrl);

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return rewriteUriInTag(
          line,
          manifestUrl,
          referer,
          origin,
          cookie,
          sessionId,
          cast,
          parentProxyUrl,
        );
      }

      try {
        // Absolute KittyAPI /proxy lines: wrap as-is (never re-join against CDN).
        if (/^https?:\/\//i.test(trimmed) && trimmed.includes("/proxy?")) {
          const pinned = parentProxyUrl
            ? pinKittyProxyToParentOrigin(trimmed, parentProxyUrl)
            : trimmed;
          return buildProxyUrl(pinned, referer, origin, cookie, sessionId, cast);
        }
        const abs = absolutizePlaylistUri(trimmed, base);
        return buildProxyUrl(abs, referer, origin, cookie, sessionId, cast);
      } catch {
        return line;
      }
    })
    .join("\n");
}

function upstreamHeaders(
  referer: string,
  origin: string,
  cookie: string,
  range?: string | null,
): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
  const safeReferer = referer.replace(/[\r\n\0]/g, "").trim().slice(0, 512);
  const safeOrigin = origin.replace(/[\r\n\0]/g, "").trim().slice(0, 512);
  const safeCookie = cookie.replace(/[\r\n\0]/g, "").trim().slice(0, 1_024);
  if (safeReferer) headers.Referer = safeReferer;
  if (safeOrigin) headers.Origin = safeOrigin;
  if (safeCookie) headers.Cookie = safeCookie;
  if (range) headers.Range = range.replace(/[\r\n\0]/g, "").trim().slice(0, 128);
  return headers;
}

function corsHeaders(contentType: string, castMode: boolean): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "private, no-store, no-cache",
  };
  // Chromecast (and CAF receivers) require CORS on media responses.
  if (castMode || process.env.NODE_ENV !== "production") {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  // Plaintext ?url= fallback is disabled — only opaque tokens are accepted.
  if (!token) {
    return new Response("playback token required", { status: 400 });
  }

  const castPeek = peekKittyHlsProxyTokenCast(token);

  // Cast tokens are fetched by the Chromecast device (no site cookies / Sec-Fetch).
  if (!castPeek && !isAllowedHlsClientRequest(req)) {
    return new Response("forbidden", { status: 403 });
  }

  // No per-IP rate limit — HLS segment traffic must not 429 mid-watch.

  const cookieSessionId = verifyHlsSessionCookieValue(
    readCookie(req, HLS_SESSION_COOKIE),
  );

  // Cast: token alone. Browser: token + matching session cookie.
  const resolved = resolveKittyHlsProxyToken(
    token,
    castPeek ? null : cookieSessionId,
  );
  if (!resolved) {
    return new Response(
      !castPeek && !cookieSessionId
        ? "playback session required"
        : "invalid or expired playback token",
      { status: 403 },
    );
  }

  const decoded = resolved.url;
  const referer = resolved.referer;
  const origin = resolved.origin;
  const cookie = resolved.cookie;
  const sessionId = resolved.sessionId;
  const cast = resolved.cast;

  if (!isAllowedMediaProxyUrl(decoded)) {
    return new Response("url not allowed", { status: 403 });
  }

  const range = req.headers.get("range");

  // When upstream is KittyAPI `/proxy?…`, attach KITTY_API_KEY server-side.
  // Browser only ever sees `/api/kitty/hls?t=…` — the key never leaves Next.
  // Pin CF public DNS → origin IP so undici is not blocked by Browser Integrity
  // (error 1010) — breaks AniKuro freevideoupload and other /proxy media.
  const fetchTarget = rewriteKittyApiUrlToDirectOrigin(decoded);
  const fetchHeaders = withKittyProxyAuthHeaders(
    decoded,
    upstreamHeaders(referer, origin, cookie, range) as Record<string, string>,
  );

  let upstream: Response;
  try {
    upstream = await fetch(fetchTarget, {
      cache: "no-store",
      headers: {
        ...fetchHeaders,
        // Cloudflare in front of KittyAPI can sticky-cache 502 HTML for /proxy
        // variant URLs — never reuse those for playlist/segment pulls.
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      signal: AbortSignal.timeout(30_000),
      redirect: "follow",
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  // KittyAPI /proxy used to return bare 301 for wixstatic; follow once if needed.
  if (
    [301, 302, 303, 307, 308].includes(upstream.status) &&
    upstream.headers.get("location")
  ) {
    try {
      const loc = new URL(upstream.headers.get("location")!, decoded).toString();
      if (isAllowedMediaProxyUrl(loc)) {
        upstream = await fetch(rewriteKittyApiUrlToDirectOrigin(loc), {
          cache: "no-store",
          headers: {
            ...fetchHeaders,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: AbortSignal.timeout(30_000),
          redirect: "follow",
        });
      }
    } catch {
      return new Response("upstream redirect failed", { status: 502 });
    }
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  let contentType = upstream.headers.get("content-type") ?? "";
  let rewriteBase = resolveRewriteBase(decoded);
  let mediaUrl = decoded;

  /**
   * Echo/MKissa "Ok" (and some clock.json links) advertise `.m3u8` but upstream
   * sometimes returns a bare nested URL or progressive MP4. Blindly rewriting
   * that body as a playlist yields a single `/api/kitty/hls?t=…` line with no
   * `#EXTM3U` — hls.js fails and the UI looks like Echo is broken.
   */
  const maxNestedUrlHops = 3;
  for (let hop = 0; hop < maxNestedUrlHops; hop++) {
    const treatAsPlaylist =
      isM3u8ByUrl(mediaUrl) || isM3u8ByContentType(contentType);
    if (!treatAsPlaylist) break;

    const buffer = await upstream.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    const peek = text.trimStart();

    if (peek.startsWith("#EXTM3U")) {
      const rewritten = rewriteManifest(
        text,
        rewriteBase,
        referer,
        origin,
        cookie,
        sessionId,
        cast,
        mediaUrl,
      );
      return new Response(rewritten, {
        status: 200,
        headers: corsHeaders("application/vnd.apple.mpegurl", cast),
      });
    }

    const nested = extractSingleNestedMediaUrl(peek, rewriteBase);
    if (!nested || !isAllowedMediaProxyUrl(nested)) {
      // Advertised as m3u8 but body is HTML/garbage (Byse auth miss) — fail
      // closed so the player can fall back instead of feeding proxy-wrapped HTML.
      const looksHtml =
        peek.startsWith("<!DOCTYPE") ||
        peek.startsWith("<!doctype") ||
        peek.startsWith("<html") ||
        (peek.startsWith("https://") && peek.includes("/proxy?"));
      if (treatAsPlaylist && looksHtml) {
        return new Response("upstream playlist unavailable", { status: 502 });
      }
      // Not a playlist — serve bytes as media (often mis-tagged Echo MP4).
      const segmentType = contentTypeForBufferedMedia(rewriteBase, contentType, buffer);
      const segmentHeaders = corsHeaders(segmentType, cast);
      const status = upstream.status === 206 ? 206 : 200;
      return new Response(buffer, { status, headers: segmentHeaders });
    }

    mediaUrl = nested;
    rewriteBase = resolveRewriteBase(nested);
    const nestedHeaders = withKittyProxyAuthHeaders(
      nested,
      upstreamHeaders(referer, origin, cookie, range) as Record<string, string>,
    );
    try {
      upstream = await fetch(rewriteKittyApiUrlToDirectOrigin(nested), {
        cache: "no-store",
        headers: {
          ...nestedHeaders,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: AbortSignal.timeout(30_000),
        redirect: "follow",
      });
    } catch {
      return new Response("upstream nested fetch failed", { status: 502 });
    }
    if (!upstream.ok && upstream.status !== 206) {
      return new Response(`upstream ${upstream.status}`, { status: upstream.status });
    }
    contentType = upstream.headers.get("content-type") ?? "";
  }

  const segmentType = fixSegmentContentType(rewriteBase, contentType);

  const segmentHeaders = corsHeaders(segmentType, cast);
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (contentLength) (segmentHeaders as Record<string, string>)["Content-Length"] = contentLength;
  if (contentRange) (segmentHeaders as Record<string, string>)["Content-Range"] = contentRange;
  if (acceptRanges) (segmentHeaders as Record<string, string>)["Accept-Ranges"] = acceptRanges;

  const status = upstream.status === 206 ? 206 : 200;
  const likelyMediaSegment =
    !isSpoofedMediaContentType(contentType) &&
    (mediaUrl.includes(".ts") ||
      mediaUrl.includes(".mp4") ||
      mediaUrl.includes(".m4s") ||
      contentType.includes("video") ||
      contentType.includes("octet-stream"));

  if (likelyMediaSegment && upstream.body) {
    return new Response(upstream.body, { status, headers: segmentHeaders });
  }

  // Spoofed image/* (EchoVideo): peek for disguised playlists without buffering whole TS segments.
  if (upstream.body && isSpoofedMediaContentType(contentType)) {
    const reader = upstream.body.getReader();
    const first = await reader.read();
    const head = first.value ?? new Uint8Array();
    const peek = new TextDecoder("utf-8", { fatal: false }).decode(head.slice(0, 16)).trimStart();

    if (peek.startsWith("#EXTM3U")) {
      const chunks: Uint8Array[] = [head];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const text = new TextDecoder().decode(
        chunks.length === 1 ? chunks[0] : (() => {
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const out = new Uint8Array(total);
          let off = 0;
          for (const c of chunks) {
            out.set(c, off);
            off += c.length;
          }
          return out;
        })(),
      );
      const rewritten = rewriteManifest(
        text,
        rewriteBase,
        referer,
        origin,
        cookie,
        sessionId,
        cast,
        mediaUrl,
      );
      return new Response(rewritten, {
        status: 200,
        headers: corsHeaders("application/vnd.apple.mpegurl", cast),
      });
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        if (head.length) controller.enqueue(head);
        return (async () => {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        })();
      },
      cancel() {
        void reader.cancel();
      },
    });
    return new Response(stream, { status, headers: segmentHeaders });
  }

  const buffer = await upstream.arrayBuffer();
  const peek = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 16)).trimStart();
  if (peek.startsWith("#EXTM3U")) {
    const text = new TextDecoder().decode(buffer);
    const rewritten = rewriteManifest(
      text,
      rewriteBase,
      referer,
      origin,
      cookie,
      sessionId,
      cast,
      mediaUrl,
    );
    return new Response(rewritten, {
      status: 200,
      headers: corsHeaders("application/vnd.apple.mpegurl", cast),
    });
  }

  return new Response(buffer, { status, headers: segmentHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders("text/plain", true),
  });
}

export const maxDuration = 60;
