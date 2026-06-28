import { and, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { episodeSubtitles, subtitleLibraryAnime } from "@/db/schema";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { SUBTITLE_LIBRARY_PROVIDERS } from "@/lib/subtitle-track-utils";

function subtitleProviderFilter() {
  return inArray(episodeSubtitles.provider, [...SUBTITLE_LIBRARY_PROVIDERS]);
}

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

/** Postgres aggregates and some drivers return timestamps as strings. */
function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isSubtitleLibraryComplete(opts: {
  trackCount: number;
  episodeCount: number;
  totalEpisodes: number | null | undefined;
}): boolean {
  return (
    opts.trackCount > 0 &&
    opts.episodeCount > 0 &&
    opts.totalEpisodes != null &&
    opts.totalEpisodes > 0 &&
    opts.episodeCount >= opts.totalEpisodes
  );
}

function computeIsComplete(
  cachedEpisodeCount: number,
  totalEpisodes: number | null | undefined,
  trackCount: number,
) {
  return isSubtitleLibraryComplete({
    trackCount,
    episodeCount: cachedEpisodeCount,
    totalEpisodes,
  });
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
    lastFetched: toDateOrNull(row.lastFetched)?.toISOString() ?? null,
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

    const [agg] = await db
      .select({
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, meta.anilistId),
          subtitleProviderFilter(),
        ),
      );

    const cachedEpisodeCount = Math.max(
      agg?.episodeCount ?? 0,
      existing?.cachedEpisodeCount ?? 0,
    );
    const isComplete = computeIsComplete(cachedEpisodeCount, meta.episodes, 0);
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
        trackCount: 0,
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
          cachedEpisodeCount,
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

export type SubtitleLibrarySyncResult = {
  isComplete: boolean;
  newlyComplete: boolean;
};

export async function syncSubtitleLibraryAnime(
  anilistId: number,
  opts?: { totalEpisodes?: number | null },
): Promise<SubtitleLibrarySyncResult> {
  if (!dbAvailable()) return { isComplete: false, newlyComplete: false };

  try {
    const db = getDb();
    const [agg] = await db
      .select({
        trackCount: sql<number>`count(*)::int`,
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
        animeTitle: sql<string | null>`max(${episodeSubtitles.animeTitle})`,
        lastFetched: sql<Date | null>`max(${episodeSubtitles.updatedAt})`,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, anilistId),
          subtitleProviderFilter(),
        ),
      );

    if (!agg || agg.trackCount === 0) return { isComplete: false, newlyComplete: false };

    const [existing] = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.anilistId, anilistId))
      .limit(1);

    const totalEpisodes =
      opts?.totalEpisodes ?? existing?.totalEpisodes ?? null;
    const wasComplete = existing?.isComplete ?? false;
    const isComplete = computeIsComplete(agg.episodeCount, totalEpisodes, agg.trackCount);
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
        lastSubtitleAt: toDateOrNull(agg.lastFetched),
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
          ...(opts?.totalEpisodes != null ? { totalEpisodes: opts.totalEpisodes } : {}),
          lastSubtitleAt: toDateOrNull(agg.lastFetched),
          updatedAt: now,
        },
      });

    return { isComplete, newlyComplete: isComplete && !wasComplete };
  } catch (err) {
    console.error("[subtitle-library-db] sync failed:", err);
    return { isComplete: false, newlyComplete: false };
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
        poster: subtitleLibraryAnime.poster,
      })
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.anilistId, anilistId))
      .limit(1);

    if (!row?.metaFetchedAt || row.totalEpisodes == null) return true;
    if (!row.poster?.includes("anilist.co")) return true;
    const metaFetchedAt = toDateOrNull(row.metaFetchedAt);
    if (!metaFetchedAt) return true;
    return Date.now() - metaFetchedAt.getTime() > META_STALE_MS;
  } catch {
    return true;
  }
}

/** Sum of cached vs total episodes across the library, for track-level coverage. */
export async function getSubtitleEpisodeCoverage(): Promise<{
  cachedEpisodes: number;
  totalEpisodes: number;
}> {
  if (!dbAvailable()) return { cachedEpisodes: 0, totalEpisodes: 0 };

  try {
    const db = getDb();
    const [row] = await db
      .select({
        cachedEpisodes: sql<number>`coalesce(sum(${subtitleLibraryAnime.cachedEpisodeCount}), 0)::int`,
        totalEpisodes: sql<number>`coalesce(sum(greatest(${subtitleLibraryAnime.totalEpisodes}, ${subtitleLibraryAnime.cachedEpisodeCount})), 0)::int`,
      })
      .from(subtitleLibraryAnime)
      .where(hasCachedTracksFilter());

    return {
      cachedEpisodes: row?.cachedEpisodes ?? 0,
      totalEpisodes: row?.totalEpisodes ?? 0,
    };
  } catch {
    return { cachedEpisodes: 0, totalEpisodes: 0 };
  }
}

