import { SEARCH_ANIME, SEARCH_VOICE_ACTORS } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { VoiceActorSummary } from "@/lib/core/voice-actors";
import { ISuggestionAnime } from "@/types/anime";
import { useSettingsStore } from "@/store/settings-store";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

export type SearchSuggestions = {
  anime: ISuggestionAnime[];
  movies: ISuggestionAnime[];
  voiceActors: VoiceActorSummary[];
  characters: Array<{
    id: string;
    name: string;
    native: string | null;
    image: string | null;
    favourites: number | null;
    mediaId: string | null;
    mediaTitle: string | null;
  }>;
  studios: Array<{
    id: string;
    name: string;
    favourites: number | null;
    isAnimationStudio: boolean;
  }>;
  users: Array<{
    username: string;
    avatarUrl: string | null;
  }>;
  genres: Array<{
    slug: string;
    name: string;
  }>;
};

const searchSuggestions = async (
  q: string,
  adult: boolean,
): Promise<SearchSuggestions> => {
  const res = await api.get("/api/search/suggestion", {
    params: { q, ...(adult ? { adult: "1" } : {}) },
    timeout: 10_000,
  });
  const d = res.data.data ?? {};
  return {
    anime: (d.suggestions ?? []) as ISuggestionAnime[],
    movies: (d.movies ?? []) as ISuggestionAnime[],
    voiceActors: (d.voiceActors ?? []) as VoiceActorSummary[],
    characters: d.characters ?? [],
    studios: d.studios ?? [],
    users: d.users ?? [],
    genres: d.genres ?? [],
  };
};

export const useSearchAnime = (query: string) => {
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  return useQuery({
    queryKey: [SEARCH_ANIME, "suggestions", query, showAdultContent ? "adult" : "sfw"],
    queryFn: () => searchSuggestions(query, showAdultContent),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 3000),
    select: (data) => data.anime,
  });
};

export const useSearchSuggestions = (query: string) => {
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  return useQuery({
    queryKey: [SEARCH_ANIME, "suggestions-v2", query, showAdultContent ? "adult" : "sfw"],
    queryFn: () => searchSuggestions(query, showAdultContent),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 3000),
  });
};

export type VoiceActorSearchPage = {
  results: VoiceActorSummary[];
  hasNextPage: boolean;
  currentPage: number;
};

const searchVoiceActorsPage = async (
  q: string,
  page: number,
): Promise<VoiceActorSearchPage> => {
  const res = await api.get("/api/voice-actors/search", {
    params: { q, page, perPage: 18 },
    timeout: 10_000,
  });
  return {
    results: (res.data.results ?? []) as VoiceActorSummary[],
    hasNextPage: Boolean(res.data.hasNextPage),
    currentPage: res.data.currentPage ?? page,
  };
};

export const useSearchVoiceActors = (query: string, page = 1, enabled = true) => {
  const trimmed = query.trim();
  return useQuery({
    queryKey: [SEARCH_VOICE_ACTORS, trimmed, page],
    queryFn: () => searchVoiceActorsPage(trimmed, page),
    enabled: enabled && trimmed.length >= 2,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });
};
