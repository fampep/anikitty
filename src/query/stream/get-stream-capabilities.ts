import { useQuery } from "react-query";
import { api } from "@/lib/core/api";
import type {
  EpisodeStreamCapabilities,
  StreamCapabilityTarget,
} from "@/lib/kitty/stream-capabilities";

const getEpisodeStreamCapabilities = async (
  anilistId: number,
  episode: string,
  title?: string | null,
): Promise<EpisodeStreamCapabilities> => {
  const res = await api.get("/api/kitty/capabilities", {
    params: {
      anilistId,
      episode,
      scope: "episode",
      ...(title ? { title } : {}),
    },
  });
  return res.data;
};

const getActiveProviderStreamCapabilities = async (
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
      ...(target.anisnatchServer ? { anisnatchServer: target.anisnatchServer } : {}),
      ...(target.lunarServer ? { lunarServer: target.lunarServer } : {}),
      ...(target.allanimeMirror ? { allanimeMirror: target.allanimeMirror } : {}),
      ...(target.mkissaMirror ? { mkissaMirror: target.mkissaMirror } : {}),
      ...(target.animoServer ? { animoServer: target.animoServer } : {}),
      ...(title ? { title } : {}),
    },
  });
  return res.data;
};

/** Probe sub/dub for every provider on the current episode. */
export const useGetStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  title?: string | null,
) => {
  return useQuery({
    queryKey: ["stream-capabilities", "episode", anilistId, episode, title ?? ""],
    queryFn: () => getEpisodeStreamCapabilities(anilistId!, episode!, title),
    enabled: !!anilistId && !!episode && parseInt(episode, 10) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/** Probe one active provider (legacy / targeted refresh). */
export const useGetActiveProviderStreamCapabilities = (
  anilistId: number | undefined,
  episode: string | undefined,
  target: StreamCapabilityTarget | undefined,
  title?: string | null,
) => {
  return useQuery({
    queryKey: [
      "stream-capabilities",
      "provider",
      anilistId,
      episode,
      title ?? "",
      target?.provider,
      target?.miruroPipe ?? "",
      target?.animexServer ?? "",
      target?.anisnatchServer ?? "",
      target?.lunarServer ?? "",
      target?.allanimeMirror ?? "",
      target?.mkissaMirror ?? "",
      target?.animoServer ?? "",
    ],
    queryFn: () => getActiveProviderStreamCapabilities(anilistId!, episode!, target!, title),
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
