import { NextResponse } from "next/server";
import type { GifSearchResult } from "@/lib/gif/gif-search-types";

const KLIPY_API_KEY = process.env.KLIPY_API_KEY?.trim() || "";
const KLIPY_BASE = "https://api.klipy.com/api/v1";

type KlipyFormat = { url?: string; width?: number; height?: number; size?: number };
type KlipySize = { gif?: KlipyFormat; webp?: KlipyFormat; mp4?: KlipyFormat };
type KlipyItem = {
  id?: number | string;
  slug?: string;
  title?: string;
  file?: {
    hd?: KlipySize;
    md?: KlipySize;
    sm?: KlipySize;
    xs?: KlipySize;
  };
};

type KlipySearchResponse = {
  result?: boolean;
  data?: {
    data?: KlipyItem[];
    current_page?: number;
    per_page?: number;
    has_next?: boolean;
  };
};

function pickFormat(...candidates: Array<KlipyFormat | undefined>): KlipyFormat | null {
  for (const c of candidates) {
    if (c?.url) return c;
  }
  return null;
}

function mapItem(item: KlipyItem): GifSearchResult | null {
  const files = item.file;
  if (!files) return null;

  const preview =
    pickFormat(files.sm?.gif, files.sm?.webp, files.xs?.gif, files.md?.gif, files.md?.webp) ??
    null;
  const full =
    pickFormat(files.md?.gif, files.hd?.gif, files.md?.webp, files.hd?.webp, files.sm?.gif) ??
    preview;
  if (!preview?.url || !full?.url) return null;

  const id = item.slug || (item.id != null ? String(item.id) : full.url);
  return {
    id,
    title: item.title?.trim() || "GIF",
    preview: preview.url,
    url: full.url,
    width: Number(preview.width ?? full.width ?? 200) || 200,
    height: Number(preview.height ?? full.height ?? 200) || 200,
  };
}

export async function GET(req: Request) {
  if (!KLIPY_API_KEY) {
    return NextResponse.json(
      { results: [], error: "klipy_not_configured" },
      { status: 200 },
    );
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24), 8), 50);

  const params = new URLSearchParams({
    per_page: String(limit),
    page: "1",
    rating: "pg-13",
    locale: "us_US",
  });
  if (q) params.set("q", q);

  const endpoint = q ? "search" : "trending";
  const url = `${KLIPY_BASE}/${encodeURIComponent(KLIPY_API_KEY)}/gifs/${endpoint}?${params}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
      next: { revalidate: 120 },
    });
    if (!res.ok) {
      return NextResponse.json({ results: [], error: "klipy_unavailable" }, { status: 200 });
    }

    const payload = (await res.json()) as KlipySearchResponse;
    if (payload.result === false) {
      return NextResponse.json({ results: [], error: "klipy_unavailable" }, { status: 200 });
    }

    const results = (payload.data?.data ?? [])
      .map(mapItem)
      .filter((r): r is GifSearchResult => r !== null);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "klipy_unavailable" }, { status: 200 });
  }
}

export const maxDuration = 15;
