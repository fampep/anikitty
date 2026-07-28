import type { getDb } from "@/db";
import { episodeRatings } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

type Db = ReturnType<typeof getDb>;

export const EPISODE_RATING_MIN = 0.5;
export const EPISODE_RATING_MAX = 10;

export type EpisodeRatingAggregate = {
  average: number | null;
  count: number;
};

/** Snap to half-points between 0.5 and 10. */
export function clampEpisodeScore(n: unknown): number | null {
  const v = typeof n === "number" ? n : typeof n === "string" ? parseFloat(n) : NaN;
  if (!Number.isFinite(v)) return null;
  const snapped = Math.round(v * 2) / 2;
  if (snapped < EPISODE_RATING_MIN || snapped > EPISODE_RATING_MAX) return null;
  return snapped;
}

export function formatEpisodeScore(score: number): string {
  const n = clampEpisodeScore(score) ?? score;
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export async function getEpisodeRatingAggregate(
  db: Db,
  animeId: string,
  episodeNumber: number,
): Promise<EpisodeRatingAggregate> {
  const [row] = await db
    .select({
      average: sql<number | null>`avg(${episodeRatings.score})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(episodeRatings)
    .where(
      and(
        eq(episodeRatings.animeId, animeId),
        eq(episodeRatings.episodeNumber, episodeNumber),
      ),
    );

  const count = row?.count ?? 0;
  if (count === 0 || row?.average == null) {
    return { average: null, count: 0 };
  }
  return {
    average: Math.round(row.average * 10) / 10,
    count,
  };
}

export async function getUserEpisodeRating(
  db: Db,
  userId: string,
  animeId: string,
  episodeNumber: number,
): Promise<number | null> {
  const [row] = await db
    .select({ score: episodeRatings.score })
    .from(episodeRatings)
    .where(
      and(
        eq(episodeRatings.userId, userId),
        eq(episodeRatings.animeId, animeId),
        eq(episodeRatings.episodeNumber, episodeNumber),
      ),
    )
    .limit(1);
  return row?.score ?? null;
}

export async function upsertEpisodeRating(
  db: Db,
  userId: string,
  animeId: string,
  episodeNumber: number,
  score: number,
): Promise<{ created: boolean }> {
  const existing = await getUserEpisodeRating(db, userId, animeId, episodeNumber);
  await db
    .insert(episodeRatings)
    .values({
      userId,
      animeId,
      episodeNumber,
      score,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        episodeRatings.userId,
        episodeRatings.animeId,
        episodeRatings.episodeNumber,
      ],
      set: {
        score,
        updatedAt: new Date(),
      },
    });
  return { created: existing == null };
}

export async function deleteEpisodeRating(
  db: Db,
  userId: string,
  animeId: string,
  episodeNumber: number,
): Promise<boolean> {
  const deleted = await db
    .delete(episodeRatings)
    .where(
      and(
        eq(episodeRatings.userId, userId),
        eq(episodeRatings.animeId, animeId),
        eq(episodeRatings.episodeNumber, episodeNumber),
      ),
    )
    .returning({ id: episodeRatings.id });
  return deleted.length > 0;
}

/** Batch averages for a playlist: map episodeNumber → { average, count }. */
export async function getEpisodeRatingsForAnime(
  db: Db,
  animeId: string,
): Promise<Record<number, EpisodeRatingAggregate>> {
  const rows = await db
    .select({
      episodeNumber: episodeRatings.episodeNumber,
      average: sql<number>`avg(${episodeRatings.score})::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(episodeRatings)
    .where(eq(episodeRatings.animeId, animeId))
    .groupBy(episodeRatings.episodeNumber);

  const out: Record<number, EpisodeRatingAggregate> = {};
  for (const row of rows) {
    out[row.episodeNumber] = {
      average: row.count > 0 ? Math.round(row.average * 10) / 10 : null,
      count: row.count,
    };
  }
  return out;
}
