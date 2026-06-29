"use client";

import dynamic from "next/dynamic";
import Container from "@/components/layout/container";
import { Flame, CalendarClock, TrendingUp } from "lucide-react";
import { useGetHomePageData } from "@/query/home/get-home-page-data";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";

const AnimeSections = dynamic(() => import("@/components/home/anime-sections"), { ssr: false });

export default function TrendingPage() {
  const t = useT();
  const { data, isLoading } = useGetHomePageData();

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <TrendingUp className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            {t("trending.title")}
          </h1>
        </div>
        <p className="text-sm text-white/35 font-mono pl-[3.25rem]">
          {t("trending.subtitle")}
        </p>
      </Container>

      <AnimeSections
        title={t("trending.trendingNow")}
        icon={<Flame className="w-4 h-4" />}
        trendingAnime={data?.trendingAnimes as IAnime[]}
        loading={isLoading}
        showRanks
      />

      <div id="upcoming">
        <AnimeSections
          title={t("trending.upcomingAnime")}
          icon={<CalendarClock className="w-4 h-4" />}
          trendingAnime={data?.topUpcomingAnimes as IAnime[]}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
