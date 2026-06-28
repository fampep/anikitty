import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { EpisodeStreamCapabilities } from "@/lib/stream-capabilities";

const getStreamCapabilities = async (
  anilistId: number,
  episode: string,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> => {
  const res = await api.get("/api/kitty/capabilities", {
    params: {
      anilistId,
      episode,
      ...(title ? { title } : {}),
    },
  });
  return res.data;
};

export const useGetStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  title?: string | null,
) => {
  return useQuery({
    queryKey: ["stream-capabilities", anilistId, episode, title ?? ""],
    queryFn: () => getStreamCapabilities(anilistId!, episode!, title),
    enabled: !!anilistId && !!episode && parseInt(episode, 10) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
