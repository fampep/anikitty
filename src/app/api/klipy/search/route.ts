import { NextResponse } from "next/server";
import type { GifSearchResult } from "@/lib/gif/gif-search-types";

const KLIPY_API_KEY = process.env.KLIPY_API_KEY?.trim();
const KLIPY_BASE = "https://api.klipy.com/api/v1";

type KlipyMediaFormat = { url?: string; dims?: number[] };
type KlipyItem = {
  id: string;
  title?: string;
  content_description?: string;
  media_formats?: Record<string, KlipyMediaFormat>;
};

function pickFormat(
  formats: Record<string, KlipyMediaFormat> | undefined,
  ...keys: string[]
): KlipyMediaFormat | null {
  if (!formats) return null;
  for (const key of keys) {
    const fmt = formats[key];
    if (fmt?.url) return fmt;
  }
  return null;
}

function mapItem(item: KlipyItem): GifSearchResult | null {
  const formats = item.media_formats;
  const previewFmt = pickFormat(formats, "nanogif", "tinygif", "gif");
  const fullFmt = pickFormat(formats, "gif", "mediumgif", "tinygif") ?? previewFmt;
  if (!previewFmt?.url || !fullFmt?.url) return null;
  const dims = fullFmt.dims ?? previewFmt.dims ?? [200, 200];
  return {
    id: item.id,
    title: item.title || item.content_description || "GIF",
    preview: previewFmt.url,
    url: fullFmt.url,
    width: dims[0] || 200,
    height: dims[1] || 200,
  };
}

export async function GET(req: Request) {
  if (!KLIPY_API_KEY) {
    return NextResponse.json({ results: [], error: "klipy_unconfigured" }, { status: 200 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24), 1), 40);

  const params = new URLSearchParams({
    limit: String(limit),
    locale: "en_US",
    ContentFilter: "medium",
    media_filter: "nanogif,tinygif,gif,mediumgif",
  });
  if (q) params.set("q", q);

  const endpoint = q ? "search" : "trending";
  const url = `${KLIPY_BASE}/${KLIPY_API_KEY}/gifs/${endpoint}?${params.toString()}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 120 },
    });
    if (!res.ok) {
      return NextResponse.json({ results: [], error: "klipy_unavailable" }, { status: 200 });
    }
    const data = (await res.json()) as { results?: KlipyItem[]; data?: { results?: KlipyItem[] } };
    const items = data.results ?? data.data?.results ?? [];
    const results = items
      .map(mapItem)
      .filter((r): r is GifSearchResult => r !== null);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "klipy_unavailable" }, { status: 200 });
  }
}

export const maxDuration = 15;
