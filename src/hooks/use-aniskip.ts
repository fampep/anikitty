import { useQuery } from "@tanstack/react-query";
import { clientApiHeaders } from "@/lib/security/anti-scrape";

export interface SkipInterval {
  start: number; // seconds
  end: number;
}

export interface SkipTimes {
  intro?: SkipInterval;
  outro?: SkipInterval;
}

/** Approved AniKitty community skip times only (no third-party APIs). */
export function useCommunitySkipTimes(anilistId?: number, episodeNumber?: number) {
  return useQuery<SkipTimes>({
    queryKey: ["community-skip", anilistId, episodeNumber],
    queryFn: async () => {
      const params = new URLSearchParams({
        anilistId: String(anilistId),
        episode: String(episodeNumber),
      });
      const res = await fetch(`/api/kitty/community-skip?${params}`, {
        headers: clientApiHeaders(),
      });
      if (!res.ok) return {};
      return res.json() as Promise<SkipTimes>;
    },
    enabled: !!anilistId && !!episodeNumber,
    staleTime: Infinity,
    retry: false,
  });
}
