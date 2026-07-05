import { withAuth } from "@/lib/auth/auth-fetch";
import type { IAnime } from "@/types/anime";
import { useQuery } from "@tanstack/react-query";

export type RecommendationsPayload = { data: IAnime[]; hasHistory: boolean };

async function getRecommendations(): Promise<RecommendationsPayload> {
  const res = await fetch("/api/account/recommendations", withAuth());
  if (!res.ok) return { data: [], hasHistory: true };
  const json = (await res.json()) as Partial<RecommendationsPayload>;
  return { data: json.data ?? [], hasHistory: json.hasHistory ?? true };
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
