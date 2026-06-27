import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { episodeSubtitles } from "@/db/schema";
import {
  getTrackFile,
  isOurSubtitleUrl,
  isSubtitleTrack,
  SUBTITLE_SOURCE_PROVIDER,
  subtitleProxyUrl,
  subtitleServeUrl,
  type StreamTrack,
} from "@/lib/subtitle-track-utils";
import { sanitizeHeaderValue } from "@/lib/security";

const KITTY_API_BASE = "https://kittyapi.buzz";

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
          eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
        ),
      );

    return rows.filter((row) => !isStale(row.fetchedAt)).map(rowToTrack);
  } catch {
    return [];
  }
}

function hasFreshCachedSubtitles(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<boolean> {
  return getStoredSubtitleTracks(ctx).then((tracks) => tracks.length > 0);
}

async function fetchAnitakuStream(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<{ tracks?: StreamTrack[]; headers?: Record<string, string>; animeTitle?: string | null } | null> {
  const url = `${KITTY_API_BASE}/provider/${encodeURIComponent(SUBTITLE_SOURCE_PROVIDER)}/stream-direct?anilistId=${ctx.anilistId}&episode=${ctx.episode}&audio=${ctx.audio}`;

  const headers: HeadersInit = {};
  const apiKey = process.env.KITTY_API_KEY;
  if (apiKey) headers["x-api-key"] = apiKey;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers,
    });

    const data = await res.json();
    if (!res.ok || !data?.file) return null;

    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    const animeTitle =
      typeof data.matchedTitle === "string"
        ? data.matchedTitle
        : typeof data.animeTitle === "string"
          ? data.animeTitle
          : null;

    return { tracks: data.tracks, headers: data.headers ?? {}, animeTitle };
  } catch {
    return null;
  }
}

