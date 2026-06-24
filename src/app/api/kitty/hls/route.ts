const KITTY_PROXY = "https://kittyapi.buzz/proxy-stream";

// If the URL is already a kittyapi.buzz/proxy-stream URL, extract the inner CDN URL.
// That inner URL is what we use as the base for resolving relative paths in the m3u8.
function extractContentUrl(decoded: string): string {
  try {
    const u = new URL(decoded);
    if (
      (u.hostname === "kittyapi.buzz" || u.hostname === "www.kittyapi.buzz") &&
      u.pathname === "/proxy-stream" &&
      u.searchParams.has("url")
    ) {
      return decodeURIComponent(u.searchParams.get("url")!);
    }
  } catch {}
  return decoded;
}

// Fetch URL: kittyapi.buzz proxy-stream URLs are fetched directly (force https).
// Raw CDN URLs are wrapped in proxy-stream so the CDN sees the right Referer/Origin.
function buildFetchUrl(decoded: string): string {
  try {
    const u = new URL(decoded);
    if (u.hostname === "kittyapi.buzz" || u.hostname === "www.kittyapi.buzz") {
      // Normalise http → https and fetch directly (already proxied)
      u.protocol = "https:";
      return u.toString();
    }
  } catch {}
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

  // The real CDN URL — used as base for resolving m3u8 relative paths
  const contentUrl = extractContentUrl(decoded);
  // Fetch URL — avoids double-proxying kittyapi.buzz URLs
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
