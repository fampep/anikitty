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
): { episode: number; airingAt: number } | null {
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
export function resolveAiredEpisodeCount(ctx: AiringContext): number {
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

/** Full season length for UI lists — includes episodes that have not aired yet. */
export function resolveTotalEpisodeCount(
  ctx: AiringContext & { metadataMaxEpisode?: number; anikotoTotal?: number },
): number {
  const aired = resolveAiredEpisodeCount(ctx);
  const planned = ctx.episodes;
  const metadataMax = ctx.metadataMaxEpisode ?? 0;
  const anikotoTotal = ctx.anikotoTotal ?? 0;

  let total = maxPositive(planned, metadataMax, aired, anikotoTotal);

  const nextEp = ctx.nextAiringEpisode;
  if (nextEp != null && nextEp > 0) {
    total = Math.max(total, nextEp);
  }

  return total;
}

/** Whether an episode has been released and can be watched. */
export function resolveEpisodeAiredStatus(
  episodeNumber: number,
  airDate: string | null | undefined,
  airedUpTo: number,
): boolean {
  if (airDate?.trim()) {
    return isEpisodeAiredByDate(airDate);
  }
  return episodeNumber <= airedUpTo;
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
