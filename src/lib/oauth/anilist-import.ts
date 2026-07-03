import { kittyApiFetch } from "@/lib/kitty/kitty-api";
import type { AnilistMediaList } from "@/types/anilist-animes";

export const ANILIST_STATUS_TO_FOLDER: Record<string, string> = {
  CURRENT: "WATCHING",
  COMPLETED: "COMPLETED",
  PLANNING: "PLANNING",
  DROPPED: "DROPPED",
  PAUSED: "PAUSED",
  REPEATING: "WATCHING",
};

export const ANILIST_STATUS_TO_LABEL: Record<string, string> = {
  CURRENT: "watching",
  COMPLETED: "completed",
  PLANNING: "plan to watch",
  DROPPED: "dropped",
  PAUSED: "on hold",
  REPEATING: "watching",
};

export type AniListMediaEntry = {
  media: {
    id: number;
    idMal?: number | null;
    bannerImage?: string | null;
    coverImage?: { large?: string | null } | null;
    title: { english?: string | null; romaji?: string | null };
  };
};

export type MappedAniListAnime = {
  id: string;
  anilistId: number;
  malId?: number;
  title: string;
  thumbnail: string;
  folder: string;
  status: string;
};

interface KittySearchResult {
  id: string;
  title: string;
  poster?: string;
  anilistId?: number;
}

async function searchKittyForAnilistId(
  anilistId: number,
  titles: (string | null | undefined)[],
  apiKey: string | undefined,
): Promise<KittySearchResult | null> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const seen = new Set<string>();
  for (const title of titles) {
    if (!title || seen.has(title)) continue;
    seen.add(title);

    try {
      const res = await kittyApiFetch(
        `/provider/Miruro/search?q=${encodeURIComponent(title)}`,
        { headers, signal: AbortSignal.timeout(8_000), cache: "no-store" },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results: any[] = Array.isArray(data) ? data : (data?.results ?? data?.animes ?? []);

      const match = results.find((r) => {
        const al = r.anilistId ?? r.al_id;
        return al === anilistId || String(r.id ?? r.animeId) === String(anilistId);
      });
      if (match) {
        return {
          id: String(anilistId),
          title: match.title ?? match.name ?? title,
          poster: match.poster ?? match.image,
          anilistId,
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function mapAniListEntry(
  entry: AniListMediaEntry,
  listStatus: string,
  apiKey?: string,
): Promise<MappedAniListAnime> {
  const { media } = entry;
  const anilistId = media.id;
  const fallbackTitle =
    media.title?.english ?? media.title?.romaji ?? `Anime #${anilistId}`;
  const fallbackThumb =
    media.bannerImage ?? media.coverImage?.large ?? "";

  const folder = ANILIST_STATUS_TO_FOLDER[listStatus] ?? "WATCHING";
  const status = ANILIST_STATUS_TO_LABEL[listStatus] ?? "watching";

  const kitty = await searchKittyForAnilistId(
    anilistId,
    [media.title?.english, media.title?.romaji],
    apiKey,
  );

  return {
    id: String(anilistId),
    anilistId,
    ...(media.idMal ? { malId: media.idMal } : {}),
    title: kitty?.title ?? fallbackTitle,
    thumbnail: kitty?.poster ?? fallbackThumb,
    folder,
    status,
  };
}

export async function mapAniListLists(
  lists: AnilistMediaList[] | Array<{ name: string; status: string; entries: AniListMediaEntry[] }>,
  apiKey?: string,
): Promise<MappedAniListAnime[]> {
  const byAnilistId = new Map<number, MappedAniListAnime>();

  for (const list of lists) {
    for (const entry of list.entries) {
      const mapped = await mapAniListEntry(entry, list.status, apiKey);
      byAnilistId.set(mapped.anilistId, mapped);
    }
  }

  return [...byAnilistId.values()];
}
