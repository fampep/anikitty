import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { toAnime } from "@/lib/core/home-data";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { IAnime } from "@/types/anime";

const SEED_LIMIT = 20;

const RECS_QUERY = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        id
        title { english romaji }
        genres
        studios { nodes { name isAnimationStudio } }
        recommendations(sort: RATING_DESC, perPage: 12) {
          nodes {
            rating
            mediaRecommendation {
              id
              title { english romaji }
              coverImage { extraLarge }
              episodes
              format
              averageScore
              seasonYear
              status
              isAdult
              genres
              studios { nodes { name isAnimationStudio } }
              nextAiringEpisode { episode airingAt }
            }
          }
        }
      }
    }
  }
`;

type RecMedia = {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { extraLarge?: string | null };
  episodes?: number | null;
  format?: string | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  status?: string | null;
  isAdult?: boolean;
  genres?: string[] | null;
  studios?: { nodes?: Array<{ name?: string; isAnimationStudio?: boolean }> } | null;
  nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
};

export type RecommendedItem = IAnime & {
  reason: string;
  reasonKind: "watched" | "genre" | "studio" | "community";
  seedTitle?: string;
};

export type RecommendationResult = {
  items: RecommendedItem[];
  hasHistory: boolean;
};

type Scored = {
  media: RecMedia;
  score: number;
  seedId: number;
  seedTitle: string;
  seedGenres: string[];
  seedStudios: string[];
};

/**
 * Recommendations from watch history with short explanations
 * (e.g. "Recommended because you watched Frieren.").
 */
export async function getRecommendationsForUser(userId: string): Promise<RecommendationResult> {
  const db = getDb();

  const rows = await db
    .selectDistinct({ anilistId: watchProgress.anilistId, updatedAt: watchProgress.updatedAt })
    .from(watchProgress)
    .where(and(eq(watchProgress.userId, userId), isNotNull(watchProgress.anilistId)))
    .orderBy(desc(watchProgress.updatedAt))
    .limit(200);

  const watchedIds = new Set<number>();
  for (const r of rows) if (r.anilistId) watchedIds.add(r.anilistId);
  if (watchedIds.size === 0) return { items: [], hasHistory: false };

  const seeds = [...watchedIds].slice(0, SEED_LIMIT);

  let raw: {
    Page?: {
      media: Array<{
        id: number;
        title?: { english?: string | null; romaji?: string | null };
        genres?: string[] | null;
        studios?: { nodes?: Array<{ name?: string; isAnimationStudio?: boolean }> } | null;
        recommendations?: {
          nodes: Array<{ rating: number | null; mediaRecommendation: RecMedia | null }>;
        };
      }>;
    };
  };
  try {
    raw = await queryAniList(RECS_QUERY, { ids: seeds });
  } catch {
    return { items: [], hasHistory: true };
  }

  const scored = new Map<number, Scored>();

  for (const media of raw.Page?.media ?? []) {
    const seedTitle = toTitle(media.title ?? {});
    const seedGenres = media.genres ?? [];
    const seedStudios = (media.studios?.nodes ?? [])
      .filter((s) => s.isAnimationStudio)
      .map((s) => s.name!)
      .filter(Boolean);

    for (const node of media.recommendations?.nodes ?? []) {
      const rec = node.mediaRecommendation;
      if (!rec || rec.isAdult) continue;
      if (watchedIds.has(rec.id)) continue;
      const add = (node.rating ?? 1) + 1;
      const prev = scored.get(rec.id);
      if (prev) {
        prev.score += add;
        // Prefer the most recent / strongest seed for the explanation.
        if (add > (node.rating ?? 1)) {
          prev.seedId = media.id;
          prev.seedTitle = seedTitle;
          prev.seedGenres = seedGenres;
          prev.seedStudios = seedStudios;
        }
      } else {
        scored.set(rec.id, {
          media: rec,
          score: add,
          seedId: media.id,
          seedTitle,
          seedGenres,
          seedStudios,
        });
      }
    }
  }

  const ranked = [...scored.values()].sort((a, b) => b.score - a.score).slice(0, 24);

  const items: RecommendedItem[] = ranked.map((entry) => {
    const base = toAnime(entry.media) as IAnime;
    const recGenres = (entry.media.genres ?? []).map((g) => g.toLowerCase());
    const recStudios = (entry.media.studios?.nodes ?? [])
      .filter((s) => s.isAnimationStudio)
      .map((s) => (s.name ?? "").toLowerCase());

    const sharedGenre = entry.seedGenres.find((g) => recGenres.includes(g.toLowerCase()));
    const sharedStudio = entry.seedStudios.find((s) => recStudios.includes(s.toLowerCase()));

    let reasonKind: RecommendedItem["reasonKind"] = "community";
    let reason = `Recommended because you watched ${entry.seedTitle}.`;

    if (sharedStudio) {
      reasonKind = "studio";
      reason = `Same studio as ${entry.seedTitle} (${sharedStudio}).`;
    } else if (sharedGenre) {
      reasonKind = "genre";
      reason = `Shares ${sharedGenre} with ${entry.seedTitle}.`;
    } else {
      reasonKind = "watched";
      reason = `Recommended because you watched ${entry.seedTitle}.`;
    }

    return {
      ...base,
      reason,
      reasonKind,
      seedTitle: entry.seedTitle,
    };
  });

  const enriched = await enrichAnimeListWithAudio(items);
  const byId = new Map(enriched.map((a) => [a.id, a]));

  return {
    items: items.map((item) => ({ ...item, ...(byId.get(item.id) ?? {}) })),
    hasHistory: true,
  };
}