export async function countCompletedSubtitleAnimesFromDb(): Promise<number> {
  if (!dbAvailable()) return 0;

  try {
    const db = getDb();
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(subtitleLibraryAnime)
      .where(eq(subtitleLibraryAnime.isComplete, true));

    return row?.total ?? 0;
  } catch {
    return 0;
  }
}

function completedWhere(q?: string) {
  // "Completed" = every known episode is cached (isComplete). We intentionally do
  // NOT restrict by airing status — a still-releasing show with all aired episodes
  // cached should still appear, matching countCompletedSubtitleAnimesFromDb.
  const base = eq(subtitleLibraryAnime.isComplete, true);

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

export type SubtitleLibrarySummary = {
  animeTitle: string | null;
  poster: string | null;
  status: string | null;
  totalEpisodes: number | null;
  isComplete: boolean;
  score: number | null;
  year: number | null;
};

export async function getSubtitleLibrarySummaryMap(
  anilistIds: number[],
): Promise<Map<number, SubtitleLibrarySummary>> {
  const map = new Map<number, SubtitleLibrarySummary>();
  if (!dbAvailable() || anilistIds.length === 0) return map;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(inArray(subtitleLibraryAnime.anilistId, anilistIds));

    for (const row of rows) {
      map.set(row.anilistId, {
        animeTitle: row.animeTitle,
        poster: row.poster,
        status: row.status,
        totalEpisodes: row.totalEpisodes,
        isComplete: row.isComplete,
        score: row.score,
        year: row.year,
      });
    }
  } catch {
    /* summary table may not exist yet */
  }

  return map;
}

/** Live library rows for specific anime (after sync / fetch). */
export async function getSubtitleLibraryEntriesByIds(
  anilistIds: number[],
): Promise<SubtitleLibraryEntry[]> {
  if (!dbAvailable() || anilistIds.length === 0) return [];

  const unique = [...new Set(anilistIds)];
  try {
    const db = getDb();
    const aggRows = await db
      .select({
        anilistId: episodeSubtitles.anilistId,
        trackCount: sql<number>`count(*)::int`,
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
        animeTitle: sql<string | null>`max(${episodeSubtitles.animeTitle})`,
        lastFetched: sql<Date | null>`max(${episodeSubtitles.updatedAt})`,
      })
      .from(episodeSubtitles)
      .where(
        and(
          inArray(episodeSubtitles.anilistId, unique),
          subtitleProviderFilter(),
        ),
      )
      .groupBy(episodeSubtitles.anilistId);

    const summaryMap = await getSubtitleLibrarySummaryMap(unique);

    return unique
      .map((anilistId) => {
        const agg = aggRows.find((row) => row.anilistId === anilistId);
        const summary = summaryMap.get(anilistId);
        if (!agg) return null;

        const trackCount = agg.trackCount;
        const episodeCount = agg.episodeCount;
        const totalEpisodes = summary?.totalEpisodes ?? null;
        const isComplete =
          summary?.isComplete ??
          isSubtitleLibraryComplete({ trackCount, episodeCount, totalEpisodes });

        return rowToEntry({
          anilistId,
          animeTitle: summary?.animeTitle ?? agg.animeTitle ?? null,
          trackCount,
          episodeCount,
          lastFetched: agg.lastFetched,
          poster: summary?.poster ?? null,
          status: summary?.status ?? null,
          totalEpisodes,
          isComplete,
          score: summary?.score ?? null,
          year: summary?.year ?? null,
        });
      })
      .filter((entry): entry is SubtitleLibraryEntry => entry != null);
  } catch (err) {
    console.error("[subtitle-library-db] entriesByIds failed:", err);
    return [];
  }
}

function allLibraryWhere(q?: string) {
  const trimmed = q?.trim();
  if (!trimmed) return undefined;

  const pattern = `%${trimmed.replace(/[%_]/g, "")}%`;
  return or(
    ilike(subtitleLibraryAnime.animeTitle, pattern),
    sql`cast(${subtitleLibraryAnime.anilistId} as text) like ${pattern}`,
  );
}

