import { useQuery } from "react-query";
import { api } from "@/lib/core/api";
import type {
  EpisodeStreamCapabilities,
  StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities";

const getStreamCapabilities = async (
  anilistId: number,
  episode: string,
  target: StreamCapabilityTarget,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> => {
  const res = await api.get("/api/kitty/capabilities", {
    params: {
      anilistId,
      episode,
      provider: target.provider,
      ...(target.miruroPipe ? { miruroPipe: target.miruroPipe } : {}),
      ...(target.animexServer ? { animexServer: target.animexServer } : {}),
      ...(target.animoServer ? { animoServer: target.animoServer } : {}),
      ...(title ? { title } : {}),
    },
  });
  return res.data;
};

export const useGetStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  target: StreamCapabilityTarget | undefined,
  title?: string | null,
) => {
  return useQuery({
    queryKey: [
      "stream-capabilities",
      anilistId,
      episode,
      title ?? "",
      target?.provider,
      target?.miruroPipe ?? "",
      target?.animexServer ?? "",
      target?.animoServer ?? "",
    ],
    queryFn: () => getStreamCapabilities(anilistId!, episode!, target!, title),
    enabled:
      !!anilistId &&
      !!episode &&
      parseInt(episode, 10) > 0 &&
      !!target?.provider,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};
