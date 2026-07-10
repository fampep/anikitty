import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { episodeSubtitles } from "@/db/schema";
import {
  getTrackFile,
  isOurSubtitleUrl,
  isSubtitleCacheProvider,
  isSubtitleTrack,
  SUBTITLE_CACHE_PROVIDERS,
  SUBTITLE_LIBRARY_PROVIDERS,
  SUBTITLE_SOURCE_PROVIDER,
  normalizeSubtitleLabel,
  normalizeSubtitleLanguage,
  dedupeSubtitleTracks,
  subtitleProviderRank,
  subtitleProxyUrl,
  subtitleServeUrl,
  type StreamTrack,
} from "@/lib/subtitles/subtitle-track-utils";
import { sanitizeHeaderValue } from "@/lib/security/security";
import {
  SUBTITLE_API_INTERVAL_MS,
  SUBTITLE_SYNC_BATCH_SIZE,
  sleep,
} from "@/lib/subtitles/subtitle-sync-config";
import {
  fetchKittySubsTracks,
  fetchKittySubsBulk,
  KITTY_SUB_SOURCE_PROVIDER,
  tracksFromSubsEpisode,
} from "@/lib/kitty/kitty-subs-api";

export type EpisodeSubtitleCacheContext = Pick<
  SubtitleCacheContext,
  "anilistId" | "episode" | "audio"
> & {
  animeTitle?: string | null;
  /** Active stream provider — tried first when fetching Kitty /subs. */
  streamProvider?: string | null;
};

export type EnsureSubtitleCacheOptions = {
  /** Re-fetch from Kitty API even when cached tracks exist (adds new languages). */
  force?: boolean;
  /** Await bulk Kitty /subs when single-episode fetch misses (off for stream API). */
  allowBulk?: boolean;
};

/** Subtitle VTT content is stable per episode — refresh weekly. */
const SUBTITLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const fullShowPrefetchInProgress = new Set<number>();

const ANILIST_EPISODE_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes
      nextAiringEpisode { episode }
    }
  }
