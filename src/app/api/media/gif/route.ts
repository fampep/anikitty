import { isPlausibleGifUrl, normalizeGifUrl, resolveGifUrlAsync } from "@/lib/core/gif-url";
import { isAllowedMediaProxyUrl, sanitizeHeaderValue } from "@/lib/security/security";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("url");
  if (!raw) {
    return new Response("Missing url", { status: 400 });
  }

  const normalized = normalizeGifUrl(raw);
  if (!normalized || !isPlausibleGifUrl(normalized) || !isAllowedMediaProxyUrl(normalized)) {
    return new Response("Invalid GIF URL", { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "image/*,video/mp4,*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Referer: "",
  };

  const referer = sanitizeHeaderValue(searchParams.get("referer"));
  if (referer) headers.Referer = referer;

  try {
    let target = normalized;
    let upstream = await fetchUpstream(target, headers);

    let contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      const resolved = await resolveGifUrlAsync(target);
      if (resolved !== target && isPlausibleGifUrl(resolved) && isAllowedMediaProxyUrl(resolved)) {
        target = resolved;
        upstream = await fetchUpstream(target, headers);
        contentType = upstream.headers.get("content-type") ?? "";
      }
    }

    if (!upstream.ok) {
      return new Response("GIF fetch failed", { status: upstream.status });
    }

    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) {
      return new Response("Not an image", { status: 415 });
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength === 0) {
      return new Response("Empty response", { status: 404 });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType.split(";")[0].trim(),
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch {
    return new Response("GIF fetch failed", { status: 502 });
  }
}

export const maxDuration = 15;

async function fetchUpstream(target: string, headers: Record<string, string>) {
  return fetch(target, {
    cache: "force-cache",
    signal: AbortSignal.timeout(12_000),
    headers,
    redirect: "follow",
  });
}
