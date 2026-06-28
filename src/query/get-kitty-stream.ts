import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { MiruroPipeProviderId } from "@/lib/miruro-api";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty-providers";

export type { KittyProvider };
export { KITTY_PROVIDERS, DEFAULT_KITTY_PROVIDER };

export interface KittyTrack {
  file: string;
  kind: string;
  label: string;
  default?: boolean;
}

export interface KittySkipTimes {
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface KittyStreamResponse {
  file: string;
  headers: Record<string, string>;
  tracks: KittyTrack[];
  skipTimes?: KittySkipTimes;
  miruroPipe?: string;
  server?: string | null;
  download?: string | null;
  subtitleSource?: string;
  error?: string;
}

const getKittyStream = async (
  anilistId: number,
  episode: string,
  audio: "sub" | "dub",
  provider: KittyProvider,
  miruroPipe?: MiruroPipeProviderId | null,
  title?: string | null,
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: {
      anilistId,
      episode,
      audio,
      provider,
      ...(title ? { title } : {}),
      ...(provider === "Miruro" && miruroPipe ? { miruroPipe } : {}),
    },
  });
  return res.data;
};

export const useGetKittyStream = (
  anilistId: number | undefined,
  episode: string | undefined,
  audio: "sub" | "dub" = "sub",
  provider: KittyProvider = DEFAULT_KITTY_PROVIDER,
  miruroPipe?: MiruroPipeProviderId | null,
  title?: string | null,
) => {
  return useQuery({
    queryKey: ["kitty-stream", anilistId, episode, audio, provider, miruroPipe ?? "", title ?? ""],
    queryFn: () => getKittyStream(anilistId!, episode!, audio, provider, miruroPipe, title),
    enabled: !!anilistId && !!episode && parseInt(episode) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
};
