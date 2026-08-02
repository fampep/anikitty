import type { Episode } from "@/types/episodes";

export type AiringContext = {
  status?: string | null;
  episodes?: number | null;
  nextAiringEpisode?: number | null;
  /** AniList `airingAt` — unix timestamp in seconds. */
  nextAiringAt?: number | null;
  streamingEpisodeCount?: number;
};

export type AnilistNextAiring = {
  episode?: number | null;
  airingAt?: number | null;
} | null | undefined;

/** True when AniList still lists this as "next" but its scheduled time has passed. */
export function isNextAiringEpisodeAlreadyAired(
  airingAt: number | null | undefined,
  now = Date.now(),
): boolean {
  return airingAt != null && airingAt > 0 && airingAt * 1000 <= now;
}

/** Count sub episodes that have aired from AniList schedule metadata. */
export function airedCountFromAnilist(
  next: AnilistNextAiring,
  opts?: Omit<AiringContext, "nextAiringEpisode" | "nextAiringAt">,
): number {
  return resolveAiredEpisodeCount({
    ...opts,
    nextAiringEpisode: next?.episode ?? null,
    nextAiringAt: next?.airingAt ?? null,
  });
}

/** Drop stale next-episode entries once their air time has passed. */
export function resolveEffectiveNextAiringEpisode(
  next: AnilistNextAiring,
  now = Date.now(),
  /** Optional series status — a finished show has no next episode. */
  status?: string | null,
): { episode: number; airingAt: number } | null {
  if (isSeriesFinished(status)) return null;
  const episode = next?.episode;
  const airingAt = next?.airingAt;
  if (episode == null || episode <= 0 || airingAt == null || airingAt <= 0) return null;
  if (airingAt * 1000 <= now) return null;
  return { episode, airingAt };
}

