import { isAllowedMediaProxyUrl } from "@/lib/security/security";

function isM3u8ByUrl(url: string): boolean {
  return url.endsWith(".m3u8") || url.includes(".m3u8?") || url.includes(".m3u8&");
}

function isM3u8ByContentType(ct: string): boolean {
  return ct.includes("mpegurl") || ct.includes("m3u8");
}

function buildProxyUrl(abs: string, referer: string, origin: string): string {
  const params = new URLSearchParams({ url: abs });
  if (referer) params.set("referer", referer);
  if (origin) params.set("origin", origin);
  return `/api/kitty/hls?${params.toString()}`;
}

function rewriteUriInTag(line: string, manifestUrl: string, referer: string, origin: string): string {
  const base = new URL(manifestUrl);

  return line
    .replace(/URI="([^"]+)"/gi, (_, uri) => {
      try {
        const abs = new URL(uri, base).toString();
        return `URI="${buildProxyUrl(abs, referer, origin)}"`;
      } catch {
        return `URI="${uri}"`;
      }
    })
    .replace(/URI='([^']+)'/gi, (_, uri) => {
      try {
        const abs = new URL(uri, base).toString();
        return `URI='${buildProxyUrl(abs, referer, origin)}'`;
      } catch {
        return `URI='${uri}'`;
      }
    });
}

function rewriteManifest(body: string, manifestUrl: string, referer: string, origin: string): string {
  const base = new URL(manifestUrl);

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return rewriteUriInTag(line, manifestUrl, referer, origin);
      }

      try {
        const abs = new URL(trimmed, base).toString();
        return buildProxyUrl(abs, referer, origin);
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
    "Cache-Control": "no-store",
  };
  // Same-origin playback does not need CORS; omit wildcard in production.
  if (process.env.NODE_ENV !== "production") {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new Response("url parameter required", { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return new Response("invalid url encoding", { status: 400 });
  }

  if (!isAllowedMediaProxyUrl(decoded)) {
    return new Response("url not allowed", { status: 403 });
  }

  const referer = searchParams.get("referer") ?? "";
  const origin = searchParams.get("origin") ?? "";
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

  if (isM3u8ByUrl(decoded) || isM3u8ByContentType(contentType)) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, decoded, referer, origin);
    return new Response(rewritten, {
      status: 200,
      headers: corsHeaders("application/vnd.apple.mpegurl"),
    });
  }

  const segmentType =
    contentType && !contentType.includes("text")
      ? contentType
      : decoded.includes(".mp4")
        ? "video/mp4"
        : "video/MP2T";

  const segmentHeaders = corsHeaders(segmentType);
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");
  if (contentLength) (segmentHeaders as Record<string, string>)["Content-Length"] = contentLength;
  if (contentRange) (segmentHeaders as Record<string, string>)["Content-Range"] = contentRange;
  if (acceptRanges) (segmentHeaders as Record<string, string>)["Accept-Ranges"] = acceptRanges;

  const status = upstream.status === 206 ? 206 : 200;
  const likelyMediaSegment =
    decoded.includes(".ts") ||
    decoded.includes(".mp4") ||
    decoded.includes(".m4s") ||
    contentType.includes("video") ||
    contentType.includes("octet-stream");

  if (likelyMediaSegment && upstream.body) {
    return new Response(upstream.body, { status, headers: segmentHeaders });
  }

  const buffer = await upstream.arrayBuffer();
  const peek = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 16)).trimStart();
  if (peek.startsWith("#EXTM3U")) {
    const text = new TextDecoder().decode(buffer);
    const rewritten = rewriteManifest(text, decoded, referer, origin);
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
