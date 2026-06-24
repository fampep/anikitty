/**
 * HLS proxy — routes all upstream fetches through kittyapi.buzz/proxy-segment
 * so that the CDN sees kittyapi.buzz's server IP and trusted Referer, not Vercel's.
 * Manifests (.m3u8) are rewritten so every subsequent segment/sub-manifest request
 * also routes back through this proxy (and therefore through kittyapi.buzz).
 */

const KITTY_PROXY = "https://kittyapi.buzz/proxy-segment";

function isM3u8(contentType: string, url: string): boolean {
  return (
    contentType.includes("mpegurl") ||
    contentType.includes("m3u8") ||
    url.endsWith(".m3u8") ||
    url.includes(".m3u8?")
  );
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

  const kittyUrl = `${KITTY_PROXY}?url=${encodeURIComponent(decoded)}`;
  const upstream = await fetch(kittyUrl, { cache: "no-store" });

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  if (isM3u8(contentType, decoded)) {
    const text = await upstream.text();
    const rewritten = rewriteManifest(text, decoded);

    return new Response(rewritten, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType || "video/MP2T",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
