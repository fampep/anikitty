import { eq, inArray, or, ilike, desc } from "drizzle-orm";
import { getDb } from "@/db";
import { animeMetadata } from "@/db/schema";

/** Currently airing / hiatus — refresh often for new episodes & scores. */
const AIRING_TTL_MS = 6 * 60 * 60 * 1000;
/** Upcoming titles — still change (dates, trailers, covers). */
const UPCOMING_TTL_MS = 24 * 60 * 60 * 1000;
/** Finished / cancelled — mostly static; weekly refresh is enough. */
const FINISHED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Related/characters change less often than hero metadata. */
const RELATED_AIRING_TTL_MS = 12 * 60 * 60 * 1000;
const RELATED_FINISHED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type AnimeMetadataStatus =
  | "RELEASING"
  | "FINISHED"
  | "NOT_YET_RELEASED"
  | "CANCELLED"
  | "HIATUS"
  | string
  | null
  | undefined;

export type AnimeMetadataFlat = {
  anilistId: number;
  malId: number | null;
  title: string | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  genres: string[];
  studios: string[];
};

export type StoredDetailRow<T = unknown> = {
  flat: AnimeMetadataFlat;
  payload: T;
  fetchedAt: Date | null;
  stale: boolean;
};

export type StoredRelatedRow<T = unknown> = {
  payload: T;
  fetchedAt: Date | null;
  stale: boolean;
  status: string | null;
};

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function metadataTtlMs(status: AnimeMetadataStatus): number {
  switch (status) {
    case "RELEASING":
    case "HIATUS":
      return AIRING_TTL_MS;
    case "NOT_YET_RELEASED":
      return UPCOMING_TTL_MS;
    case "FINISHED":
    case "CANCELLED":
      return FINISHED_TTL_MS;
    default:
      return UPCOMING_TTL_MS;
  }
}

export function relatedMetadataTtlMs(status: AnimeMetadataStatus): number {
  switch (status) {
    case "RELEASING":
    case "HIATUS":
    case "NOT_YET_RELEASED":
      return RELATED_AIRING_TTL_MS;
    default:
      return RELATED_FINISHED_TTL_MS;
  }
}

export function isMetadataStale(
  fetchedAt: Date | null | undefined,
  status: AnimeMetadataStatus,
  ttlMs = metadataTtlMs(status),
): boolean {
  const at = fetchedAt?.getTime() ?? 0;
  if (!at) return true;
  return Date.now() - at > ttlMs;
}

function rowToFlat(row: {
  anilistId: number;
  malId: number | null;
  title: string | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  description: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  genres: string[] | null;
  studios: string[] | null;
}): AnimeMetadataFlat {
  return {
    anilistId: row.anilistId,
    malId: row.malId,
    title: row.title,
    titleEnglish: row.titleEnglish,
    titleRomaji: row.titleRomaji,
    titleNative: row.titleNative,
    description: row.description,
    coverImage: row.coverImage,
    bannerImage: row.bannerImage,
    episodes: row.episodes,
    format: row.format,
    status: row.status,
    season: row.season,
    seasonYear: row.seasonYear,
    averageScore: row.averageScore,
    genres: Array.isArray(row.genres) ? row.genres : [],
    studios: Array.isArray(row.studios) ? row.studios : [],
  };
}

export async function getStoredAnimeDetail<T = unknown>(
  anilistId: number,
): Promise<StoredDetailRow<T> | null> {
  if (!dbAvailable() || anilistId <= 0) return null;

  try {
    const db = getDb();
    const [row] = await Promise.race([
      db.select().from(animeMetadata).where(eq(animeMetadata.anilistId, anilistId)).limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("anime metadata timeout")), 1_500),
      ),
    ]);

    if (!row?.detailPayload) return null;

    return {
      flat: rowToFlat(row),
      payload: row.detailPayload as T,
      fetchedAt: row.detailFetchedAt ?? row.fetchedAt,
      stale: isMetadataStale(row.detailFetchedAt ?? row.fetchedAt, row.status),
    };
  } catch {
    return null;
  }
}

