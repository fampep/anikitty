import { apiRequest } from "@/api/client";
import type {
  AccountMe,
  AnimeDetails,
  ContinueItem,
  EpisodeList,
  HomeCritical,
  KittyStream,
  LoginResponse,
  PublicProfile,
  RelatedPayload,
  ScheduleItem,
  SearchPayload,
  WatchlistItem,
} from "@/api/types";

type Envelope<T> = { data: T };

export type ApiContext = {
  base: string;
  token?: string | null;
};

export function getHomeCritical(ctx: ApiContext) {
  return apiRequest<Envelope<HomeCritical>>(ctx.base, "/api/home", {
    query: { scope: "critical" },
  });
}

export function searchAnime(ctx: ApiContext, query: string, page: number) {
  return apiRequest<Envelope<SearchPayload>>(ctx.base, "/api/search", {
    query: { q: query, page },
    timeoutMs: 12_000,
  });
}

export function getAnime(ctx: ApiContext, id: string) {
  return apiRequest<Envelope<AnimeDetails>>(ctx.base, `/api/anime/${encodeURIComponent(id)}`);
}

export function getRelated(ctx: ApiContext, id: string) {
  return apiRequest<Envelope<RelatedPayload>>(ctx.base, `/api/anime/${encodeURIComponent(id)}/related`);
}

export function getEpisodes(ctx: ApiContext, id: string) {
  return apiRequest<Envelope<EpisodeList>>(ctx.base, `/api/anime/${encodeURIComponent(id)}/episodes`);
}

export function getSchedule(ctx: ApiContext, date: string) {
  return apiRequest<Envelope<{ scheduledAnimes: ScheduleItem[] }>>(ctx.base, "/api/schedule", {
    query: { date },
  });
}

/** Plays whatever direct file the existing stream route already returns. */
export function getStream(
  ctx: ApiContext,
  anilistId: string,
  episode: string,
  audio: "sub" | "dub",
) {
  return apiRequest<KittyStream>(ctx.base, "/api/kitty/stream", {
    query: {
      anilistId,
      episode,
      audio,
      provider: "AniDelta",
      kittyNode: "auto",
    },
    timeoutMs: 22_000,
  });
}

export function login(ctx: ApiContext, identifier: string, password: string) {
  return apiRequest<LoginResponse>(ctx.base, "/api/account/auth/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function verifyTwoFactor(ctx: ApiContext, pendingToken: string, code: string) {
  return apiRequest<LoginResponse>(ctx.base, "/api/account/auth/2fa-verify", {
    method: "POST",
    body: { pendingToken, code },
  });
}

export function getMe(ctx: ApiContext) {
  return apiRequest<AccountMe>(ctx.base, "/api/account/me", { token: ctx.token });
}

export function getContinue(ctx: ApiContext) {
  return apiRequest<{ data: ContinueItem[] }>(ctx.base, "/api/account/watch/continue", {
    token: ctx.token,
    query: { latestPerAnime: "true", limit: 12 },
  });
}

export function saveProgress(
  ctx: ApiContext,
  body: {
    animeId: string;
    episodeId: string;
    currentTime: number;
    duration: number;
    language: "sub" | "dub";
    server: string;
    anilistId: number;
    animeTitle?: string;
    episodeNumber: number;
  },
) {
  return apiRequest<unknown>(ctx.base, "/api/account/watch/progress", {
    method: "POST",
    token: ctx.token,
    body,
  });
}

export function getPublicProfile(ctx: ApiContext, username: string) {
  return apiRequest<PublicProfile>(ctx.base, `/api/users/${encodeURIComponent(username)}`, {
    token: ctx.token,
  });
}

export function getWatchlist(ctx: ApiContext) {
  return apiRequest<{ results: WatchlistItem[]; total: number }>(ctx.base, "/api/account/watchlist", {
    token: ctx.token,
    query: { limit: 20 },
  });
}

export function addToWatchlist(
  ctx: ApiContext,
  body: { animeId: string; folder: "WATCHING" | "PLANNING"; anilistId: number; animeTitle: string; animeThumbnail?: string },
) {
  return apiRequest<unknown>(ctx.base, "/api/account/watchlist", {
    method: "POST",
    token: ctx.token,
    body,
  });
}