type LiveSubtitleCount = {
  trackCount: number;
  episodeCount: number;
  lastFetched: Date | null;
};

/** Live per-anime track/episode counts straight from episode_subtitles. */
export async function getLiveSubtitleCounts(
  anilistIds: number[],
): Promise<Map<number, LiveSubtitleCount>> {
  const map = new Map<number, LiveSubtitleCount>();
  if (!dbAvailable() || anilistIds.length === 0) return map;

  const unique = [...new Set(anilistIds)];
  try {
    const db = getDb();
    const rows = await db
      .select({
        anilistId: episodeSubtitles.anilistId,
        trackCount: sql<number>`count(*)::int`,
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
        lastFetched: sql<Date | null>`max(${episodeSubtitles.updatedAt})`,
      })
      .from(episodeSubtitles)
      .where(
        and(
          inArray(episodeSubtitles.anilistId, unique),
          subtitleProviderFilter(),
        ),
      )
      .groupBy(episodeSubtitles.anilistId);

    for (const row of rows) {
      map.set(row.anilistId, {
        trackCount: row.trackCount,
        episodeCount: row.episodeCount,
        lastFetched: row.lastFetched,
      });
    }
  } catch (err) {
    console.error("[subtitle-library-db] live counts failed:", err);
  }

  return map;
}

/** Overlay live track/episode counts onto summary-derived entries. */
function applyLiveCounts(
  entries: SubtitleLibraryEntry[],
  live: Map<number, LiveSubtitleCount>,
): SubtitleLibraryEntry[] {
  return entries.map((entry) => {
    const counts = live.get(entry.anilistId);
    if (!counts) return entry;

    const episodeCount = counts.episodeCount;
    const isComplete = isSubtitleLibraryComplete({
      trackCount: counts.trackCount,
      episodeCount,
      totalEpisodes: entry.totalEpisodes,
    });

    return {
      ...entry,
      trackCount: counts.trackCount,
      episodeCount,
      isComplete,
      lastFetched:
        toDateOrNull(counts.lastFetched)?.toISOString() ?? entry.lastFetched,
    };
  });
}

export type SubtitleLibrarySort = "latest" | "tracks" | "progress" | "az";

/**
 * A summary row is "cached" if it has any tracks or cached episodes. We can't
 * rely on track_count alone because metadata enrichment writes rows with
 * track_count = 0 even when episodes are cached.
 */
function hasCachedTracksFilter() {
  return sql`(${subtitleLibraryAnime.trackCount} > 0 or ${subtitleLibraryAnime.cachedEpisodeCount} > 0)`;
}

/** Most recently synced or subtitle-updated shows first. */
function orderByLatestLibraryUpdate() {
  return desc(
    sql`greatest(
      coalesce(${subtitleLibraryAnime.lastSubtitleAt}, to_timestamp(0)),
      ${subtitleLibraryAnime.updatedAt}
    )`,
  );
}

function resolveLibraryOrderBy(sort: SubtitleLibrarySort | undefined) {
  switch (sort) {
    case "tracks":
      return desc(subtitleLibraryAnime.trackCount);
    case "progress":
      return desc(
        sql`case
          when coalesce(${subtitleLibraryAnime.totalEpisodes}, 0) > 0
          then ${subtitleLibraryAnime.cachedEpisodeCount}::float / ${subtitleLibraryAnime.totalEpisodes}
          else 0
        end`,
      );
    case "az":
      return sql`lower(coalesce(${subtitleLibraryAnime.animeTitle}, '')) asc`;
    case "latest":
    default:
      return orderByLatestLibraryUpdate();
  }
}

