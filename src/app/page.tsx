"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import { Flame, CalendarDays, CalendarClock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import Container from "@/components/container";

const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/latest-episodes-section"));
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
        showRanks
        layout="row"
        seeAllHref={ROUTES.TRENDING}
      />

      {/* Quick links to dedicated pages */}
      <Container className="py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href={ROUTES.SCHEDULE}
            className="group flex items-center justify-between px-5 py-4 rounded-xl bg-white/4 border border-white/10 hover:bg-white/7 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
              <div>
                <p className="text-sm font-semibold text-white/75 group-hover:text-white/95 transition-colors">
                  Weekly Schedule
                </p>
                <p className="text-[11px] text-white/30 font-mono">See what&apos;s airing this week</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href={ROUTES.TRENDING}
            className="group flex items-center justify-between px-5 py-4 rounded-xl bg-white/4 border border-white/10 hover:bg-white/7 hover:border-white/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <CalendarClock className="w-5 h-5 text-white/40 group-hover:text-white/70 transition-colors" />
              <div>
                <p className="text-sm font-semibold text-white/75 group-hover:text-white/95 transition-colors">
                  Upcoming Anime
                </p>
                <p className="text-[11px] text-white/30 font-mono">Browse what&apos;s coming soon</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
