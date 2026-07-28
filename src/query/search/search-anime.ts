import { SEARCH_ANIME, SEARCH_VOICE_ACTORS } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { VoiceActorSummary } from "@/lib/core/voice-actors";
import { ISuggestionAnime } from "@/types/anime";
import { useSettingsStore } from "@/store/settings-store";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

export type SearchSuggestions = {
  anime: ISuggestionAnime[];
  voiceActors: VoiceActorSummary[];
};

const searchSuggestions = async (
  q: string,
  adult: boolean,
): Promise<SearchSuggestions> => {
  const res = await api.get("/api/search/suggestion", {
    params: { q, ...(adult ? { adult: "1" } : {}) },
  });
  return {
    anime: (res.data.data.suggestions ?? []) as ISuggestionAnime[],
    voiceActors: (res.data.data.voiceActors ?? []) as VoiceActorSummary[],
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
    select: (data) => data.anime,
  });
};

export const useSearchSuggestions = (query: string) => {
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);
  return useQuery({
    queryKey: [SEARCH_ANIME, "suggestions", query, showAdultContent ? "adult" : "sfw"],
    queryFn: () => searchSuggestions(query, showAdultContent),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
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
  });
};