export async function getStoredAnimeRelated<T = unknown>(
  anilistId: number,
): Promise<StoredRelatedRow<T> | null> {
  if (!dbAvailable() || anilistId <= 0) return null;

  try {
    const db = getDb();
    const [row] = await Promise.race([
      db
        .select({
          relatedPayload: animeMetadata.relatedPayload,
          relatedFetchedAt: animeMetadata.relatedFetchedAt,
          status: animeMetadata.status,
        })
        .from(animeMetadata)
        .where(eq(animeMetadata.anilistId, anilistId))
        .limit(1),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("anime related meta timeout")), 1_500),
      ),
    ]);

    if (!row?.relatedPayload) return null;

    return {
      payload: row.relatedPayload as T,
      fetchedAt: row.relatedFetchedAt,
      status: row.status,
      stale: isMetadataStale(
        row.relatedFetchedAt,
        row.status,
        relatedMetadataTtlMs(row.status),
      ),
    };
  } catch {
    return null;
  }
}

export async function getBatchStoredAnimeMeta(
  anilistIds: number[],
): Promise<Map<number, AnimeMetadataFlat>> {
  const unique = [...new Set(anilistIds.filter((id) => id > 0))];
  if (!dbAvailable() || unique.length === 0) return new Map();

  try {
    const db = getDb();
    const rows = await Promise.race([
      db
        .select({
          anilistId: animeMetadata.anilistId,
          malId: animeMetadata.malId,
          title: animeMetadata.title,
          titleEnglish: animeMetadata.titleEnglish,
          titleRomaji: animeMetadata.titleRomaji,
          titleNative: animeMetadata.titleNative,
          description: animeMetadata.description,
          coverImage: animeMetadata.coverImage,
          bannerImage: animeMetadata.bannerImage,
          episodes: animeMetadata.episodes,
          format: animeMetadata.format,
          status: animeMetadata.status,
          season: animeMetadata.season,
          seasonYear: animeMetadata.seasonYear,
          averageScore: animeMetadata.averageScore,
          genres: animeMetadata.genres,
          studios: animeMetadata.studios,
        })
        .from(animeMetadata)
        .where(inArray(animeMetadata.anilistId, unique)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("anime meta batch timeout")), 1_500),
      ),
    ]);

    return new Map(rows.map((row) => [row.anilistId, rowToFlat(row)]));
  } catch {
    return new Map();
  }
}

/** Local title search fallback when AniList is down (ILIKE on cached titles). */
export async function searchLocalAnimeMetadata(
  query: string,
  limit = 20,
): Promise<AnimeMetadataFlat[]> {
  const q = query.trim();
  if (!dbAvailable() || q.length < 2) return [];

  try {
    const db = getDb();
    const pattern = `%${q.replace(/[%_]/g, "")}%`;
    const rows = await Promise.race([
      db
        .select({
          anilistId: animeMetadata.anilistId,
          malId: animeMetadata.malId,
          title: animeMetadata.title,
          titleEnglish: animeMetadata.titleEnglish,
          titleRomaji: animeMetadata.titleRomaji,
          titleNative: animeMetadata.titleNative,
          description: animeMetadata.description,
          coverImage: animeMetadata.coverImage,
          bannerImage: animeMetadata.bannerImage,
          episodes: animeMetadata.episodes,
          format: animeMetadata.format,
          status: animeMetadata.status,
          season: animeMetadata.season,
          seasonYear: animeMetadata.seasonYear,
          averageScore: animeMetadata.averageScore,
          genres: animeMetadata.genres,
          studios: animeMetadata.studios,
        })
        .from(animeMetadata)
        .where(
          or(
            ilike(animeMetadata.title, pattern),
            ilike(animeMetadata.titleEnglish, pattern),
            ilike(animeMetadata.titleRomaji, pattern),
            ilike(animeMetadata.titleNative, pattern),
          ),
        )
        .orderBy(desc(animeMetadata.averageScore), desc(animeMetadata.fetchedAt))
        .limit(Math.min(Math.max(limit, 1), 40)),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("local anime search timeout")), 1_500),
      ),
    ]);

    return rows.map(rowToFlat);
  } catch {
    return [];
  }
}

export type UpsertAnimeMetadataInput = {
  anilistId: number;
  malId?: number | null;
  title?: string | null;
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  description?: string | null;
  coverImage?: string | null;
  bannerImage?: string | null;
  episodes?: number | null;
  format?: string | null;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  averageScore?: number | null;
  genres?: string[] | null;
  studios?: string[] | null;
  detailPayload?: unknown | null;
  relatedPayload?: unknown | null;
};

