import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { episodeSubtitles, subtitleLibraryAnime } from "@/db/schema";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { SUBTITLE_SOURCE_PROVIDER } from "@/lib/subtitle-track-utils";

export type AnilistMeta = {
  anilistId: number;
  title: string;
  poster: string | null;
  status: string | null;
  episodes: number | null;
  score: number | null;
  year: number | null;
};

const META_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function computeIsComplete(cachedEpisodeCount: number, totalEpisodes: number | null | undefined) {
  return (
    totalEpisodes != null &&
    totalEpisodes > 0 &&
    cachedEpisodeCount >= totalEpisodes
  );
}

function rowToEntry(row: {
  anilistId: number;
  animeTitle: string | null;
  trackCount: number;
  episodeCount: number;
  lastFetched: Date | null;
  poster?: string | null;
  status?: string | null;
  totalEpisodes?: number | null;
  isComplete?: boolean | null;
  score?: number | null;
  year?: number | null;
}): SubtitleLibraryEntry {
  return {
    anilistId: row.anilistId,
    animeTitle: row.animeTitle,
    trackCount: row.trackCount,
    episodeCount: row.episodeCount,
    lastFetched: row.lastFetched?.toISOString() ?? null,
    poster: row.poster ?? null,
    status: row.status ?? null,
    totalEpisodes: row.totalEpisodes ?? null,
    isComplete: row.isComplete ?? false,
    score: row.score ?? null,
    year: row.year ?? null,
  };
}

export async function getStoredSubtitleLibraryMeta(
  anilistIds: number[],
): Promise<Map<number, AnilistMeta>> {
  const map = new Map<number, AnilistMeta>();
  if (!dbAvailable() || anilistIds.length === 0) return map;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(inArray(subtitleLibraryAnime.anilistId, anilistIds));

    for (const row of rows) {
      map.set(row.anilistId, {
        anilistId: row.anilistId,
        title: row.animeTitle?.trim() || `Anime #${row.anilistId}`,
        poster: row.poster ?? null,
        status: row.status ?? null,
        episodes: row.totalEpisodes ?? null,
        score: row.score ?? null,
        year: row.year ?? null,
      });
    }
  } catch {
    /* ignore */
  }

  return map;
}

export async function persistSubtitleLibraryMeta(meta: AnilistMeta): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const [existing] = await db
      .select({
        cachedEpisodeCount: subtitleLibraryAnime.cachedEpisodeCount,
      })
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.anilistId, meta.anilistId))
      .limit(1);

    const cachedEpisodeCount = existing?.cachedEpisodeCount ?? 0;
    const isComplete = computeIsComplete(cachedEpisodeCount, meta.episodes);
    const now = new Date();

    await db
      .insert(subtitleLibraryAnime)
      .values({
        anilistId: meta.anilistId,
        animeTitle: meta.title,
        poster: meta.poster,
        status: meta.status,
        totalEpisodes: meta.episodes,
        cachedEpisodeCount,
        isComplete,
        score: meta.score,
        year: meta.year,
        metaFetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subtitleLibraryAnime.anilistId,
        set: {
          animeTitle: meta.title,
          poster: meta.poster,
          status: meta.status,
          totalEpisodes: meta.episodes,
          isComplete,
          score: meta.score,
          year: meta.year,
          metaFetchedAt: now,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[subtitle-library-db] persist meta failed:", err);
  }
}

export async function syncSubtitleLibraryAnime(anilistId: number): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const [agg] = await db
      .select({
        trackCount: sql<number>`count(*)::int`,
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
        animeTitle: sql<string | null>`max(${episodeSubtitles.animeTitle})`,
        lastFetched: sql<Date | null>`max(${episodeSubtitles.fetchedAt})`,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, anilistId),
          eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
        ),
      );

    if (!agg || agg.trackCount === 0) return;

    const [existing] = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.anilistId, anilistId))
      .limit(1);

    const totalEpisodes = existing?.totalEpisodes ?? null;
    const isComplete = computeIsComplete(agg.episodeCount, totalEpisodes);
    const now = new Date();

    await db
      .insert(subtitleLibraryAnime)
      .values({
        anilistId,
        animeTitle: agg.animeTitle ?? existing?.animeTitle ?? null,
        poster: existing?.poster ?? null,
        status: existing?.status ?? null,
        totalEpisodes,
        cachedEpisodeCount: agg.episodeCount,
        trackCount: agg.trackCount,
        isComplete,
        score: existing?.score ?? null,
        year: existing?.year ?? null,
        lastSubtitleAt: agg.lastFetched,
        metaFetchedAt: existing?.metaFetchedAt ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: subtitleLibraryAnime.anilistId,
        set: {
          animeTitle: agg.animeTitle ?? existing?.animeTitle ?? null,
          cachedEpisodeCount: agg.episodeCount,
          trackCount: agg.trackCount,
          isComplete,
          lastSubtitleAt: agg.lastFetched,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[subtitle-library-db] sync failed:", err);
  }
}

export async function needsSubtitleLibraryMetaRefresh(anilistId: number): Promise<boolean> {
  if (!dbAvailable()) return true;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        metaFetchedAt: subtitleLibraryAnime.metaFetchedAt,
        totalEpisodes: subtitleLibraryAnime.totalEpisodes,
      })
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.anilistId, anilistId))
      .limit(1);

    if (!row?.metaFetchedAt || row.totalEpisodes == null) return true;
    return Date.now() - row.metaFetchedAt.getTime() > META_STALE_MS;
  } catch {
    return true;
  }
}

