const KITTY_PROXY = "https://kittyapi.buzz/proxy-segment";

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

  const kittyUrl = `${KITTY_PROXY}?url=${encodeURIComponent(decoded)}`;
  const upstream = await fetch(kittyUrl, { cache: "no-store" });

  if (!upstream.ok) {
    return new Response(`upstream ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "";

  // Fast path: URL or content-type clearly indicates m3u8
  if (isM3u8ByUrl(decoded) || isM3u8ByContentType(contentType)) {
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

  // Slow path: ambiguous URL (e.g. no .m3u8 extension) — peek at the body
  const buffer = await upstream.arrayBuffer();
  const peek = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 16)).trimStart();
  if (peek.startsWith("#EXTM3U")) {
    const text = new TextDecoder().decode(buffer);
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
