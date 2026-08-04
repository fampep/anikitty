import { eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { animeAudioAvailability } from "@/db/schema";
import type { AudioAvailability } from "@/lib/providers/anikoto-availability";

/** Finished / non-airing — still recheck daily for late dub drops or count fixes. */
const FINISHED_TTL_MS = 24 * 60 * 60 * 1000;
/** Currently airing — new SUB/DUB episodes can land any day. */
const AIRING_TTL_MS = 60 * 60 * 1000;
/** Absolute sanity ceiling (One Piece-scale catalogs). */
const ABSURD_EPISODE_CAP = 500;

export type AudioCacheContext = {
  /** Latest aired episode count from AniList (sub proxy). */
  anilistEpisodeCount: number;
  isAiring: boolean;
};

/** Clamp provider counts to AniList aired/planned + hard ceiling. */
export function clampAudioCounts(
  sub: number,
  dub: number,
  anilistEpisodeCount?: number | null,
): { sub: number; dub: number } {
  let safeSub = Math.max(0, Math.floor(sub) || 0);
  let safeDub = Math.max(0, Math.floor(dub) || 0);
  const cap =
    anilistEpisodeCount != null && anilistEpisodeCount > 0
      ? Math.min(anilistEpisodeCount, ABSURD_EPISODE_CAP)
      : ABSURD_EPISODE_CAP;
  safeSub = Math.min(safeSub, cap);
  safeDub = Math.min(safeDub, safeSub, cap);
  return { sub: safeSub, dub: safeDub };
}

export type StoredAudioRow = {
  value: AudioAvailability;
  catalogId: number | null;
  fetchedAt: Date | null;
  stale: boolean;
  source?: string | null;
  status?: string | null;
};

function rowToAvailability(row: {
  subCount: number;
  dubCount: number;
}): AudioAvailability {
  const sub = row.subCount;
  const dub = row.dubCount;
  return {
    sub,
    dub,
    hasSub: sub > 0,
    hasDub: dub > 0,
  };
}

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** True when cached counts may be behind newly released episodes. */
export function isAudioCacheStale(
  row: { subCount: number; dubCount: number; fetchedAt: Date | null },
  ctx: AudioCacheContext,
): boolean {
  const fetchedAt = row.fetchedAt?.getTime() ?? 0;
  if (!fetchedAt) return true;

  const age = Date.now() - fetchedAt;
  const ttl = ctx.isAiring ? AIRING_TTL_MS : FINISHED_TTL_MS;

  if (age > ttl) return true;

  // AniList reports more aired episodes than our cached SUB count → refresh.
  if (ctx.anilistEpisodeCount > 0 && ctx.anilistEpisodeCount > row.subCount) {
    return true;
  }

  // Cached counts are inflated past AniList aired (franchise scrape / bad map).
  if (
    ctx.anilistEpisodeCount > 0 &&
    (row.subCount > ctx.anilistEpisodeCount + 2 ||
      row.dubCount > ctx.anilistEpisodeCount + 2)
  ) {
    return true;
  }

  if (row.subCount > ABSURD_EPISODE_CAP || row.dubCount > ABSURD_EPISODE_CAP) {
    return true;
  }

  // Airing: recheck mid-TTL so DUB can catch up after SUB-only drops.
  if (ctx.isAiring && age > AIRING_TTL_MS / 2) {
    return true;
  }

  // Finished but still missing DUB while AniList has a full SUB catalog —
  // recheck every 12h in case a dub batch landed.
  if (
    !ctx.isAiring &&
    row.dubCount <= 0 &&
    row.subCount > 0 &&
    age > FINISHED_TTL_MS / 2
  ) {
    return true;
  }

  return false;
}

export type StoredAudioBatchRow = {
  anilistId: number;
  subCount: number;
  dubCount: number;
  catalogId: number | null;
  fetchedAt: Date | null;
  source?: string | null;
  status?: string | null;
};

export async function getBatchStoredAudioAvailability(
  anilistIds: number[],
): Promise<Map<number, StoredAudioBatchRow>> {
  const unique = [...new Set(anilistIds.filter((id) => id > 0))];
  if (!dbAvailable() || unique.length === 0) return new Map();

  try {
    const db = getDb();
    const query = db
      .select({
        anilistId: animeAudioAvailability.anilistId,
        subCount: animeAudioAvailability.subCount,
        dubCount: animeAudioAvailability.dubCount,
        catalogId: animeAudioAvailability.catalogId,
        fetchedAt: animeAudioAvailability.fetchedAt,
        source: animeAudioAvailability.source,
        status: animeAudioAvailability.status,
      })
      .from(animeAudioAvailability)
      .where(inArray(animeAudioAvailability.anilistId, unique));

    // Bound DB waits so a hung Postgres pool cannot stall search/home lists.
    const rows = await Promise.race([
      query,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("audio batch timeout")), 1_500),
      ),
    ]);

    return new Map(rows.map((row) => [row.anilistId, row]));
  } catch {
    return new Map();
  }
}

