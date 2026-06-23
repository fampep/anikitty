"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import { Flame, CalendarClock } from "lucide-react";

const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/latest-episodes-section"));
const AnimeSchedule = dynamic(() => import("@/components/anime-schedule"));
const AnimeSections = dynamic(() => import("@/components/anime-sections"));

export default function Home() {
  const { data, isLoading } = useGetHomePageData();

  return (
    <div className="flex flex-col bg-black">
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />

      <LatestEpisodesAnime
        loading={isLoading}
        latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
      />

      <ContinueWatching loading={isLoading} />

      <FeaturedCollection
        loading={isLoading}
        featuredAnime={[
          { title: "Most Favorite", anime: data?.mostFavoriteAnimes as IAnime[] },
          { title: "Most Popular", anime: data?.mostPopularAnimes as IAnime[] },
          { title: "Latest Completed", anime: data?.latestCompletedAnimes as LatestCompletedAnime[] },
        ]}
      />

      <AnimeSections
        title="Trending Anime"
        icon={<Flame className="w-4 h-4" />}
        trendingAnime={data?.trendingAnimes as IAnime[]}
        loading={isLoading}
      />

      <AnimeSchedule />

      <AnimeSections
        title="Upcoming Anime"
        icon={<CalendarClock className="w-4 h-4" />}
        trendingAnime={data?.topUpcomingAnimes as IAnime[]}
        loading={isLoading}
      />
    </div>
  );
}