/** Parse YYYY-MM-DD (and optional time suffix) from ani.zip / TVDB-style dates. */
export function parseEpisodeAirDate(airDate: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(airDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** True when the calendar air date is today or earlier (UTC). Missing date → aired. */
export function isEpisodeAiredByDate(
  airDate: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!airDate?.trim()) return true;
  const aired = parseEpisodeAirDate(airDate);
  if (!aired) return true;
  const today = new Date(now);
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  return aired.getTime() <= todayUtc;
}

/** How many episodes have aired according to AniList schedule metadata. */
/** Series that can never have a further episode, whatever AniList still lists. */
export function isSeriesFinished(status?: string | null): boolean {
  const s = status?.toUpperCase();
  return s === "FINISHED" || s === "CANCELLED";
}

export function resolveAiredEpisodeCount(ctx: AiringContext): number {
  // A finished series has aired everything it will ever air. AniList
  // sometimes leaves a stale nextAiringEpisode on completed shows, and
  // trusting it made long-finished series report `nextEp - 1` aired — which
  // rendered their remaining episodes as "not aired yet".
  if (isSeriesFinished(ctx.status)) {
    return maxPositive(ctx.episodes, ctx.streamingEpisodeCount);
  }

  const nextEp = ctx.nextAiringEpisode;
  if (nextEp != null && nextEp > 0) {
    if (isNextAiringEpisodeAlreadyAired(ctx.nextAiringAt)) {
      return nextEp;
    }

    const unairedBased = Math.max(0, nextEp - 1);
    if (
      ctx.streamingEpisodeCount != null &&
      ctx.streamingEpisodeCount > unairedBased
    ) {
      return ctx.streamingEpisodeCount;
    }
    return unairedBased;
  }

  const status = ctx.status?.toUpperCase();
  if (status === "NOT_YET_RELEASED") {
    return 0;
  }

  if (status === "RELEASING") {
    return ctx.streamingEpisodeCount ?? ctx.episodes ?? 0;
  }

  return ctx.episodes ?? ctx.streamingEpisodeCount ?? 0;
}

function maxPositive(...values: Array<number | null | undefined>): number {
  let max = 0;
  for (const value of values) {
    if (value != null && value > max) max = value;
  }
  return max;
}

/** Clamp an episode count to the lowest positive limit (TMDB, AniList plan, etc.). */
export function capEpisodeCount(
  count: number,
  ...limits: Array<number | null | undefined>
): number {
  if (count <= 0) return 0;
  let result = count;
  for (const limit of limits) {
    if (limit != null && limit > 0) {
      result = Math.min(result, limit);
    }
  }
  return result;
}

/** Highest episode index found in episode metadata maps (AniZip, TMDB, etc.). */
export function maxEpisodeNumberInRecords(
  ...records: Array<Record<number, unknown>>
): number {
  let max = 0;
  for (const record of records) {
    for (const key of Object.keys(record)) {
      const num = parseInt(key, 10);
      if (num > max) max = num;
    }
  }
  return max;
}

/** Full season length for UI lists — prefers AniList `episodes` over provider catalogs. */
export function resolveTotalEpisodeCount(
  ctx: AiringContext & {
    metadataMaxEpisode?: number;
    anikotoTotal?: number;
    tmdbTotal?: number;
  },
): number {
  const aired = resolveAiredEpisodeCount(ctx);
  const planned = ctx.episodes;

  // AniList season length wins when known.
  if (planned != null && planned > 0) {
    const nextEp = ctx.nextAiringEpisode;
    if (nextEp != null && nextEp > 0) {
      return Math.max(planned, nextEp);
    }
    return Math.max(planned, aired);
  }

  const anikotoTotal = ctx.anikotoTotal ?? 0;
  const tmdbTotal = ctx.tmdbTotal ?? 0;
  // Prefer TMDB show-level count over per-episode metadata keys (multi-season maps inflate).
  const metadataMax = tmdbTotal > 0 ? 0 : (ctx.metadataMaxEpisode ?? 0);

  let total = maxPositive(metadataMax, aired, anikotoTotal, tmdbTotal);

  const nextEp = ctx.nextAiringEpisode;
  if (nextEp != null && nextEp > 0) {
    total = Math.max(total, nextEp);
  }

  return total;
}

/** Whether an episode has been released and can be watched.
 *  `airedUpTo` (AniList schedule / season) is the source of truth.
 *  Calendar dates only gate episodes beyond that count.
 */
export function resolveEpisodeAiredStatus(
  episodeNumber: number,
  airDate: string | null | undefined,
  airedUpTo: number,
): boolean {
  if (episodeNumber <= airedUpTo) return true;
  if (airDate?.trim()) return isEpisodeAiredByDate(airDate);
  return false;
}

export function isEpisodePlayable(
  episode: Episode | null | undefined,
): boolean {
  if (!episode) return false;
  if (episode.aired === false) return false;
  if (episode.aired === true) return true;
  return isEpisodeAiredByDate(episode.airDate);
}

export function findPlayableEpisode(
  episodes: Episode[],
  episodeId: string | null | undefined,
): Episode | undefined {
  if (!episodeId) return undefined;
  const ep = episodes.find((e) => e.episodeId === episodeId);
  return ep && isEpisodePlayable(ep) ? ep : undefined;
}

export function firstPlayableEpisode(
  episodes: Episode[],
): Episode | undefined {
  return episodes.find(isEpisodePlayable);
}

export function lastPlayableEpisode(
  episodes: Episode[],
): Episode | undefined {
  for (let i = episodes.length - 1; i >= 0; i--) {
    if (isEpisodePlayable(episodes[i])) return episodes[i];
  }
  return undefined;
}

/** Walk the list for the nearest playable episode in `direction`. */
export function adjacentPlayableEpisode(
  episodes: Episode[],
  currentEpisodeId: string | null | undefined,
  direction: "prev" | "next",
): Episode | undefined {
  if (!currentEpisodeId || episodes.length === 0) return undefined;
  const idx = episodes.findIndex((e) => e.episodeId === currentEpisodeId);
  if (idx < 0) return undefined;

  if (direction === "next") {
    for (let i = idx + 1; i < episodes.length; i++) {
      if (isEpisodePlayable(episodes[i])) return episodes[i];
    }
    return undefined;
  }

  for (let i = idx - 1; i >= 0; i--) {
    if (isEpisodePlayable(episodes[i])) return episodes[i];
  }
  return undefined;
}
