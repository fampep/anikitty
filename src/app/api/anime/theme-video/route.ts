import {
  isAllowedThemeVideoUrl,
} from "@/lib/anime/animethemes-proxy";

export const runtime = "nodejs";

const UPSTREAM_HEADERS = {
  Accept: "video/webm,*/*",
  "User-Agent": "Anikitty/1.0 (+https://github.com/fampep/anikitty)",
};

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
] as const;

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src");
  if (!src || !isAllowedThemeVideoUrl(src)) {
    return new Response("Invalid theme video source", { status: 400 });
  }

  const range = req.headers.get("range");
  const upstream = await fetch(src, {
    headers: {
      ...UPSTREAM_HEADERS,
      ...(range ? { Range: range.replace(/[\r\n\0]/g, "").trim().slice(0, 128) } : {}),
    },
    signal: AbortSignal.timeout(60_000),
    cache: "force-cache",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return new Response(null, { status: upstream.status });
  }

  const headers = new Headers();
  for (const name of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "public, max-age=86400, immutable");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
