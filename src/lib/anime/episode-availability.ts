import type { Episode } from "@/types/episodes";

export type AiringContext = {
  status?: string | null;
  episodes?: number | null;
  nextAiringEpisode?: number | null;
  streamingEpisodeCount?: number;
};

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
    return Math.max(0, nextEp - 1);
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

export function isEpisodePlayable(
  episode: Episode | null | undefined,
): boolean {
  if (!episode) return false;
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
