"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import {
  Flame,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import Container from "@/components/container";

const HeroSection = dynamic(() => import("@/components/hero-section"));
const LatestEpisodesAnime = dynamic(() => import("@/components/latest-episodes-section"));
const AnimeSections = dynamic(() => import("@/components/anime-sections"));
const LatestComments = dynamic(() => import("@/components/latest-comments"));

export default function Home() {
  const { data, isLoading } = useGetHomePageData();

  return (
    <div className="flex flex-col bg-black">
      {/* ── Act 1: Discovery ── */}
      <HeroSection
        spotlightAnime={data?.spotlightAnimes as SpotlightAnime[]}
        isDataLoading={isLoading}
      />

      <LatestEpisodesAnime
        loading={isLoading}
        latestEpisodes={data?.latestEpisodeAnimes as LatestCompletedAnime[]}
      />

      <ContinueWatching loading={isLoading} />

      {/* ── Act 2: Browse ── */}
      <FeaturedCollection
        loading={isLoading}
        featuredAnime={[
          { title: "Most Favorite", anime: data?.mostFavoriteAnimes as IAnime[] },
          { title: "Most Popular", anime: data?.mostPopularAnimes as IAnime[] },
          { title: "Latest Completed", anime: data?.latestCompletedAnimes as LatestCompletedAnime[] },
        ]}
      />

      <AnimeSections
        title="Trending Now"
        icon={<Flame className="w-4 h-4" />}
        trendingAnime={data?.trendingAnimes as IAnime[]}
        loading={isLoading}
        showRanks
        layout="row"
        seeAllHref={ROUTES.TRENDING}
      />

      {/* ── Act 3: Community & Explore ── */}
      <Container className="py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-start">
          {/* Left: Latest Comments */}
          <LatestComments bare />

          {/* Right: Explore */}
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">
              Explore
            </p>

            <ExploreCard
              href={ROUTES.SCHEDULE}
              icon={<CalendarDays className="w-5 h-5" />}
              title="Weekly Schedule"
              description="See what's airing this week"
              accent="from-sky-500/10"
            />

            <ExploreCard
              href={ROUTES.TRENDING}
              icon={<CalendarClock className="w-5 h-5" />}
              title="Upcoming Anime"
              description="Browse what's coming soon"
              accent="from-violet-500/10"
            />

            <ExploreCard
              href={ROUTES.TRENDING}
              icon={<Sparkles className="w-5 h-5" />}
              title="Trending Now"
              description="What everyone is watching"
              accent="from-amber-500/10"
            />

            <ExploreCard
              href={ROUTES.SEARCH}
              icon={<Clock className="w-5 h-5" />}
              title="Browse All Anime"
              description="Search through thousands of titles"
              accent="from-emerald-500/10"
            />
          </div>
        </div>
      </Container>
    </div>
  );
}

function ExploreCard({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/3 border border-white/8 hover:bg-white/6 hover:border-white/16 transition-all duration-200 overflow-hidden`}
    >
      {/* Accent gradient on hover */}
      <div className={`absolute inset-0 bg-gradient-to-r ${accent} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative flex items-center gap-3">
        <span className="text-white/35 group-hover:text-white/70 transition-colors">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-white/70 group-hover:text-white/95 transition-colors leading-tight">
            {title}
          </p>
          <p className="text-[11px] text-white/28 font-mono mt-0.5">{description}</p>
        </div>
      </div>
      <ArrowRight className="relative w-4 h-4 text-white/20 group-hover:text-white/55 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
