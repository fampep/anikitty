"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { HomeSectionLink } from "./home-shared";

type Props = {
  animes: IAnime[];
  loading?: boolean;
};

export default function HomeRecentUpdates({ animes, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-3 py-4">
        <div className="h-7 w-44 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (!animes.length) return null;

  return (
    <Container className="flex flex-col gap-3 select-none">
      <HomeSectionLink title={t("home.recentlyUpdated")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 w-full gap-1 sm:gap-y-4 xl:gap-2">
        {animes.slice(0, 16).map((anime) => {
          const ep = anime.episodes?.sub ?? anime.episodes?.dub ?? 1;
          return (
            <div
              key={anime.id}
              className="home-glass-card flex shrink-0 p-2.5 xl:p-3 rounded-2xl hover:ring-1 hover:ring-violet-400/20"
            >
              <div className="flex flex-col w-full gap-2.5 min-w-0">
                <Link
                  href={`${ROUTES.WATCH}?anime=${anime.id}`}
                  className="flex aspect-video w-full rounded-xl bg-white/8 relative overflow-hidden"
                >
                  <LazyPosterImage
                    src={anime.poster}
                    alt=""
                    sizes="(max-width: 640px) 100vw, 280px"
                    imageClassName="object-cover"
                  />
                  <div className="flex items-center px-2 py-1 max-w-full bg-black/75 rounded-lg gap-1 absolute bottom-1.5 right-1.5">
                    <span className="text-xs font-medium">{t("home.episode", { n: ep })}</span>
                  </div>
                </Link>
                <div className="flex w-full gap-2 min-w-0">
                  <Link
                    href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                    title={anime.name}
                    className="flex size-8 xl:size-9 aspect-square shrink-0 bg-white/10 rounded-full overflow-hidden relative"
                  >
                    <LazyPosterImage src={anime.poster} alt="" sizes="36px" imageClassName="object-cover" />
                  </Link>
                  <Link href={`${ROUTES.WATCH}?anime=${anime.id}`} className="flex flex-col grow gap-1.5 min-w-0">
                    <div className="text-sm font-semibold line-clamp-2 leading-tight hover:opacity-80 transition-opacity">
                      {t("home.episode", { n: ep })}
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-col w-full gap-1 min-w-0">
                      <span className="line-clamp-1 font-medium">{anime.name}</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Container>
  );
}
