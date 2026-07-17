import { isAllowedMediaProxyUrl } from "@/lib/security/security";
import {
  HLS_SESSION_COOKIE,
  isAllowedHlsClientRequest,
  mintKittyHlsProxyUrl,
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
  sessionId: string,
): string {
  return mintKittyHlsProxyUrl(
    abs,
    { Referer: referer, Origin: origin },
    { sessionId },
  );
}

function rewriteUriInTag(
  line: string,
  manifestUrl: string,
  referer: string,
  origin: string,
  sessionId: string,
): string {
  const base = new URL(manifestUrl);

  return line
    .replace(/URI="([^"]+)"/gi, (_, uri) => {
      try {
        const abs = new URL(uri, base).toString();
        return `URI="${buildProxyUrl(abs, referer, origin, sessionId)}"`;
      } catch {
        return `URI="${uri}"`;
      }
    })
    .replace(/URI='([^']+)'/gi, (_, uri) => {
      try {
        const abs = new URL(uri, base).toString();
        return `URI='${buildProxyUrl(abs, referer, origin, sessionId)}'`;
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
  sessionId: string,
): string {
  const base = new URL(manifestUrl);

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return rewriteUriInTag(line, manifestUrl, referer, origin, sessionId);
      }

      try {
        const abs = new URL(trimmed, base).toString();
        return buildProxyUrl(abs, referer, origin, sessionId);
      } catch {
        return line;
      }
    })
    .join("\n");
}

function upstreamHeaders(referer: string, origin: string, range?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };
  const safeReferer = referer.replace(/[\r\n\0]/g, "").trim().slice(0, 512);
  const safeOrigin = origin.replace(/[\r\n\0]/g, "").trim().slice(0, 512);
  if (safeReferer) headers.Referer = safeReferer;
  if (safeOrigin) headers.Origin = safeOrigin;
  if (range) headers.Range = range.replace(/[\r\n\0]/g, "").trim().slice(0, 128);
  return headers;
}

function corsHeaders(contentType: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    "Cache-Control": "private, no-store, no-cache",
  };
  if (process.env.NODE_ENV !== "production") {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export async function GET(req: Request) {
  if (!isAllowedHlsClientRequest(req)) {
    return new Response("forbidden", { status: 403 });
  }

  // No per-IP rate limit — HLS segment traffic must not 429 mid-watch.

  const sessionId = verifyHlsSessionCookieValue(readCookie(req, HLS_SESSION_COOKIE));
  if (!sessionId) {
    return new Response("playback session required", { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("t");

  // Plaintext ?url= fallback is disabled — only opaque tokens are accepted.
  if (!token) {
    return new Response("playback token required", { status: 400 });
  }

  const resolved = resolveKittyHlsProxyToken(token, sessionId);
  if (!resolved) {
    return new Response("invalid or expired playback token", { status: 403 });
  }

  const decoded = resolved.url;
  const referer = resolved.referer;
  const origin = resolved.origin;

  if (!isAllowedMediaProxyUrl(decoded)) {
    return new Response("url not allowed", { status: 403 });
  }

  const range = req.headers.get("range");

  let upstream: Response;
  try {
    upstream = await fetch(decoded, {
      cache: "no-store",
      headers: upstreamHeaders(referer, origin, range),
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const rewriteBase = resolveRewriteBase(decoded);

  if (isM3u8ByUrl(decoded) || isM3u8ByContentType(contentType)) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, rewriteBase, referer, origin, sessionId);
    return new Response(rewritten, {
      status: 200,
      headers: corsHeaders("application/vnd.apple.mpegurl"),
    });
  }

  const segmentType = fixSegmentContentType(rewriteBase, contentType);

  const segmentHeaders = corsHeaders(segmentType);
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (contentLength) (segmentHeaders as Record<string, string>)["Content-Length"] = contentLength;
  if (contentRange) (segmentHeaders as Record<string, string>)["Content-Range"] = contentRange;
  if (acceptRanges) (segmentHeaders as Record<string, string>)["Accept-Ranges"] = acceptRanges;

  const status = upstream.status === 206 ? 206 : 200;
  const likelyMediaSegment =
    !isSpoofedMediaContentType(contentType) &&
    (decoded.includes(".ts") ||
      decoded.includes(".mp4") ||
      decoded.includes(".m4s") ||
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
      const rewritten = rewriteManifest(text, rewriteBase, referer, origin, sessionId);
      return new Response(rewritten, {
        status: 200,
        headers: corsHeaders("application/vnd.apple.mpegurl"),
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
    const rewritten = rewriteManifest(text, rewriteBase, referer, origin, sessionId);
    return new Response(rewritten, {
      status: 200,
      headers: corsHeaders("application/vnd.apple.mpegurl"),
    });
  }

  return new Response(buffer, { status, headers: segmentHeaders });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders("text/plain"),
  });
}

export const maxDuration = 60;
