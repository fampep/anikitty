import { getDb } from "@/db";
import { watchProgress } from "@/db/schema";
import { queryAniList } from "@/lib/oauth/anilist";
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
        recommendations(sort: RATING_DESC, perPage: 10) {
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
  nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
};

/**
 * Recommendations derived from a user's watch history: pull AniList
 * recommendations for the anime they've watched, aggregate the ratings,
 * drop anything already watched, and rank.
 */
export type RecommendationResult = { items: IAnime[]; hasHistory: boolean };

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

  let raw: { Page?: { media: Array<{ recommendations?: { nodes: Array<{ rating: number | null; mediaRecommendation: RecMedia | null }> } }> } };
  try {
    raw = await queryAniList(RECS_QUERY, { ids: seeds });
  } catch {
    return { items: [], hasHistory: true };
  }

  // Aggregate recommendation ratings across all seed anime.
  const scored = new Map<number, { media: RecMedia; score: number }>();
  for (const media of raw.Page?.media ?? []) {
    for (const node of media.recommendations?.nodes ?? []) {
      const rec = node.mediaRecommendation;
      if (!rec || rec.isAdult) continue;
      if (watchedIds.has(rec.id)) continue;
      const prev = scored.get(rec.id);
      const add = node.rating ?? 1;
      if (prev) prev.score += add;
      else scored.set(rec.id, { media: rec, score: add });
    }
  }

  const ranked = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry) => toAnime(entry.media));

  const enriched = await enrichAnimeListWithAudio(ranked);
  return { items: enriched as unknown as IAnime[], hasHistory: true };
}
