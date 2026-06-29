import { useQuery } from "react-query";
import { api } from "@/lib/api";
import type { AnimexServerId } from "@/lib/animex-api";
import type { AnimoServerId } from "@/lib/animo-api";
import type { AnimeStreamLocale } from "@/lib/animestream-api";
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
  animexServer?: AnimexServerId | null,
  animoServer?: AnimoServerId | null,
  animestreamLocale?: AnimeStreamLocale | null,
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
      ...(provider === "Animo" && animoServer ? { animoServer } : {}),
      ...(provider === "AnimeStream" && animestreamLocale ? { animestreamLocale } : {}),
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
  animoServer?: AnimoServerId | null,
  animestreamLocale?: AnimeStreamLocale | null,
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
      animoServer ?? "",
      animestreamLocale ?? "",
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
        animoServer,
        animestreamLocale,
      ),
    enabled: !!anilistId && !!episode && parseInt(episode, 10) > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    retry: false,
    keepPreviousData: true,
  });
};
