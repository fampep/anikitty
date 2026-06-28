import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { animeAudioAvailability } from "@/db/schema";
import type { AudioAvailability } from "@/lib/anikoto-availability";

/** Finished shows — counts rarely change. */
const FINISHED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Currently airing — new sub/dub episodes can drop any week. */
const AIRING_TTL_MS = 2 * 60 * 60 * 1000;

export type AudioCacheContext = {
  /** Latest aired episode count from AniList (sub proxy). */
  anilistEpisodeCount: number;
  isAiring: boolean;
};

export type StoredAudioRow = {
  value: AudioAvailability;
  catalogId: number | null;
  fetchedAt: Date | null;
  stale: boolean;
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
  const age = Date.now() - fetchedAt;
  const ttl = ctx.isAiring ? AIRING_TTL_MS : FINISHED_TTL_MS;

  if (age > ttl) return true;

  // AniList reports more aired episodes than our cached sub count.
  if (ctx.anilistEpisodeCount > 0 && ctx.anilistEpisodeCount > row.subCount) {
    return true;
  }

  // Airing shows with dub: refresh periodically so dub catches up after sub-only drops.
  if (ctx.isAiring && row.dubCount > 0 && age > AIRING_TTL_MS / 2) {
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
};

export async function getBatchStoredAudioAvailability(
  anilistIds: number[],
): Promise<Map<number, StoredAudioBatchRow>> {
  const unique = [...new Set(anilistIds.filter((id) => id > 0))];
  if (!dbAvailable() || unique.length === 0) return new Map();

  try {
    const db = getDb();
    const rows = await db
      .select({
        anilistId: animeAudioAvailability.anilistId,
        subCount: animeAudioAvailability.subCount,
        dubCount: animeAudioAvailability.dubCount,
        catalogId: animeAudioAvailability.catalogId,
        fetchedAt: animeAudioAvailability.fetchedAt,
      })
      .from(animeAudioAvailability)
      .where(inArray(animeAudioAvailability.anilistId, unique));

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
    };
  } catch {
    return null;
  }
}

export async function storeAudioAvailability(
  anilistId: number,
  data: AudioAvailability,
  meta?: { malId?: number | null; catalogId?: number | null },
): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const now = new Date();

    const [existing] = await db
      .select({
        subCount: animeAudioAvailability.subCount,
        dubCount: animeAudioAvailability.dubCount,
      })
      .from(animeAudioAvailability)
      .where(eq(animeAudioAvailability.anilistId, anilistId))
      .limit(1);

    const prev = existing
      ? { sub: existing.subCount, dub: existing.dubCount }
      : null;

    await db
      .insert(animeAudioAvailability)
      .values({
        anilistId,
        malId: meta?.malId ?? null,
        catalogId: meta?.catalogId ?? null,
        subCount: data.sub,
        dubCount: data.dub,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: animeAudioAvailability.anilistId,
        set: {
          malId: meta?.malId ?? null,
          catalogId: meta?.catalogId ?? null,
          subCount: data.sub,
          dubCount: data.dub,
          fetchedAt: now,
          updatedAt: now,
        },
      });

    if (prev && (data.sub > prev.sub || data.dub > prev.dub)) {
      void import("@/lib/episode-alerts")
        .then((m) => m.processEpisodeCountChange(anilistId, prev, { sub: data.sub, dub: data.dub }))
        .catch((err) => console.error("[episode-alerts] notify failed:", err));
    }
  } catch (err) {
    console.error("[anime-audio-store] save failed:", err);
  }
}