export async function getStoredAudioAvailability(
  anilistId: number,
  ctx: AudioCacheContext,
): Promise<StoredAudioRow | null> {
  if (!dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(animeAudioAvailability)
      .where(eq(animeAudioAvailability.anilistId, anilistId))
      .limit(1);

    if (!row) return null;

    const stale = isAudioCacheStale(row, ctx);

    return {
      value: rowToAvailability(row),
      catalogId: row.catalogId,
      fetchedAt: row.fetchedAt,
      stale,
      source: row.source,
      status: row.status,
    };
  } catch {
    return null;
  }
}

/** Row count + freshness for the admin cache panel. */
export async function getAudioCacheStats(): Promise<{
  rows: number;
  oldestFetchedAt: string | null;
  newestFetchedAt: string | null;
} | null> {
  if (!dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        rows: sql<number>`count(*)::int`,
        oldest: sql<Date | null>`min(${animeAudioAvailability.fetchedAt})`,
        newest: sql<Date | null>`max(${animeAudioAvailability.fetchedAt})`,
      })
      .from(animeAudioAvailability);

    return {
      rows: row?.rows ?? 0,
      oldestFetchedAt: row?.oldest ? new Date(row.oldest).toISOString() : null,
      newestFetchedAt: row?.newest ? new Date(row.newest).toISOString() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Wipe cached sub/dub counts so every title refetches on next request.
 * `mode: "stale"` keeps the rows but backdates them — the old numbers are
 * served once more per title while a background refresh rewrites them.
 */
export async function resetAudioCache(
  mode: "purge" | "stale" = "purge",
): Promise<{ rows: number } | null> {
  if (!dbAvailable()) return null;

  const db = getDb();
  if (mode === "stale") {
    const rows = await db
      .update(animeAudioAvailability)
      .set({ fetchedAt: new Date(0) })
      .returning({ anilistId: animeAudioAvailability.anilistId });
    return { rows: rows.length };
  }

  const rows = await db
    .delete(animeAudioAvailability)
    .returning({ anilistId: animeAudioAvailability.anilistId });
  return { rows: rows.length };
}

export type StoreAudioMeta = {
  malId?: number | null;
  catalogId?: number | null;
  source?: string | null;
  status?: string | null;
};

export async function storeAudioAvailability(
  anilistId: number,
  data: AudioAvailability,
  meta?: StoreAudioMeta & { anilistEpisodeCount?: number | null },
): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const now = new Date();
    const clamped = clampAudioCounts(
      data.sub,
      data.dub,
      meta?.anilistEpisodeCount,
    );
    data = {
      ...data,
      sub: clamped.sub,
      dub: clamped.dub,
      hasSub: clamped.sub > 0,
      hasDub: clamped.dub > 0,
    };

    const [existing] = await db
      .select({
        subCount: animeAudioAvailability.subCount,
        dubCount: animeAudioAvailability.dubCount,
        malId: animeAudioAvailability.malId,
        catalogId: animeAudioAvailability.catalogId,
        source: animeAudioAvailability.source,
        status: animeAudioAvailability.status,
      })
      .from(animeAudioAvailability)
      .where(eq(animeAudioAvailability.anilistId, anilistId))
      .limit(1);

    const prev = existing
      ? { sub: existing.subCount, dub: existing.dubCount }
      : null;

    const nextMalId =
      meta && "malId" in meta ? (meta.malId ?? null) : (existing?.malId ?? null);
    const nextCatalogId =
      meta && "catalogId" in meta
        ? (meta.catalogId ?? null)
        : (existing?.catalogId ?? null);
    const nextSource =
      meta && "source" in meta ? (meta.source ?? null) : (existing?.source ?? null);
    const nextStatus =
      meta && "status" in meta ? (meta.status ?? null) : (existing?.status ?? null);

    await db
      .insert(animeAudioAvailability)
      .values({
        anilistId,
        malId: nextMalId,
        catalogId: nextCatalogId,
        subCount: data.sub,
        dubCount: data.dub,
        source: nextSource,
        status: nextStatus,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: animeAudioAvailability.anilistId,
        set: {
          malId: nextMalId,
          catalogId: nextCatalogId,
          subCount: data.sub,
          dubCount: data.dub,
          source: nextSource,
          status: nextStatus,
          fetchedAt: now,
          updatedAt: now,
        },
      });

    if (prev && (data.sub > prev.sub || data.dub > prev.dub)) {
      void import("@/lib/watch/episode-alerts")
        .then((m) =>
          m.processEpisodeCountChange(anilistId, prev, {
            sub: data.sub,
            dub: data.dub,
          }),
        )
        .catch((err) => console.error("[episode-alerts] notify failed:", err));
    }
  } catch (err) {
    console.error("[anime-audio-store] save failed:", err);
  }
}
