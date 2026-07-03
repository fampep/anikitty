"use client";

import dynamic from "next/dynamic";
import Container from "@/components/layout/container";
import { Flame, CalendarClock, TrendingUp } from "lucide-react";
import {
  useGetHomeCriticalData,
  useGetHomeDiscoveryData,
} from "@/query/home/get-home-page-data";
import { IAnime, LatestCompletedAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { useEffect, useState } from "react";

const AnimeSections = dynamic(() => import("@/components/home/anime-sections"), { ssr: false });
const FeaturedCollection = dynamic(() => import("@/components/home/featured-collection"));

export default function TrendingPage() {
  const t = useT();
  const [discoveryEnabled, setDiscoveryEnabled] = useState(false);
  const { data: critical, isLoading: criticalLoading } = useGetHomeCriticalData();
  const { data: discovery, isLoading: discoveryLoading } = useGetHomeDiscoveryData(discoveryEnabled);

  useEffect(() => {
    if (critical) setDiscoveryEnabled(true);
  }, [critical]);

  const isLoading = criticalLoading;
  const discoveryPending = discoveryEnabled && discoveryLoading && !discovery;

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
        trendingAnime={critical?.trendingAnimes as IAnime[]}
        loading={isLoading}
        showRanks
      />

      <FeaturedCollection
        sectionId="featured"
        loading={discoveryPending || isLoading}
        featuredAnime={[
          { title: t("home.mostFavorite"), anime: discovery?.mostFavoriteAnimes as IAnime[] },
          { title: t("home.mostPopular"), anime: discovery?.mostPopularAnimes as IAnime[] },
          { title: t("home.latestCompleted"), anime: discovery?.latestCompletedAnimes as LatestCompletedAnime[] },
        ]}
      />

      <div id="upcoming">
        <AnimeSections
          title={t("trending.upcomingAnime")}
          icon={<CalendarClock className="w-4 h-4" />}
          trendingAnime={discovery?.topUpcomingAnimes as IAnime[]}
          loading={discoveryPending || isLoading}
        />
      </div>
    </div>
  );
}
