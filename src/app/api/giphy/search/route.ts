import { NextResponse } from "next/server";
import type { GifSearchResult } from "@/lib/gif/gif-search-types";

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || "dc6zaTOxFJmzC";
const GIPHY_BASE = "https://api.giphy.com/v1/gifs";

type GiphyImage = { url?: string; width?: string; height?: string };
type GiphyItem = {
  id: string;
  title?: string;
  images?: {
    fixed_width?: GiphyImage;
    fixed_width_downsampled?: GiphyImage;
    downsized_medium?: GiphyImage;
    original?: GiphyImage;
  };
};

export type GiphyResult = GifSearchResult;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 120);
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 24), 1), 40);

  const params = new URLSearchParams({
    api_key: GIPHY_API_KEY,
    limit: String(limit),
    rating: "pg-13",
    bundle: "messaging_non_clips",
  });
  if (q) params.set("q", q);

  const endpoint = q ? "search" : "trending";

  try {
    const res = await fetch(`${GIPHY_BASE}/${endpoint}?${params.toString()}`, {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 120 },
    });
    if (!res.ok) {
      return NextResponse.json({ results: [], error: "giphy_unavailable" }, { status: 200 });
    }
    const data = (await res.json()) as { data?: GiphyItem[] };
    const results: GifSearchResult[] = (data.data ?? [])
      .map((item): GifSearchResult | null => {
        const imgs = item.images ?? {};
        const preview =
          imgs.fixed_width_downsampled?.url ?? imgs.fixed_width?.url ?? "";
        const full =
          imgs.downsized_medium?.url ?? imgs.original?.url ?? imgs.fixed_width?.url ?? preview;
        if (!preview || !full) return null;
        const pw = imgs.fixed_width?.width ?? imgs.original?.width;
        const ph = imgs.fixed_width?.height ?? imgs.original?.height;
        return {
          id: item.id,
          title: item.title ?? "GIF",
          preview,
          url: full,
          width: Number(pw ?? 200) || 200,
          height: Number(ph ?? 200) || 200,
        };
      })
      .filter((r): r is GifSearchResult => r !== null);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: "giphy_unavailable" }, { status: 200 });
  }
}

export const maxDuration = 15;
