import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  animeEpisodeCache,
  type StoredEpisodeItem,
} from "@/db/schema";
import type { EpisodeContentFlags } from "@/lib/anime/episode-filler";
import {
  fetchAllEpisodeImageSources,
  type EpisodeImageSources,
} from "@/lib/anime/episode-thumbnails";

const FINISHED_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const AIRING_TTL_MS = 2 * 60 * 60 * 1000;

export type EpisodeCacheContext = {
  airedEpisodeCount: number;
  isAiring: boolean;
  status?: string | null;
  malId?: number | null;
};

export type StoredEpisodeList = {
  episodes: StoredEpisodeItem[];
  totalEpisodes: number;
  sources: EpisodeImageSources | null;
  fillerFlags: Record<number, EpisodeContentFlags>;
  fetchedAt: Date | null;
  stale: boolean;
};

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function cacheTtlMs(ctx: EpisodeCacheContext): number {
  return ctx.isAiring ? AIRING_TTL_MS : FINISHED_TTL_MS;
}

export function isEpisodeCacheStale(
  row: { airedCount: number; fetchedAt: Date | null },
  ctx: EpisodeCacheContext,
): boolean {
  const fetchedAt = row.fetchedAt?.getTime() ?? 0;
  const age = Date.now() - fetchedAt;
  if (age > cacheTtlMs(ctx)) return true;
  if (ctx.airedEpisodeCount > row.airedCount) return true;
  return false;
}

function parseSources(raw: Record<string, unknown> | null | undefined): EpisodeImageSources | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as unknown as EpisodeImageSources;
}

function parseFillerFlags(
  raw: Record<string, { filler: boolean; recap: boolean }> | null | undefined,
): Record<number, EpisodeContentFlags> {
  if (!raw) return {};
  const out: Record<number, EpisodeContentFlags> = {};
  for (const [key, value] of Object.entries(raw)) {
    const num = parseInt(key, 10);
    if (num > 0 && value) out[num] = value;
  }
  return out;
}

export async function getStoredEpisodeList(
  anilistId: number,
  ctx: EpisodeCacheContext,
): Promise<StoredEpisodeList | null> {
  if (!dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(animeEpisodeCache)
      .where(eq(animeEpisodeCache.anilistId, anilistId))
      .limit(1);

    if (!row) return null;

    const stale = isEpisodeCacheStale(
      { airedCount: row.airedCount, fetchedAt: row.fetchedAt },
      ctx,
    );

    return {
      episodes: row.episodesJson ?? [],
      totalEpisodes: row.totalEpisodes,
      sources: parseSources(row.sourcesJson as Record<string, unknown> | null),
      fillerFlags: parseFillerFlags(row.fillerJson ?? null),
      fetchedAt: row.fetchedAt,
      stale,
    };
  } catch (err) {
    console.error("[episode-cache] read failed:", err);
    return null;
  }
}

export async function storeEpisodeList(
  anilistId: number,
  data: {
    episodes: StoredEpisodeItem[];
    airedCount: number;
    status?: string | null;
    malId?: number | null;
    sources?: EpisodeImageSources | null;
    fillerFlags?: Record<number, EpisodeContentFlags>;
  },
): Promise<void> {
  if (!dbAvailable()) return;

  try {
    const db = getDb();
    const now = new Date();
    const fillerJson = data.fillerFlags
      ? Object.fromEntries(
          Object.entries(data.fillerFlags).map(([k, v]) => [String(k), v]),
        )
      : null;

    await db
      .insert(animeEpisodeCache)
      .values({
        anilistId,
        malId: data.malId ?? null,
        status: data.status ?? null,
        airedCount: data.airedCount,
        totalEpisodes: data.episodes.length,
        episodesJson: data.episodes,
        sourcesJson: data.sources ?? null,
        fillerJson,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: animeEpisodeCache.anilistId,
        set: {
          malId: data.malId ?? null,
          status: data.status ?? null,
          airedCount: data.airedCount,
          totalEpisodes: data.episodes.length,
          episodesJson: data.episodes,
          sourcesJson: data.sources ?? null,
          fillerJson,
          fetchedAt: now,
          updatedAt: now,
        },
      });
  } catch (err) {
    console.error("[episode-cache] save failed:", err);
  }
}

/** Image/source metadata with Postgres backing — skips ani.zip/TMDB/TVDB when cache is fresh. */
export async function getEpisodeImageSourcesCached(
  anilistId: number,
  streamingEpisodes: Array<{ title: string; thumbnail?: string }>,
  ctx: EpisodeCacheContext,
): Promise<{ sources: EpisodeImageSources; fromCache: boolean }> {
  const stored = await getStoredEpisodeList(anilistId, ctx);
  if (stored?.sources && !stored.stale) {
    return { sources: stored.sources, fromCache: true };
  }

  const sources = await fetchAllEpisodeImageSources(anilistId, streamingEpisodes);
  return { sources, fromCache: false };
}