export async function countCompletedSubtitleAnimesFromDb(): Promise<number> {
  if (!dbAvailable()) return 0;

  try {
    const db = getDb();
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(subtitleLibraryAnime)
      .where(
        and(
          eq(subtitleLibraryAnime.isComplete, true),
          or(isNull(subtitleLibraryAnime.status), eq(subtitleLibraryAnime.status, "FINISHED")),
        ),
      );

    return row?.total ?? 0;
  } catch {
    return 0;
  }
}

function completedWhere(q?: string) {
  const base = and(
    eq(subtitleLibraryAnime.isComplete, true),
    or(isNull(subtitleLibraryAnime.status), eq(subtitleLibraryAnime.status, "FINISHED")),
  );

  const trimmed = q?.trim();
  if (!trimmed) return base;

  const pattern = `%${trimmed.replace(/[%_]/g, "")}%`;
  return and(
    base,
    or(
      ilike(subtitleLibraryAnime.animeTitle, pattern),
      sql`cast(${subtitleLibraryAnime.anilistId} as text) like ${pattern}`,
    ),
  );
}

export async function searchCompletedSubtitleLibrary(opts: {
  q?: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: SubtitleLibraryEntry[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  cachedAnilistIds: number[];
}> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(50, Math.max(1, opts.limit ?? 24));
  const offset = (page - 1) * limit;
  const whereClause = completedWhere(opts.q);

  if (!dbAvailable()) {
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }

  try {
    const db = getDb();

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(subtitleLibraryAnime)
      .where(whereClause);

    const total = countRow?.total ?? 0;

    let cachedAnilistIds: number[] = [];
    if (opts.q?.trim()) {
      const idRows = await db
        .select({ anilistId: subtitleLibraryAnime.anilistId })
        .from(subtitleLibraryAnime)
        .where(whereClause);
      cachedAnilistIds = idRows.map((row) => row.anilistId);
    }

    const rows = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(whereClause)
      .orderBy(desc(subtitleLibraryAnime.lastSubtitleAt))
      .limit(limit)
      .offset(offset);

    return {
      items: rows.map((row) =>
        rowToEntry({
          anilistId: row.anilistId,
          animeTitle: row.animeTitle,
          trackCount: row.trackCount,
          episodeCount: row.cachedEpisodeCount,
          lastFetched: row.lastSubtitleAt,
          poster: row.poster,
          status: row.status,
          totalEpisodes: row.totalEpisodes,
          isComplete: row.isComplete,
          score: row.score,
          year: row.year,
        }),
      ),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
      cachedAnilistIds,
    };
  } catch {
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }
}

export async function listIncompleteSubtitleAnimesFromDb(limit: number): Promise<number[]> {
  if (!dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select({ anilistId: subtitleLibraryAnime.anilistId })
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.isComplete, false))
      .orderBy(subtitleLibraryAnime.cachedEpisodeCount)
      .limit(limit);

    if (rows.length > 0) {
      return rows.map((row) => row.anilistId);
    }
  } catch {
    /* fall through */
  }

  return [];
}

/** Backfill summary rows for anime that have cached tracks but no summary row yet. */
export async function backfillSubtitleLibraryAnime(limit = 50): Promise<number> {
  if (!dbAvailable()) return 0;

  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ anilistId: episodeSubtitles.anilistId })
      .from(episodeSubtitles)
      .leftJoin(
        subtitleLibraryAnime,
        eq(episodeSubtitles.anilistId, subtitleLibraryAnime.anilistId),
      )
      .where(
        and(
          eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
          isNull(subtitleLibraryAnime.anilistId),
        ),
      )
      .limit(limit);

    for (const row of rows) {
      await syncSubtitleLibraryAnime(row.anilistId);
    }

    return rows.length;
  } catch {
    return 0;
  }
}
