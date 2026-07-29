import { useMemo } from "react";
import { useT } from "@/providers/i18n-provider";
import {
  countries,
  decades,
  demographics,
  episodeRanges,
  genres,
  ratings,
  runtimeRanges,
  scoreRanges,
  seasons,
  sort,
  sources,
  statuses,
  themes,
  types,
  years,
  languages,
} from "@/constants/search-filters";

export function useFilterLabels() {
  const t = useT();

  return useMemo(
    () => ({
      types: types.map((o) => ({
        value: o.value,
        label: t(`search.filterTypes.${o.value === "all" ? "all" : o.value}`),
      })),
      statuses: statuses.map((o) => ({
        value: o.value,
        label: t(
          `search.filterStatus.${
            o.value === "currently-airing"
              ? "airing"
              : o.value === "finished-airing"
                ? "finished"
                : "upcoming"
          }`,
        ),
      })),
      seasons: seasons.map((o) => ({
        value: o.value,
        label: t(`search.filterSeasons.${o.value}`),
      })),
      years: years.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      decades: decades.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      sort: sort.map((o) => ({
        value: o.value,
        label: t(
          `search.filterSort.${
            o.value === "default"
              ? "default"
              : o.value === "score"
                ? "score"
                : o.value === "most-watched"
                  ? "popular"
                  : o.value === "trending"
                    ? "trending"
                    : o.value === "recently-added"
                      ? "newest"
                      : "az"
          }`,
        ),
      })),
      genres: genres.map((o) => ({
        value: o.value,
        label: t(
          `search.filterGenres.${
            o.value === "sci-fi"
              ? "sciFi"
              : o.value === "slice-of-life"
                ? "sliceOfLife"
                : o.value
          }`,
        ),
      })),
      sources: sources.map((o) => ({ value: o.value, label: o.label })),
      countries: countries.map((o) => ({ value: o.value, label: o.label })),
      demographics: demographics.map((o) => ({ value: o.value, label: o.label })),
      themes: themes.map((o) => ({ value: o.value, label: o.label })),
      episodeRanges: episodeRanges.map((o) => ({ value: o.value, label: o.label })),
      runtimeRanges: runtimeRanges.map((o) => ({ value: o.value, label: o.label })),
      scoreRanges: scoreRanges.map((o) => ({ value: o.value, label: `${o.label}` })),
      ratings: ratings.map((o) => ({ value: o.value, label: o.label })),
      languages: languages.map((o) => ({ value: o.value, label: o.label })),
    }),
    [t],
  );
}
