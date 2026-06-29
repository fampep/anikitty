"use client";

import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import type { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { SITE_LOGO } from "@/lib/seo/site-seo";
import { Loader2, Plus } from "lucide-react";

type Props = {
  anime: IAnime;
  fetching: boolean;
  onFetch: () => void;
};

export default function DiscoverSubtitleCard({ anime, fetching, onFetch }: Props) {
  const t = useT();

  return (
    <div className="flex flex-col gap-2 w-full max-w-[12.625rem] mx-auto">
      <AnimeCard
        compact
        poster={anime.poster || SITE_LOGO}
        title={anime.name}
        href={`${ROUTES.ANIME_DETAILS}/${anime.id}?tab=subtitles`}
        episodeCard
        sub={anime.episodes?.sub ?? undefined}
        subTitle={t("subsLibrary.notCached")}
        status={anime.status ?? undefined}
        score={anime.score ?? null}
        year={anime.year ?? null}
      />
      <button
        type="button"
        onClick={onFetch}
        disabled={fetching}
        className="inline-flex items-center justify-center gap-1.5 h-7 rounded-lg text-[10px] font-semibold bg-teal-500/12 border border-teal-500/25 text-teal-300 hover:bg-teal-500/20 transition-colors disabled:opacity-50"
      >
        {fetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
        {t("subsLibrary.fetchSubs")}
      </button>
    </div>
  );
}