/** Persist flat fields and/or detail/related JSON payloads. */
export async function upsertAnimeMetadata(input: UpsertAnimeMetadataInput): Promise<void> {
  if (!dbAvailable() || input.anilistId <= 0) return;

  try {
    const db = getDb();
    const now = new Date();
    const hasDetail = "detailPayload" in input && input.detailPayload != null;
    const hasRelated = "relatedPayload" in input && input.relatedPayload != null;

    await db
      .insert(animeMetadata)
      .values({
        anilistId: input.anilistId,
        malId: input.malId ?? null,
        title: input.title ?? null,
        titleEnglish: input.titleEnglish ?? null,
        titleRomaji: input.titleRomaji ?? null,
        titleNative: input.titleNative ?? null,
        description: input.description ?? null,
        coverImage: input.coverImage ?? null,
        bannerImage: input.bannerImage ?? null,
        episodes: input.episodes ?? null,
        format: input.format ?? null,
        status: input.status ?? null,
        season: input.season ?? null,
        seasonYear: input.seasonYear ?? null,
        averageScore: input.averageScore ?? null,
        genres: input.genres ?? [],
        studios: input.studios ?? [],
        detailPayload: hasDetail ? input.detailPayload : null,
        relatedPayload: hasRelated ? input.relatedPayload : null,
        detailFetchedAt: hasDetail ? now : null,
        relatedFetchedAt: hasRelated ? now : null,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: animeMetadata.anilistId,
        set: {
          ...(input.malId !== undefined ? { malId: input.malId ?? null } : {}),
          ...(input.title !== undefined ? { title: input.title ?? null } : {}),
          ...(input.titleEnglish !== undefined
            ? { titleEnglish: input.titleEnglish ?? null }
            : {}),
          ...(input.titleRomaji !== undefined
            ? { titleRomaji: input.titleRomaji ?? null }
            : {}),
          ...(input.titleNative !== undefined
            ? { titleNative: input.titleNative ?? null }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          ...(input.coverImage !== undefined
            ? { coverImage: input.coverImage ?? null }
            : {}),
          ...(input.bannerImage !== undefined
            ? { bannerImage: input.bannerImage ?? null }
            : {}),
          ...(input.episodes !== undefined ? { episodes: input.episodes ?? null } : {}),
          ...(input.format !== undefined ? { format: input.format ?? null } : {}),
          ...(input.status !== undefined ? { status: input.status ?? null } : {}),
          ...(input.season !== undefined ? { season: input.season ?? null } : {}),
          ...(input.seasonYear !== undefined
            ? { seasonYear: input.seasonYear ?? null }
            : {}),
          ...(input.averageScore !== undefined
            ? { averageScore: input.averageScore ?? null }
            : {}),
          ...(input.genres !== undefined ? { genres: input.genres ?? [] } : {}),
          ...(input.studios !== undefined ? { studios: input.studios ?? [] } : {}),
          ...(hasDetail
            ? { detailPayload: input.detailPayload, detailFetchedAt: now }
            : {}),
          ...(hasRelated
            ? { relatedPayload: input.relatedPayload, relatedFetchedAt: now }
            : {}),
          fetchedAt: now,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[anime-metadata-store] save failed:", err);
  }
}

/** Warm cache from AniList search/list rows without a full detail fetch. */
export async function upsertAnimeMetadataHints(
  rows: Array<{
    anilistId: number;
    malId?: number | null;
    title?: string | null;
    titleEnglish?: string | null;
    titleRomaji?: string | null;
    titleNative?: string | null;
    coverImage?: string | null;
    episodes?: number | null;
    format?: string | null;
    status?: string | null;
    seasonYear?: number | null;
    averageScore?: number | null;
    genres?: string[] | null;
  }>,
): Promise<void> {
  if (!dbAvailable() || rows.length === 0) return;

  try {
    await Promise.all(
      rows.slice(0, 40).map((row) =>
        upsertAnimeMetadata({
          anilistId: row.anilistId,
          malId: row.malId,
          title: row.title,
          titleEnglish: row.titleEnglish,
          titleRomaji: row.titleRomaji,
          titleNative: row.titleNative,
          coverImage: row.coverImage,
          episodes: row.episodes,
          format: row.format,
          status: row.status,
          seasonYear: row.seasonYear,
          averageScore: row.averageScore,
          genres: row.genres,
        }),
      ),
    );
  } catch {
    // best-effort warm
  }
}
