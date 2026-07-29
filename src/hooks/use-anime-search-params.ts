import { SearchAnimeParams } from "@/types/anime";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

export const useAnimeSearchParams = (): SearchAnimeParams => {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const get = (key: string) => searchParams.get(key) || undefined;

    return {
      q: get("q") ?? "",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      type: get("type"),
      status: get("status"),
      rated: get("rated"),
      season: get("season"),
      language: get("language"),
      sort: get("sort"),
      genres: get("genres"),
      excludeGenres: get("excludeGenres"),
      year: get("year"),
      decade: get("decade"),
      studio: get("studio"),
      source: get("source"),
      tags: get("tags"),
      demographic: get("demographic"),
      country: get("country"),
      episodeMin: get("episodeMin"),
      episodeMax: get("episodeMax"),
      durationMin: get("durationMin"),
      durationMax: get("durationMax"),
      scoreMin: get("scoreMin"),
      episodes: get("episodes"),
      runtime: get("runtime"),
    };
  }, [searchParams]);
};
