import { GET_HOME_CRITICAL, GET_HOME_DISCOVERY, GET_HOME_PAGE_DATA } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { HomeCriticalData, HomeDiscoveryData } from "@/lib/core/home-data";
import { IAnime, IAnimeData } from "@/types/anime";
import { useSettingsStore } from "@/store/settings-store";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const homeQueryDefaults = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: 1000 * 60 * 8,
  gcTime: 1000 * 60 * 30,
} as const;

function filterAdultList<T extends { isAdult?: boolean }>(
  list: T[] | undefined,
  allowAdult: boolean,
): T[] {
  if (!list?.length) return list ?? [];
  if (allowAdult) return list;
  return list.filter((item) => !item.isAdult);
}

function filterHomePayload<T extends Partial<IAnimeData>>(data: T | undefined, allowAdult: boolean): T | undefined {
  if (!data) return data;
  const next = { ...data };
  for (const key of Object.keys(next) as (keyof T)[]) {
    const value = next[key];
    if (Array.isArray(value) && value[0] && typeof value[0] === "object" && "id" in (value[0] as object)) {
      (next as Record<string, unknown>)[key as string] = filterAdultList(
        value as IAnime[],
        allowAdult,
      );
    }
  }
  return next;
}

const getHomePageData = async () => {
  const res = await api.get("/api/home");
  return res.data.data as IAnimeData;
};

const getHomeCriticalData = async () => {
  const res = await api.get("/api/home?scope=critical");
  return res.data.data as HomeCriticalData;
};

const getHomeDiscoveryData = async () => {
  const res = await api.get("/api/home?scope=discovery");
  return res.data.data as HomeDiscoveryData;
};

export const useGetHomePageData = () => {
  const allowAdult = useSettingsStore((s) => s.showAdultContent);
  const query = useQuery({
    queryFn: getHomePageData,
    queryKey: [GET_HOME_PAGE_DATA],
    ...homeQueryDefaults,
  });
  const data = useMemo(
    () => filterHomePayload(query.data, allowAdult),
    [query.data, allowAdult],
  );
  return { ...query, data };
};

export const useGetHomeCriticalData = (opts?: { enabled?: boolean }) => {
  const allowAdult = useSettingsStore((s) => s.showAdultContent);
  const query = useQuery({
    queryFn: getHomeCriticalData,
    queryKey: [GET_HOME_CRITICAL],
    enabled: opts?.enabled ?? true,
    ...homeQueryDefaults,
  });
  const data = useMemo(() => {
    if (!query.data) return query.data;
    return {
      ...query.data,
      spotlightAnimes: filterAdultList(query.data.spotlightAnimes as IAnime[], allowAdult),
      trendingAnimes: filterAdultList(query.data.trendingAnimes, allowAdult).slice(0, 15),
      latestEpisodeAnimes: filterAdultList(query.data.latestEpisodeAnimes, allowAdult).slice(0, 15),
      recentlyAddedAnimes: filterAdultList(query.data.recentlyAddedAnimes, allowAdult).slice(0, 15),
      currentSeasonAnimes: filterAdultList(query.data.currentSeasonAnimes, allowAdult).slice(0, 18),
    } as HomeCriticalData;
  }, [query.data, allowAdult]);
  return { ...query, data };
};

export const useGetHomeDiscoveryData = (enabledOrOpts: boolean | { enabled?: boolean } = true) => {
  const allowAdult = useSettingsStore((s) => s.showAdultContent);
  const enabled =
    typeof enabledOrOpts === "boolean" ? enabledOrOpts : (enabledOrOpts.enabled ?? true);
  const query = useQuery({
    queryFn: getHomeDiscoveryData,
    queryKey: [GET_HOME_DISCOVERY],
    enabled,
    ...homeQueryDefaults,
  });
  const data = useMemo(() => {
    if (!query.data) return query.data;
    return {
      ...query.data,
      mostFavoriteAnimes: filterAdultList(query.data.mostFavoriteAnimes, allowAdult),
      mostPopularAnimes: filterAdultList(query.data.mostPopularAnimes, allowAdult),
      topRatedAnimes: filterAdultList(query.data.topRatedAnimes, allowAdult),
      latestCompletedAnimes: filterAdultList(query.data.latestCompletedAnimes, allowAdult),
      topUpcomingAnimes: filterAdultList(
        query.data.topUpcomingAnimes as unknown as IAnime[],
        allowAdult,
      ) as typeof query.data.topUpcomingAnimes,
      nextSeasonAnimes: filterAdultList(query.data.nextSeasonAnimes, allowAdult),
    } as HomeDiscoveryData;
  }, [query.data, allowAdult]);
  return { ...query, data };
};
