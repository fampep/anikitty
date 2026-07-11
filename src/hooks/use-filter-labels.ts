import { useMemo } from "react";
import { useT } from "@/providers/i18n-provider";
import { genres, seasons, sort, statuses, types, years } from "@/constants/search-filters";

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
        label: t(`search.filterStatus.${o.value === "currently-airing" ? "airing" : o.value === "finished-airing" ? "finished" : "upcoming"}`),
      })),
      seasons: seasons.map((o) => ({
        value: o.value,
        label: t(`search.filterSeasons.${o.value}`),
      })),
      years: years.map((o) => ({
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
    }),
    [t],
  );
}
