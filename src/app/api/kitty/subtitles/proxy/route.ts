import { isAllowedMediaProxyUrl, sanitizeHeaderValue } from "@/lib/security/security";
import { detectSubtitleFormat, subtitleContentType } from "@/lib/subtitles/subtitle-track-utils";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const referer = searchParams.get("referer");

  if (!url || !isAllowedMediaProxyUrl(url)) {
    return new Response("Invalid subtitle URL", { status: 400 });
  }

  const headers: Record<string, string> = {
    Accept: "text/vtt,text/plain,*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  const safeReferer = sanitizeHeaderValue(referer);
  if (safeReferer) headers.Referer = safeReferer;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers,
    });

    if (!res.ok) {
      return new Response("Subtitle fetch failed", { status: res.status });
    }

    const text = await res.text();
    if (!text.trim()) {
      return new Response("Empty subtitle", { status: 404 });
    }

    const format = detectSubtitleFormat({ url, content: text });

    return new Response(text, {
      status: 200,
      headers: {
        "Content-Type": subtitleContentType(format),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "*",
        "X-Subtitle-Format": format,
      },
    });
  } catch {
    return new Response("Subtitle fetch failed", { status: 502 });
  }
}

export const maxDuration = 15;
