import { isAllowedMediaProxyUrl, sanitizeHeaderValue } from "@/lib/security";

export type ResolvedVideo = {
  segments: string[];
  extension: "mp4" | "ts";
};

function isM3u8Url(url: string): boolean {
  return url.includes(".m3u8");
}

function buildFetchHeaders(headers: Record<string, string>): HeadersInit {
  const out: Record<string, string> = {
    Accept: "*/*",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  const referer =
    sanitizeHeaderValue(headers.Referer) || sanitizeHeaderValue(headers.referer);
  const origin =
    sanitizeHeaderValue(headers.Origin) || sanitizeHeaderValue(headers.origin);

  if (referer) out.Referer = referer;
  if (origin) out.Origin = origin;

  return out;
}

async function fetchText(url: string, headers: Record<string, string>): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
    headers: buildFetchHeaders(headers),
  });

  if (!res.ok) {
    throw new Error(`Manifest fetch failed (${res.status})`);
  }

  return res.text();
}

function resolveRelative(uri: string, base: string): string {
  return new URL(uri.trim(), base).toString();
}

function parseMasterVariants(body: string, baseUrl: string): { bandwidth: number; url: string }[] {
  const lines = body.split("\n");
  const variants: { bandwidth: number; url: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("#EXT-X-STREAM-INF")) continue;

    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;

    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next || next.startsWith("#")) continue;
      variants.push({ bandwidth, url: resolveRelative(next, baseUrl) });
      break;
    }
  }

  return variants;
}

function parseMediaSegments(body: string, baseUrl: string): string[] {
  const segments: string[] = [];
  let mapUri: string | null = null;

  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXT-X-MAP:")) {
      const uriMatch = line.match(/URI="([^"]+)"/i) ?? line.match(/URI='([^']+)'/i);
      if (uriMatch) mapUri = resolveRelative(uriMatch[1], baseUrl);
      continue;
    }

    if (line.startsWith("#")) continue;

    if (mapUri) {
      segments.push(mapUri);
      mapUri = null;
    }

    segments.push(resolveRelative(line, baseUrl));
  }

  if (mapUri) segments.unshift(mapUri);

  return segments;
}

export async function resolveVideoDownload(
  streamUrl: string,
  headers: Record<string, string>,
): Promise<ResolvedVideo> {
  if (!isAllowedMediaProxyUrl(streamUrl)) {
    throw new Error("Stream URL not allowed");
  }

  if (!isM3u8Url(streamUrl)) {
    const extension = streamUrl.includes(".mp4") ? "mp4" : "ts";
    return { segments: [streamUrl], extension };
  }

  const manifest = await fetchText(streamUrl, headers);

  if (manifest.includes("#EXT-X-STREAM-INF")) {
    const variants = parseMasterVariants(manifest, streamUrl);
    if (variants.length === 0) {
      throw new Error("No HLS variants found");
    }

    const best = variants.sort((a, b) => b.bandwidth - a.bandwidth)[0];
    return resolveVideoDownload(best.url, headers);
  }

  const segments = parseMediaSegments(manifest, streamUrl);
  if (segments.length === 0) {
    throw new Error("No HLS segments found");
  }

  return { segments, extension: "ts" };
}

export async function fetchSegment(
  url: string,
  headers: Record<string, string>,
): Promise<ArrayBuffer> {
  if (!isAllowedMediaProxyUrl(url)) {
    throw new Error("Segment URL not allowed");
  }

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
    headers: buildFetchHeaders(headers),
  });

  if (!res.ok) {
    throw new Error(`Segment fetch failed (${res.status})`);
  }

  return res.arrayBuffer();
}
