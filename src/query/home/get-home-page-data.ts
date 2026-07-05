import { GET_HOME_CRITICAL, GET_HOME_DISCOVERY, GET_HOME_PAGE_DATA } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { HomeCriticalData, HomeDiscoveryData } from "@/lib/core/home-data";
import { IAnimeData } from "@/types/anime";
import { useQuery } from "@tanstack/react-query";

const homeQueryDefaults = {
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: 1000 * 60 * 10,
  gcTime: 1000 * 60 * 30,
} as const;

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
  return useQuery({
    queryFn: getHomePageData,
    queryKey: [GET_HOME_PAGE_DATA],
    ...homeQueryDefaults,
  });
};

export const useGetHomeCriticalData = () => {
  return useQuery({
    queryFn: getHomeCriticalData,
    queryKey: [GET_HOME_CRITICAL],
    ...homeQueryDefaults,
  });
};

export const useGetHomeDiscoveryData = (enabled = true) => {
  return useQuery({
    queryFn: getHomeDiscoveryData,
    queryKey: [GET_HOME_DISCOVERY],
    enabled,
    ...homeQueryDefaults,
  });
};