/** Fetch subtitle tracks from Anitaku and persist them when cache is missing or stale. */
export async function ensureAnitakuSubtitleCache(
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
): Promise<void> {
  if (await hasFreshCachedSubtitles(ctx)) return;

  let stream = await fetchAnitakuStream(ctx);
  const hasSubs = stream?.tracks?.some(isSubtitleTrack);

  if (!hasSubs && ctx.audio === "dub") {
    stream = await fetchAnitakuStream({ ...ctx, audio: "sub" });
  }

  if (!stream?.tracks?.length) return;

  await cacheStreamSubtitleTracks(stream.tracks, {
    ...ctx,
    provider: SUBTITLE_SOURCE_PROVIDER,
    animeTitle: stream.animeTitle,
    headers: stream.headers,
  });
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

  try {
    const db = getDb();
    const now = new Date();

    const [row] = await db
      .insert(episodeSubtitles)
      .values({
        anilistId: ctx.anilistId,
        animeTitle: ctx.animeTitle ?? null,
        episode: ctx.episode,
        audio: ctx.audio,
        provider: SUBTITLE_SOURCE_PROVIDER,
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
            eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
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

/** Background-fetch subtitles for every episode when ep 1 is watched. */
export async function ensureFullShowSubtitleCache(
  anilistId: number,
  episodeCount?: number,
): Promise<void> {
  if (fullShowPrefetchInProgress.has(anilistId)) return;
  fullShowPrefetchInProgress.add(anilistId);

  try {
    let count = episodeCount ?? 0;
    if (count <= 0) {
      count = await fetchAnilistEpisodeCount(anilistId);
    }
    if (count <= 0) return;

    const existing = await listAnimeSubtitles(anilistId);
    const cachedEps = new Set(existing.map((r) => r.episode));

    const CONCURRENCY = 3;
    for (let start = 1; start <= count; start += CONCURRENCY) {
      const batch: Promise<void>[] = [];
      for (let ep = start; ep < Math.min(start + CONCURRENCY, count + 1); ep++) {
        if (!cachedEps.has(ep)) {
          batch.push(ensureAnitakuSubtitleCache({ anilistId, episode: ep, audio: "sub" }));
        }
      }
      if (batch.length > 0) await Promise.allSettled(batch);
    }
  } finally {
    fullShowPrefetchInProgress.delete(anilistId);
  }
}

async function fetchAnilistEpisodeCount(anilistId: number): Promise<number> {
  try {
    const { queryAniList } = await import("@/lib/anilist");
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

/** Download subtitle tracks from Anitaku, persist to Postgres, and rewrite file URLs to our API. */
export async function cacheStreamSubtitleTracks(
  tracks: StreamTrack[] | undefined,
  ctx: SubtitleCacheContext,
): Promise<StreamTrack[]> {
  if (ctx.provider !== SUBTITLE_SOURCE_PROVIDER) {
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

/** Inject Anitaku cached subtitle tracks (always sourced from SUBTITLE_SOURCE_PROVIDER). */
export async function mergeCachedSubtitleTracks(
  tracks: StreamTrack[] | undefined,
  ctx: Pick<SubtitleCacheContext, "anilistId" | "episode" | "audio">,
  headers?: Record<string, string>,
): Promise<StreamTrack[]> {
  const all = Array.isArray(tracks) ? tracks : [];
  const nonSubs = all.filter((t) => !isSubtitleTrack(t));

  let cached = await getStoredSubtitleTracks(ctx);
  if (cached.length === 0 && ctx.audio === "dub") {
    cached = await getStoredSubtitleTracks({ ...ctx, audio: "sub" });
  }
  if (cached.length > 0) {
    return [...nonSubs, ...cached];
  }

  const subs = all.filter(isSubtitleTrack).map((t) => proxySubtitleTrack(t, headers));
  return [...nonSubs, ...subs];
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

export async function listAnimeSubtitles(anilistId: number): Promise<ListedSubtitle[]> {
  if (!dbAvailable()) return [];

  try {
    const db = getDb();
    return await db
      .select({
        id: episodeSubtitles.id,
        anilistId: episodeSubtitles.anilistId,
        animeTitle: episodeSubtitles.animeTitle,
        episode: episodeSubtitles.episode,
        audio: episodeSubtitles.audio,
        label: episodeSubtitles.label,
        isDefault: episodeSubtitles.isDefault,
        fetchedAt: episodeSubtitles.fetchedAt,
      })
      .from(episodeSubtitles)
      .where(
        and(
          eq(episodeSubtitles.anilistId, anilistId),
          eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
        ),
      )
      .orderBy(asc(episodeSubtitles.episode), asc(episodeSubtitles.label));
  } catch {
    return [];
  }
}

export type SubtitleArchiveRow = {
  anilistId: number;
  episode: number;
  label: string;
  content: string;
};

/** Subtitle file contents for ZIP batch downloads. */
export async function getSubtitleArchiveRows(
  anilistId: number,
  episodes?: number[],
): Promise<SubtitleArchiveRow[]> {
  if (!dbAvailable()) return [];

  try {
    const db = getDb();
    const conditions = [
      eq(episodeSubtitles.anilistId, anilistId),
      eq(episodeSubtitles.provider, SUBTITLE_SOURCE_PROVIDER),
    ];

    if (episodes && episodes.length > 0) {
      conditions.push(inArray(episodeSubtitles.episode, episodes));
    }

    const rows = await db
      .select({
        anilistId: episodeSubtitles.anilistId,
        episode: episodeSubtitles.episode,
        label: episodeSubtitles.label,
        content: episodeSubtitles.content,
        fetchedAt: episodeSubtitles.fetchedAt,
      })
      .from(episodeSubtitles)
      .where(and(...conditions))
      .orderBy(asc(episodeSubtitles.episode), asc(episodeSubtitles.label));

    return rows
      .filter((row) => !isStale(row.fetchedAt) && row.content.trim())
      .map(({ anilistId: aid, episode, label, content }) => ({
        anilistId: aid,
        episode,
        label,
        content,
      }));
  } catch {
    return [];
  }
}