`;

export type SubtitleCacheContext = {
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  provider: string;
  animeTitle?: string | null;
  headers?: Record<string, string>;
};

export type CachedSubtitleTrack = {
  file: string;
  kind: string;
  label: string;
  default?: boolean;
};

function dbAvailable(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function isStale(fetchedAt: Date | null): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt.getTime() > SUBTITLE_TTL_MS;
}

function buildFetchHeaders(headers?: Record<string, string>): HeadersInit {
  const out: Record<string, string> = {
    Accept: "text/vtt,text/plain,*/*",
    "User-Agent":
      sanitizeHeaderValue(headers?.["User-Agent"]) ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  };

  const referer =
    sanitizeHeaderValue(headers?.Referer) || sanitizeHeaderValue(headers?.referer);
  if (referer) out.Referer = referer;

  const origin =
    sanitizeHeaderValue(headers?.Origin) || sanitizeHeaderValue(headers?.origin);
  if (origin) out.Origin = origin;

  return out;
}

async function fetchSubtitleContent(
  sourceUrl: string,
  headers?: Record<string, string>,
): Promise<string | null> {
  try {
    const res = await fetch(sourceUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: buildFetchHeaders(headers),
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text.trim()) return null;

    return text;
  } catch {
    return null;
  }
}

function rowToTrack(row: {
  id: string;
  label: string;
  kind: string;
  isDefault: boolean;
}): CachedSubtitleTrack {
  return {
    file: subtitleServeUrl(row.id),
    kind: row.kind,
    label: row.label,
    default: row.isDefault,
  };
}

export async function getStoredSubtitleById(id: string) {
  if (!dbAvailable()) return null;

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(episodeSubtitles)
      .where(eq(episodeSubtitles.id, id))
      .limit(1);

    return row ?? null;
  } catch {
    return null;
  }
}

export async function getStoredSubtitleTracks(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<CachedSubtitleTrack[]> {
  if (!dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, ctx.anilistId),
          eq(episodeSubtitles.episode, ctx.episode),
          eq(episodeSubtitles.audio, ctx.audio),
          subtitleProviderFilter(),
        ),
      );

    return dedupeSubtitleRows(rows.filter((row) => !isStale(row.fetchedAt))).map(rowToTrack);
  } catch {
    return [];
  }
}

async function loadStoredPlaybackSubtitleTracks(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<CachedSubtitleTrack[]> {
  let tracks = await getStoredSubtitleTracks(ctx);
  if (tracks.length === 0 && ctx.audio === "dub") {
    tracks = await getStoredSubtitleTracks({ ...ctx, audio: "sub" });
  }
  return tracks;
}

async function hasFreshCachedSubtitles(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<boolean> {
  const tracks = await loadStoredPlaybackSubtitleTracks(ctx);
  return tracks.length > 0;
}

function subtitleProviderFilter() {
  return inArray(episodeSubtitles.provider, [...SUBTITLE_LIBRARY_PROVIDERS]);
}

type SubtitleRowForDedupe = {
  episode: number;
  audio: string;
  label: string;
  provider: string;
  isDefault: boolean;
  fetchedAt: Date | null;
};

function subtitleRowPrefers<T extends SubtitleRowForDedupe>(candidate: T, current: T): boolean {
  const rankA = subtitleProviderRank(candidate.provider);
  const rankB = subtitleProviderRank(current.provider);
  if (rankA !== rankB) return rankA < rankB;

  const timeA = candidate.fetchedAt?.getTime() ?? 0;
  const timeB = current.fetchedAt?.getTime() ?? 0;
  if (timeA !== timeB) return timeA > timeB;

  if (candidate.isDefault !== current.isDefault) return candidate.isDefault;
  return false;
}

function dedupeSubtitleRows<T extends SubtitleRowForDedupe>(rows: T[]): T[] {
  const best = new Map<string, T>();

  for (const row of rows) {
    const key = `${row.episode}|${row.audio}|${normalizeSubtitleLanguage(row.label)}`;
    const prev = best.get(key);
    if (!prev || subtitleRowPrefers(row, prev)) {
      best.set(key, row);
    }
  }

  return [...best.values()];
}

function playbackStoreBase(
  ctx: Pick<EpisodeSubtitleCacheContext, "anilistId" | "episode" | "animeTitle">,
) {
  return {
    anilistId: ctx.anilistId,
    episode: ctx.episode,
    audio: "sub" as const,
    animeTitle: ctx.animeTitle,
  };
}

async function cacheKittySubsTracksForPlayback(
  tracks: StreamTrack[],
  ctx: EpisodeSubtitleCacheContext,
  animeTitle?: string | null,
): Promise<StreamTrack[]> {
  if (tracks.length === 0) return [];
  return cacheStreamSubtitleTracks(dedupeSubtitleTracks(tracks), {
    ...playbackStoreBase(ctx),
    provider: KITTY_SUB_SOURCE_PROVIDER,
    animeTitle: animeTitle ?? ctx.animeTitle ?? null,
    headers: {},
  });
}

/** Cache remaining bulk episodes in the background (same as library sync). */
function cacheBulkEpisodesInBackground(
  bulk: NonNullable<Awaited<ReturnType<typeof fetchKittySubsBulk>>>,
  ctx: EpisodeSubtitleCacheContext,
  skipEpisode?: number,
): void {
  void (async () => {
    for (const row of bulk.episodes) {
      if (row.episode === skipEpisode) continue;
      const tracks = dedupeSubtitleTracks(tracksFromSubsEpisode(row));
      if (tracks.length === 0) continue;
      await cacheStreamSubtitleTracks(tracks, {
        anilistId: ctx.anilistId,
        episode: row.episode,
        audio: "sub",
        provider: KITTY_SUB_SOURCE_PROVIDER,
        animeTitle: bulk.animeTitle ?? ctx.animeTitle ?? null,
        headers: {},
      });
    }
  })().catch(() => {});
}

/** Fetch via Kitty /subs across all providers (single episode, then bulk like library sync). */
async function fetchKittySubsForPlayback(
  ctx: EpisodeSubtitleCacheContext,
  opts?: { allowBulk?: boolean },
): Promise<StreamTrack[]> {
  const single = await fetchKittySubsTracks({
    anilistId: ctx.anilistId,
    episode: ctx.episode,
    audio: ctx.audio,
    title: ctx.animeTitle,
    preferProvider: ctx.streamProvider,
  });

  if (single?.tracks.length) {
    const stored = await cacheKittySubsTracksForPlayback(
      single.tracks,
      ctx,
      single.animeTitle,
    );
    if (stored.some(isSubtitleTrack)) return stored;
  }

  if (opts?.allowBulk !== true) {
    void fetchKittySubsBulk({
      anilistId: ctx.anilistId,
      audio: "sub",
      title: ctx.animeTitle,
      preferProvider: ctx.streamProvider,
    })
      .then((bulk) => {
        if (!bulk?.episodes.length) return;
        cacheBulkEpisodesInBackground(bulk, ctx);
      })
      .catch(() => {});
    return loadStoredPlaybackSubtitleTracks(ctx);
  }

  const bulk = await fetchKittySubsBulk({
    anilistId: ctx.anilistId,
    audio: "sub",
    title: ctx.animeTitle,
    preferProvider: ctx.streamProvider,
  });

  if (!bulk?.episodes.length) return [];

  const episodeRow = bulk.episodes.find((row) => row.episode === ctx.episode);
  if (episodeRow) {
    const tracks = dedupeSubtitleTracks(tracksFromSubsEpisode(episodeRow));
    if (tracks.length) {
      const stored = await cacheKittySubsTracksForPlayback(
        tracks,
        ctx,
        bulk.animeTitle ?? ctx.animeTitle,
      );
      if (stored.some(isSubtitleTrack)) {
        cacheBulkEpisodesInBackground(bulk, ctx, ctx.episode);
        return stored;
      }
    }
  }

  cacheBulkEpisodesInBackground(bulk, ctx);
  return loadStoredPlaybackSubtitleTracks(ctx);
}

/** Fetch subtitle tracks on demand via Kitty /subs (multi-provider, like library sync). */
export async function ensurePlaybackSubtitleCache(
  ctx: EpisodeSubtitleCacheContext,
  opts?: EnsureSubtitleCacheOptions,
): Promise<StreamTrack[]> {
  const cachedPlayback = await loadStoredPlaybackSubtitleTracks(ctx);
  if (!opts?.force && cachedPlayback.length > 0) {
    return cachedPlayback;
  }

  const fetched = await fetchKittySubsForPlayback(ctx, {
    allowBulk: opts?.allowBulk,
  });
  if (fetched.some(isSubtitleTrack)) return fetched;

  return cachedPlayback;
}

/** @deprecated Use ensurePlaybackSubtitleCache */
export const ensureMiruroSubtitleCache = ensurePlaybackSubtitleCache;

/** @deprecated Use ensurePlaybackSubtitleCache */
export const ensureAnitakuSubtitleCache = ensurePlaybackSubtitleCache;

/** Cache every episode from a bulk Kitty `/subs` response. Returns episodes cached. */
export async function cacheKittySubsBulkForAnime(opts: {
  anilistId: number;
  animeTitle?: string | null;
  preferProvider?: string | null;
}): Promise<number> {
  if (opts.anilistId <= 0) return 0;

  const bulk = await fetchKittySubsBulk({
    anilistId: opts.anilistId,
    audio: "sub",
    title: opts.animeTitle,
    preferProvider: opts.preferProvider,
  });
  if (!bulk?.episodes.length) return 0;

  let cached = 0;
  for (const row of bulk.episodes) {
    const tracks = dedupeSubtitleTracks(tracksFromSubsEpisode(row));
    if (tracks.length === 0) continue;

    const stored = await cacheStreamSubtitleTracks(tracks, {
      anilistId: opts.anilistId,
      episode: row.episode,
      audio: "sub",
      provider: KITTY_SUB_SOURCE_PROVIDER,
      animeTitle: bulk.animeTitle ?? opts.animeTitle ?? null,
      headers: {},
    });
    if (stored.some(isSubtitleTrack)) cached++;
  }

  return cached;
}

async function upsertSubtitle(
  ctx: SubtitleCacheContext,
  track: StreamTrack,
  content: string,
): Promise<CachedSubtitleTrack | null> {
  if (!dbAvailable()) return null;

  const sourceUrl = getTrackFile(track);
  if (!sourceUrl) return null;

  const label = (track.label ?? "Unknown").trim().slice(0, 100) || "Unknown";
  const kind = (track.kind ?? "subtitles").slice(0, 30);
  const isDefault = Boolean(track.default);
  const langKey = normalizeSubtitleLanguage(label);

  try {
    const db = getDb();
    const now = new Date();

    const peers = await db
      .select({
        id: episodeSubtitles.id,
        label: episodeSubtitles.label,
        provider: episodeSubtitles.provider,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, ctx.anilistId),
          eq(episodeSubtitles.episode, ctx.episode),
          eq(episodeSubtitles.audio, ctx.audio),
          inArray(episodeSubtitles.provider, [...SUBTITLE_CACHE_PROVIDERS]),
        ),
      );

    const staleIds = peers
      .filter(
        (row) =>
          row.provider !== ctx.provider &&
          normalizeSubtitleLanguage(row.label) === langKey,
      )
      .map((row) => row.id);

    if (staleIds.length > 0) {
      await db.delete(episodeSubtitles).where(inArray(episodeSubtitles.id, staleIds));
    }

    await db
      .delete(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, ctx.anilistId),
          eq(episodeSubtitles.episode, ctx.episode),
          eq(episodeSubtitles.audio, ctx.audio),
          eq(episodeSubtitles.label, label),
          ne(episodeSubtitles.provider, ctx.provider),
          inArray(episodeSubtitles.provider, [...SUBTITLE_CACHE_PROVIDERS]),
        ),
      );

    const [row] = await db
      .insert(episodeSubtitles)
      .values({
        anilistId: ctx.anilistId,
        animeTitle: ctx.animeTitle ?? null,
        episode: ctx.episode,
        audio: ctx.audio,
        provider: ctx.provider,
        label,
        kind,
        isDefault,
        sourceUrl,
        content,
        fetchedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          episodeSubtitles.anilistId,
          episodeSubtitles.episode,
          episodeSubtitles.audio,
          episodeSubtitles.provider,
          episodeSubtitles.label,
        ],
        set: {
          animeTitle: ctx.animeTitle ?? null,
          kind,
          isDefault,
          sourceUrl,
          content,
          fetchedAt: now,
          updatedAt: now,
        },
      })
      .returning({
        id: episodeSubtitles.id,
        label: episodeSubtitles.label,
        kind: episodeSubtitles.kind,
        isDefault: episodeSubtitles.isDefault,
      });

    return row ? rowToTrack(row) : null;
  } catch (err) {
    console.error("[subtitle-cache-store] save failed:", err);
    return null;
  } finally {
    void import("@/lib/subtitles/subtitle-library-db").then((m) =>
      m.syncSubtitleLibraryAnime(ctx.anilistId),
    );
    void import("@/lib/subtitles/subtitle-library-sync").then((m) => {
      m.queueAnimeForSubtitleSync(ctx.anilistId);
      m.triggerBackgroundSubtitleLibrarySync();
    });
  }
}

async function resolveSubtitleTrack(
  ctx: SubtitleCacheContext,
  track: StreamTrack,
): Promise<CachedSubtitleTrack | null> {
  const sourceUrl = getTrackFile(track);
  if (!sourceUrl || !isSubtitleTrack(track)) return null;

  const label = (track.label ?? "Unknown").trim().slice(0, 100) || "Unknown";

  if (dbAvailable()) {
    try {
      const db = getDb();
      const [existing] = await db
        .select()
        .from(episodeSubtitles)
        .where(
          and(
            eq(episodeSubtitles.anilistId, ctx.anilistId),
            eq(episodeSubtitles.episode, ctx.episode),
            eq(episodeSubtitles.audio, ctx.audio),
            subtitleProviderFilter(),
            eq(episodeSubtitles.label, label),
          ),
        )
        .limit(1);

      if (existing && !isStale(existing.fetchedAt) && existing.content.trim()) {
        return rowToTrack(existing);
      }
    } catch {
      // fall through to fetch
    }
  }

  const content = await fetchSubtitleContent(sourceUrl, ctx.headers);
  if (!content) return null;

  return upsertSubtitle(ctx, track, content);
}

function proxySubtitleTrack(
  track: StreamTrack,
  headers?: Record<string, string>,
): StreamTrack {
  const file = getTrackFile(track);
  if (!file || isOurSubtitleUrl(file)) return track;
  return { ...track, file: subtitleProxyUrl(file, headers) };
}

async function getCachedEpisodeNumbers(anilistId: number): Promise<Set<number>> {
  const rows = await listAnimeSubtitles(anilistId);
  return new Set(rows.map((row) => row.episode));
}

export type IncrementalSubtitleCacheResult = {
  anilistId: number;
  fetched: number;
  totalEpisodes: number;
  cachedEpisodes: number;
  isComplete: boolean;
};

/** Fetch the next missing episode(s) for one anime, throttled for Kitty API rate limits. */
export async function ensureIncrementalSubtitleCache(
  anilistId: number,
  opts: {
    maxEpisodes?: number;
    delayMs?: number;
    episodeCount?: number;
    force?: boolean;
  } = {},
): Promise<IncrementalSubtitleCacheResult> {
  const maxEpisodes = Math.max(1, opts.maxEpisodes ?? 1);
  const miruroDelayMs = opts.delayMs ?? SUBTITLE_API_INTERVAL_MS;
  const force = opts.force === true;

  if (fullShowPrefetchInProgress.has(anilistId)) {
    const existing = await listAnimeSubtitles(anilistId);
    return {
      anilistId,
      fetched: 0,
      totalEpisodes: opts.episodeCount ?? 0,
      cachedEpisodes: new Set(existing.map((r) => r.episode)).size,
      isComplete: false,
    };
  }

  fullShowPrefetchInProgress.add(anilistId);

  try {
    const { fetchAnilistMetaBatch } = await import("@/lib/subtitles/subtitle-library-enrich");
    const { getStoredSubtitleLibraryMeta } = await import("@/lib/subtitles/subtitle-library-db");
    await fetchAnilistMetaBatch([anilistId]);

    const metaMap = await getStoredSubtitleLibraryMeta([anilistId]);
    const animeTitle = metaMap.get(anilistId)?.title ?? null;

    let count = opts.episodeCount ?? 0;
    if (count <= 0) {
      count = await fetchAnilistEpisodeCount(anilistId);
    }

    const existing = await listAnimeSubtitles(anilistId);
    let cachedEps = new Set(existing.map((r) => r.episode));

    let fetched = 0;
    const batchSize = SUBTITLE_SYNC_BATCH_SIZE;
    const delayMs = miruroDelayMs;

    if (count > 0) {
      const missing: number[] = [];
      for (let ep = 1; ep <= count && missing.length < maxEpisodes; ep++) {
        if (force || !cachedEps.has(ep)) missing.push(ep);
      }

      for (let i = 0; i < missing.length; i += batchSize) {
        const batch = missing.slice(i, i + batchSize);
        const before = cachedEps.size;

        await Promise.all(
          batch.map((ep) =>
            ensurePlaybackSubtitleCache(
              { anilistId, episode: ep, audio: "sub", animeTitle },
              { force, allowBulk: true },
            ),
          ),
        );

        cachedEps = await getCachedEpisodeNumbers(anilistId);
        if (cachedEps.size > before) {
          fetched += cachedEps.size - before;
        }

        if (i + batchSize < missing.length) {
          await sleep(delayMs);
        }
      }
    } else if (fetched < maxEpisodes) {
      // Unknown episode count — try next sequential episode after highest cached.
      const nextEp = cachedEps.size > 0 ? Math.max(...cachedEps) + 1 : 1;
      const before = cachedEps.size;
      await ensurePlaybackSubtitleCache(
        { anilistId, episode: nextEp, audio: "sub", animeTitle },
        { force, allowBulk: true },
      );
      cachedEps = await getCachedEpisodeNumbers(anilistId);
      if (cachedEps.size > before) {
        fetched = 1;
      }
    }

    await fetchAnilistMetaBatch([anilistId]);
    const totalEpisodes =
      count > 0 ? count : (await fetchAnilistEpisodeCount(anilistId)) || cachedEps.size;
    const syncResult = await import("@/lib/subtitles/subtitle-library-db").then((m) =>
      m.syncSubtitleLibraryAnime(anilistId, {
        totalEpisodes: totalEpisodes > 0 ? totalEpisodes : null,
      }),
    );

    const cachedEpisodes = cachedEps.size;
    const isComplete = syncResult.isComplete;

    return {
      anilistId,
      fetched,
      totalEpisodes,
      cachedEpisodes,
      isComplete,
    };
  } finally {
    fullShowPrefetchInProgress.delete(anilistId);
  }
}

async function fetchAnilistEpisodeCount(anilistId: number): Promise<number> {
  try {
    const { queryAniList } = await import("@/lib/oauth/anilist");
    const raw = await queryAniList(ANILIST_EPISODE_QUERY, { id: anilistId });
    const m = raw.Media;
    if (!m) return 0;

    const total = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 0);

    return Math.max(total, 0);
  } catch {
    return 0;
  }
}

/** Download subtitle tracks, persist to Postgres, and rewrite file URLs to our API. */
export async function cacheStreamSubtitleTracks(
  tracks: StreamTrack[] | undefined,
  ctx: SubtitleCacheContext,
): Promise<StreamTrack[]> {
  if (!isSubtitleCacheProvider(ctx.provider)) {
    return tracks ?? [];
  }

  if (!Array.isArray(tracks) || tracks.length === 0) {
    return tracks ?? [];
  }

  const results = await Promise.all(
    tracks.map(async (track) => {
      if (!isSubtitleTrack(track)) return track;

      const cached = await resolveSubtitleTrack(ctx, track);
      if (cached) {
        return {
          ...track,
          file: cached.file,
          kind: cached.kind,
          label: cached.label,
          default: cached.default ?? track.default,
        };
      }

      return proxySubtitleTrack(track, ctx.headers);
    }),
  );

  return results;
}

/** Inject cached Kitty subtitle tracks for playback. */
export async function mergeCachedSubtitleTracks(
  tracks: StreamTrack[] | undefined,
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
  headers?: Record<string, string>,
): Promise<StreamTrack[]> {
  const all = Array.isArray(tracks) ? tracks : [];
  const nonSubs = all.filter((t) => !isSubtitleTrack(t));
  const inlineSubs = all.filter(isSubtitleTrack).map((t) => proxySubtitleTrack(t, headers));

  const cached = await loadStoredPlaybackSubtitleTracks(ctx);

  return dedupeSubtitleTracks([...nonSubs, ...cached, ...inlineSubs]);
}

export type ListedSubtitle = {
  id: string;
  anilistId: number;
  animeTitle: string | null;
  episode: number;
  audio: string;
  label: string;
  isDefault: boolean;
  fetchedAt: Date;
};

/** Remove cached subtitle rows for one anime (SUB tracks only — library page never uses DUB). */
export async function clearAnimeSubtitles(
  anilistId: number,
  opts?: { episode?: number },
): Promise<number> {
  if (!dbAvailable() || anilistId <= 0) return 0;

  try {
    const db = getDb();
    const conditions = [
      eq(episodeSubtitles.anilistId, anilistId),
      eq(episodeSubtitles.audio, "sub"),
      subtitleProviderFilter(),
    ];
    if (opts?.episode != null && opts.episode > 0) {
      conditions.push(eq(episodeSubtitles.episode, opts.episode));
    }

    const deleted = await db
      .delete(episodeSubtitles)
      .where(and(...conditions))
      .returning({ id: episodeSubtitles.id });

    void import("@/lib/subtitles/subtitle-library-db").then((m) =>
      m.syncSubtitleLibraryAnime(anilistId),
    );

    return deleted.length;
  } catch (err) {
    console.error("[subtitle-cache-store] clearAnimeSubtitles failed:", err);
    return 0;
  }
}

export async function listAnimeSubtitles(anilistId: number): Promise<ListedSubtitle[]> {
  if (!dbAvailable()) return [];

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: episodeSubtitles.id,
        anilistId: episodeSubtitles.anilistId,
        animeTitle: episodeSubtitles.animeTitle,
        episode: episodeSubtitles.episode,
        audio: episodeSubtitles.audio,
        label: episodeSubtitles.label,
        isDefault: episodeSubtitles.isDefault,
        fetchedAt: episodeSubtitles.fetchedAt,
        provider: episodeSubtitles.provider,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, anilistId),
          eq(episodeSubtitles.audio, "sub"),
          subtitleProviderFilter(),
        ),
      )
      .orderBy(asc(episodeSubtitles.episode), asc(episodeSubtitles.label));

    return dedupeSubtitleRows(rows).map(({ provider: _provider, ...row }) => row);
  } catch {
    return [];
  }
}

export type SubtitleEpisodeCoverage = {
  cachedEpisodes: number[];
  missingEpisodes: number[];
  totalEpisodes: number;
};

/** Cached vs missing episode numbers for one anime (uses library meta for total count). */
export async function getAnimeSubtitleEpisodeCoverage(
  anilistId: number,
  totalEpisodesHint?: number | null,
): Promise<SubtitleEpisodeCoverage> {
  const rows = await listAnimeSubtitles(anilistId);
  const cachedEpisodes = [...new Set(rows.map((r) => r.episode))].sort((a, b) => a - b);

  let totalEpisodes = totalEpisodesHint ?? 0;
  if (totalEpisodes <= 0) {
    const { getStoredSubtitleLibraryMeta } = await import("@/lib/subtitles/subtitle-library-db");
    const meta = await getStoredSubtitleLibraryMeta([anilistId]);
    totalEpisodes = meta.get(anilistId)?.episodes ?? 0;
  }

  if (totalEpisodes <= 0) {
    const maxCached = cachedEpisodes.length > 0 ? Math.max(...cachedEpisodes) : 0;
    totalEpisodes = maxCached;
  }

  const cachedSet = new Set(cachedEpisodes);
  const missingEpisodes: number[] = [];
  for (let ep = 1; ep <= totalEpisodes; ep++) {
    if (!cachedSet.has(ep)) missingEpisodes.push(ep);
  }

  return { cachedEpisodes, missingEpisodes, totalEpisodes };
}

export type SubtitleLibraryStats = {
  totalAnimes: number;
  totalTracks: number;
  completedAnimes: number;
  cachedEpisodes: number;
  totalEpisodes: number;
  subsProviderCount?: number;
};

export type SubtitleLibraryEntry = {
  anilistId: number;
  animeTitle: string | null;
  trackCount: number;
  episodeCount: number;
  lastFetched: string | null;
  poster?: string | null;
  status?: string | null;
  totalEpisodes?: number | null;
  isComplete?: boolean;
  score?: number | null;
  year?: number | null;
};

function subtitleLibrarySearchPattern(q: string): string {
  const safe = q.replace(/[%_]/g, "").trim();
  return `%${safe}%`;
}

function subtitleLibraryWhere(q?: string) {
  const providerFilter = subtitleProviderFilter();
  const trimmed = q?.trim();
  if (!trimmed) return providerFilter;

  const pattern = subtitleLibrarySearchPattern(trimmed);
  return and(
    providerFilter,
    or(
      ilike(episodeSubtitles.animeTitle, pattern),
      sql`cast(${episodeSubtitles.anilistId} as text) like ${pattern}`,
    ),
  );
}

const EMPTY_STATS: SubtitleLibraryStats = {
  totalAnimes: 0,
  totalTracks: 0,
  completedAnimes: 0,
  cachedEpisodes: 0,
  totalEpisodes: 0,
};

export async function getSubtitleLibraryStats(): Promise<SubtitleLibraryStats> {
  if (!dbAvailable()) return EMPTY_STATS;

  try {
    const db = getDb();
    const [row] = await db
      .select({
        totalTracks: sql<number>`count(*)::int`,
        totalAnimes: sql<number>`count(distinct ${episodeSubtitles.anilistId})::int`,
      })
      .from(episodeSubtitles)
      .where(subtitleProviderFilter());

    const {
      countCompletedSubtitleAnimesFromDb,
      getSubtitleEpisodeCoverage,
    } = await import("@/lib/subtitles/subtitle-library-db");
    const completedAnimes = await countCompletedSubtitleAnimesFromDb();
    const coverage = await getSubtitleEpisodeCoverage();

    return {
      totalAnimes: row?.totalAnimes ?? 0,
      totalTracks: row?.totalTracks ?? 0,
      completedAnimes,
      cachedEpisodes: coverage.cachedEpisodes,
      totalEpisodes: coverage.totalEpisodes,
    };
  } catch {
    return EMPTY_STATS;
  }
}

export async function searchSubtitleLibrary(opts: {
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
  const whereClause = subtitleLibraryWhere(opts.q);

  if (!dbAvailable()) {
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }

  try {
    const db = getDb();

    const [countRow] = await db
      .select({
        total: sql<number>`count(distinct ${episodeSubtitles.anilistId})::int`,
      })
      .from(episodeSubtitles)
      .where(whereClause);

    const total = countRow?.total ?? 0;

    let cachedAnilistIds: number[] = [];
    if (opts.q?.trim()) {
      const idRows = await db
        .selectDistinct({ anilistId: episodeSubtitles.anilistId })
        .from(episodeSubtitles)
        .where(whereClause);
      cachedAnilistIds = idRows.map((row) => row.anilistId);
    }

    const rows = await db
      .select({
        anilistId: episodeSubtitles.anilistId,
        animeTitle: sql<string | null>`max(${episodeSubtitles.animeTitle})`,
        trackCount: sql<number>`count(*)::int`,
        episodeCount: sql<number>`count(distinct ${episodeSubtitles.episode})::int`,
        lastFetched: sql<Date | null>`max(${episodeSubtitles.updatedAt})`,
      })
      .from(episodeSubtitles)
      .where(whereClause)
      .groupBy(episodeSubtitles.anilistId)
      .orderBy(desc(sql`max(${episodeSubtitles.updatedAt})`))
      .limit(limit)
      .offset(offset);

    const { getSubtitleLibrarySummaryMap, isSubtitleLibraryComplete } = await import(
      "@/lib/subtitles/subtitle-library-db"
    );
    const summaryMap = await getSubtitleLibrarySummaryMap(rows.map((row) => row.anilistId));

    return {
      items: rows.map((row) => {
        const summary = summaryMap.get(row.anilistId);
        const totalEpisodes = summary?.totalEpisodes ?? null;
        const episodeCount = row.episodeCount;
        const isComplete =
          summary?.isComplete ??
          isSubtitleLibraryComplete({
            trackCount: row.trackCount,
            episodeCount,
            totalEpisodes,
          });

        return {
          anilistId: row.anilistId,
          animeTitle: summary?.animeTitle ?? row.animeTitle,
          trackCount: row.trackCount,
          episodeCount,
          lastFetched: row.lastFetched?.toISOString() ?? null,
          poster: summary?.poster ?? null,
          status: summary?.status ?? null,
          totalEpisodes,
          isComplete,
          score: summary?.score ?? null,
          year: summary?.year ?? null,
        };
      }),
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
      cachedAnilistIds,
    };
  } catch (err) {
    console.error("[subtitle-cache] searchSubtitleLibrary failed:", err);
    return { items: [], total: 0, page, limit, hasNextPage: false, cachedAnilistIds: [] };
  }
}
