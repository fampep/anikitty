import { useQuery } from "react-query";
import { api } from "@/lib/core/api";
import type { AnimexServerId } from "@/lib/providers/animex-api";
import type { AnisnatchServerId } from "@/lib/providers/anisnatch-api";
import type { LunarServerId } from "@/lib/providers/lunar-api";
import type { AnimoServerId } from "@/lib/providers/animo-api";
import type { MiruroPipeProviderId } from "@/lib/providers/miruro-api";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDERS,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";

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
  animexServer?: AnimexServerId | null,
  anisnatchServer?: AnisnatchServerId | null,
  lunarServer?: LunarServerId | null,
  animoServer?: AnimoServerId | null,
): Promise<KittyStreamResponse> => {
  const res = await api.get("/api/kitty/stream", {
    params: {
      anilistId,
      episode,
      audio,
      provider,
      ...(title ? { title } : {}),
      ...(provider === "Miruro" && miruroPipe ? { miruroPipe } : {}),
      ...(provider === "Animex" && animexServer ? { animexServer } : {}),
      ...(provider === "AniSnatch" && anisnatchServer ? { anisnatchServer } : {}),
      ...(provider === "Lunar" && lunarServer ? { lunarServer } : {}),
      ...(provider === "Animo" && animoServer ? { animoServer } : {}),
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
  animexServer?: AnimexServerId | null,
  anisnatchServer?: AnisnatchServerId | null,
  lunarServer?: LunarServerId | null,
  animoServer?: AnimoServerId | null,
) => {
  return useQuery({
    queryKey: [
      "kitty-stream",
      anilistId,
      episode,
      audio,
      provider,
      miruroPipe ?? "",
      animexServer ?? "",
      anisnatchServer ?? "",
      lunarServer ?? "",
      animoServer ?? "",
      title ?? "",
    ],
    queryFn: () =>
      getKittyStream(
        anilistId!,
        episode!,
        audio,
        provider,
        miruroPipe,
        title,
        animexServer,
        anisnatchServer,
        lunarServer,
        animoServer,
      ),
    enabled: !!anilistId && !!episode && parseInt(episode, 10) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    keepPreviousData: true,
  });
};