export async function searchAllSubtitleLibraryFromDb(opts: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: SubtitleLibrarySort;
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
  const whereClause = allLibraryWhere(opts.q);

  if (!dbAvailable()) {
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }

  try {
    const db = getDb();

    const cachedFilter = hasCachedTracksFilter();
    const fullWhere = whereClause ? and(whereClause, cachedFilter) : cachedFilter;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(subtitleLibraryAnime)
      .where(fullWhere);

    const total = countRow?.total ?? 0;

    let cachedAnilistIds: number[] = [];
    if (opts.q?.trim()) {
      const idRows = await db
        .select({ anilistId: subtitleLibraryAnime.anilistId })
        .from(subtitleLibraryAnime)
        .where(whereClause!);
      cachedAnilistIds = idRows.map((row) => row.anilistId);
    }

    const rows = await db
      .select()
      .from(subtitleLibraryAnime)
      .where(fullWhere)
      .orderBy(resolveLibraryOrderBy(opts.sort))
      .limit(limit)
      .offset(offset);

    const entries = rows.map((row) =>
      rowToEntry({
        anilistId: row.anilistId,
        animeTitle: row.animeTitle,
        trackCount: row.trackCount,
        episodeCount: row.cachedEpisodeCount,
        lastFetched: row.lastSubtitleAt ?? row.updatedAt,
        poster: row.poster,
        status: row.status,
        totalEpisodes: row.totalEpisodes,
        isComplete: row.isComplete,
        score: row.score,
        year: row.year,
      }),
    );

    const live = await getLiveSubtitleCounts(entries.map((e) => e.anilistId));

    return {
      items: applyLiveCounts(entries, live),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
      cachedAnilistIds,
    };
  } catch (err) {
    console.error("[subtitle-library-db] searchAll failed:", err);
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }
}

export async function searchCompletedSubtitleLibrary(opts: {
  q?: string;
  page?: number;
  limit?: number;
  sort?: SubtitleLibrarySort;
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
      .orderBy(resolveLibraryOrderBy(opts.sort))
      .limit(limit)
      .offset(offset);

    const entries = rows.map((row) =>
      rowToEntry({
        anilistId: row.anilistId,
        animeTitle: row.animeTitle,
        trackCount: row.trackCount,
        episodeCount: row.cachedEpisodeCount,
        lastFetched: row.lastSubtitleAt ?? row.updatedAt,
        poster: row.poster,
        status: row.status,
        totalEpisodes: row.totalEpisodes,
        isComplete: row.isComplete,
        score: row.score,
        year: row.year,
      }),
    );

    const live = await getLiveSubtitleCounts(entries.map((e) => e.anilistId));

    return {
      items: applyLiveCounts(entries, live),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
      cachedAnilistIds,
    };
  } catch (err) {
    console.error("[subtitle-library-db] searchCompleted failed:", err);
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
      .where(
        and(
          eq(subtitleLibraryAnime.isComplete, false),
          sql`${subtitleLibraryAnime.trackCount} > 0`,
        ),
      )
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

export async function countIncompleteSubtitleAnimesFromDb(): Promise<number> {
  if (!dbAvailable()) return 0;

  try {
    const db = getDb();
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subtitleLibraryAnime)
      .where(
        and(
          eq(subtitleLibraryAnime.isComplete, false),
          sql`${subtitleLibraryAnime.trackCount} > 0`,
        ),
      );

    return row?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function refreshStaleCompletionStatuses(limit = 40): Promise<number> {
  if (!dbAvailable()) return 0;

  try {
    const db = getDb();
    const rows = await db
      .select({ anilistId: subtitleLibraryAnime.anilistId })
      .from(subtitleLibraryAnime)
      .where(
        or(
          eq(subtitleLibraryAnime.isComplete, false),
          isNull(subtitleLibraryAnime.totalEpisodes),
        ),
      )
      .orderBy(subtitleLibraryAnime.cachedEpisodeCount)
      .limit(limit);

    const ids = rows.map((row) => row.anilistId);
    if (ids.length === 0) return 0;

    const { fetchAnilistMetaBatch } = await import("@/lib/subtitle-library-enrich");
    await fetchAnilistMetaBatch(ids);

    for (const id of ids) {
      await syncSubtitleLibraryAnime(id);
    }

    return ids.length;
  } catch (err) {
    console.error("[subtitle-library-db] refresh completion failed:", err);
    return 0;
  }
}

export async function listCachedSubtitleAnilistIds(): Promise<Set<number>> {
  const ids = new Set<number>();
  if (!dbAvailable()) return ids;

  try {
    const db = getDb();
    const fromSummary = await db
      .select({ anilistId: subtitleLibraryAnime.anilistId })
      .from(subtitleLibraryAnime);
    for (const row of fromSummary) ids.add(row.anilistId);

    const fromTracks = await db
      .selectDistinct({ anilistId: episodeSubtitles.anilistId })
      .from(episodeSubtitles)
      .where(subtitleProviderFilter());
    for (const row of fromTracks) ids.add(row.anilistId);
  } catch {
    /* ignore */
  }

  return ids;
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
          subtitleProviderFilter(),
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
