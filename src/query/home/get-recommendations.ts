import { withAuth } from "@/lib/auth/auth-fetch";
import type { IAnime } from "@/types/anime";
import { useQuery } from "@tanstack/react-query";

async function getRecommendations(): Promise<IAnime[]> {
  const res = await fetch("/api/account/recommendations", withAuth());
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: IAnime[] };
  return json.data ?? [];
}

export const useGetRecommendations = (enabled: boolean) =>
  useQuery({
    queryKey: ["home-recommendations"],
    queryFn: getRecommendations,
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
