import { AnilistMediaList } from "@/types/anilist-animes";
import { NextRequest, NextResponse } from "next/server";

const KITTY_BASE = "https://kittyapi.buzz";

interface KittySearchResult {
  id: string;
  title: string;
  poster?: string;
  anilistId?: number;
}

/** Search KittyAPI for an anime by title, returns the best match or null. */
async function searchKitty(
  query: string,
  apiKey: string | undefined,
): Promise<KittySearchResult | null> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const res = await fetch(
      `${KITTY_BASE}/provider/Miruro/search?q=${encodeURIComponent(query)}`,
      { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    // KittyAPI returns { results: [...] } or an array directly
    const results: any[] = Array.isArray(data) ? data : (data?.results ?? data?.animes ?? []);
    if (!results.length) return null;
    const first = results[0];
    return {
      id: String(first.id ?? first.animeId ?? ""),
      title: first.title ?? first.name ?? query,
      poster: first.poster ?? first.image ?? undefined,
      anilistId: first.anilistId ?? first.al_id ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ provider: string }> },
) {
  const params = await props.params;
  const { provider } = params;
  if (provider !== "anilist") {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const body = await request.json();
  const animeList = body.animes as AnilistMediaList[];

  if (!animeList || animeList.length === 0) {
    return NextResponse.json(
      { error: "No anime list provided" },
      { status: 400 },
    );
  }

  const STATUS_MAP = {
    anilist: {
      CURRENT:   "watching",
      COMPLETED: "completed",
      PLANNING:  "plan to watch",
      DROPPED:   "dropped",
      PAUSED:    "on hold",
      REPEATING: "watching",
    },
  } as const;

  type ProviderStatus = keyof typeof STATUS_MAP;
  type StatusType     = keyof (typeof STATUS_MAP)[ProviderStatus];

  const apiKey = process.env.KITTY_API_KEY;
  const mappedAnimes = [];

  for (const item of animeList) {
    for (const entry of item.entries) {
      const { media: { title } } = entry;

      // Prefer English title, fall back to romaji
      const query = title?.english ?? title?.romaji;
      if (!query) continue;

      const result = await searchKitty(query, apiKey);
      if (!result?.id) continue;

      mappedAnimes.push({
        id:        result.id,
        thumbnail: result.poster ?? "",
        title:     result.title,
        status:    STATUS_MAP[provider as ProviderStatus][item.status as StatusType],
      });
    }
  }

  return NextResponse.json({ animes: mappedAnimes }, { status: 200 });
}

export const maxDuration = 60;
