const KITTY_PROXY = "https://kittyapi.buzz/proxy-stream";

/**
 * Detect whether a URL is already a proxy endpoint (CDN or kittyapi).
 * These should be fetched directly — wrapping them again causes 403/404.
 * Pattern: any URL whose path is /proxy-segment or /proxy-stream with a ?url= param.
 */
function isAlreadyProxied(decoded: string): boolean {
  try {
    const u = new URL(decoded);
    return (
      u.searchParams.has("url") &&
      (u.pathname === "/proxy-segment" || u.pathname === "/proxy-stream")
    );
  } catch {
    return false;
  }
}

/**
 * Extract the real CDN URL from a proxy URL's ?url= param.
 * Used as the base URL when resolving relative paths inside an m3u8 manifest.
 */
function extractContentUrl(decoded: string): string {
  try {
    const u = new URL(decoded);
    if (u.searchParams.has("url")) {
      return decodeURIComponent(u.searchParams.get("url")!);
    }
  } catch {}
  return decoded;
}

/**
 * Build the actual fetch URL:
 * - Proxy URLs (CDN or kittyapi): fetch directly (already have right Referer/Origin).
 * - Raw CDN URLs: route through kittyapi.buzz/proxy-stream.
 * Also normalises http:// → https:// for safety.
 */
function buildFetchUrl(decoded: string): string {
  if (isAlreadyProxied(decoded)) {
    return decoded.replace(/^http:\/\//, "https://");
  }
  return `${KITTY_PROXY}?url=${encodeURIComponent(decoded)}`;
}

function isM3u8ByUrl(url: string): boolean {
  return url.endsWith(".m3u8") || url.includes(".m3u8?") || url.includes(".m3u8&");
}

function isM3u8ByContentType(ct: string): boolean {
  return ct.includes("mpegurl") || ct.includes("m3u8");
}

function rewriteManifest(body: string, manifestUrl: string): string {
  const base = new URL(manifestUrl);

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const abs = new URL(uri, base).toString();
          return `URI="${proxyUrl(abs)}"`;
        });
      }

      const abs = new URL(trimmed, base).toString();
      return proxyUrl(abs);
    })
    .join("\n");
}

function proxyUrl(abs: string): string {
  return `/api/kitty/hls?url=${encodeURIComponent(abs)}`;
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

  // Use the real CDN URL as the base for m3u8 relative path resolution
  const contentUrl = extractContentUrl(decoded);
  // Fetch directly if already proxied, otherwise wrap in kittyapi.buzz
  const fetchUrl = buildFetchUrl(decoded);

  const upstream = await fetch(fetchUrl, { cache: "no-store" });

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  // Fast path: URL or content-type clearly indicates m3u8
  if (isM3u8ByUrl(contentUrl) || isM3u8ByContentType(contentType)) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, contentUrl);
    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  // Slow path: peek at body to detect extensionless m3u8
  const buffer = await upstream.arrayBuffer();
  const peek = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 16)).trimStart();
  if (peek.startsWith("#EXTM3U")) {
    const text = new TextDecoder().decode(buffer);
    const rewritten = rewriteManifest(text, contentUrl);
    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  // Binary segment
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType || "video/MP2T",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
