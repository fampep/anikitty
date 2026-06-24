/**
 * HLS proxy — fetches manifests and segments server-side so we can attach
 * Referer / Origin headers that browsers forbid setting from JavaScript.
 *
 * GET /api/kitty/hls?url=<encoded>&referer=<encoded>&origin=<encoded>
 *
 * For .m3u8 manifests we rewrite every URI line so that VHS (Video.js HTTP
 * Streaming) resolves segment and sub-manifest URLs back through this proxy,
 * keeping the same referer/origin headers for every subsequent request.
 */

function buildUpstream(): Headers {
  const h = new Headers();
  h.set("Referer", "https://kittyapi.buzz/");
  h.set("Origin", "https://kittyapi.buzz");
  h.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  );
  return h;
}

function isM3u8(contentType: string, url: string): boolean {
  return (
    contentType.includes("mpegurl") ||
    contentType.includes("m3u8") ||
    url.includes(".m3u8")
  );
}

/**
 * Rewrite every URI inside an HLS manifest so it routes through this proxy.
 */
function rewriteManifest(body: string, manifestUrl: string, referer: string, origin: string): string {
  const base = new URL(manifestUrl);

  return body
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      // Skip blank lines and EXT tags (but not URI= attributes)
      if (!trimmed || trimmed.startsWith("#")) {
        // Rewrite URI= attributes inside EXT tags (e.g. #EXT-X-MAP:URI="...")
        return line.replace(/URI="([^"]+)"/g, (_, uri) => {
          const abs = new URL(uri, base).toString();
          return `URI="${proxyUrl(abs, referer, origin)}"`;
        });
      }

      // Plain URI line (segment or sub-manifest)
      const abs = new URL(trimmed, base).toString();
      return proxyUrl(abs, referer, origin);
    })
    .join("\n");
}

function proxyUrl(abs: string, referer: string, origin: string): string {
  return `/api/kitty/hls?url=${encodeURIComponent(abs)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url     = searchParams.get("url");
  const referer = searchParams.get("referer") ?? "";
  const origin  = searchParams.get("origin")  ?? "";

  if (!url) {
    return new Response("url parameter required", { status: 400 });
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    return new Response("invalid url encoding", { status: 400 });
  }

  const upstream = await fetch(decoded, {
    headers: buildUpstream(),
    cache: "no-store",
  });

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  if (isM3u8(contentType, decoded)) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, decoded, referer, origin);

    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  // Binary segment — stream straight through
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "video/MP2T",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
