"use client";

import dynamic from "next/dynamic";
import Container from "@/components/layout/container";
import { Sparkles, Tv2 } from "lucide-react";
import { useGetHomeCriticalData } from "@/query/home/get-home-page-data";
import { IAnime, LatestCompletedAnime } from "@/types/anime";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
const LatestEpisodesAnime = dynamic(() => import("@/components/home/latest-episodes-section"));
const AnimeSections = dynamic(() => import("@/components/home/anime-sections"), { ssr: false });

export default function NewReleasesPage() {
  const t = useT();
  const { data, isLoading } = useGetHomeCriticalData();

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
          <Tv2 className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
            {t("new.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/35 font-mono pl-[3.25rem]">
          {t("new.subtitle")}
        </p>
      </Container>

      <LatestEpisodesAnime
        loading={isLoading}
        latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
      />

      <AnimeSections
        sectionId="recently-added"
        title={t("home.recentlyAdded")}
        icon={<Sparkles className="w-4 h-4" />}
        trendingAnime={data?.recentlyAddedAnimes as IAnime[]}
        loading={isLoading}
        layout="row"
        seeAllHref={ROUTES.SEARCH}
      />
    </div>
  );
}
