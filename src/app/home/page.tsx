"use client";

import ContinueWatching from "@/components/continue-watching";
import FeaturedCollection from "@/components/featured-collection";
import { useGetHomePageData } from "@/query/get-home-page-data";
import { IAnime, LatestCompletedAnime, SpotlightAnime } from "@/types/anime";
import dynamic from "next/dynamic";
import React from "react";
import {
  Flame,
  CalendarDays,
  CalendarClock,
  ArrowRight,
  Sparkles,
  Clock,
  Compass,
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
      <Container className="py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Left: Latest Comments */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:p-6">
            <LatestComments bare />
          </div>

          {/* Right: Explore */}
          <div className="flex flex-col gap-3 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 px-1">
              <Compass className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
                Explore
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <ExploreCard
                href={ROUTES.SCHEDULE}
                icon={<CalendarDays className="w-4 h-4" />}
                title="Schedule"
                description="What's airing this week"
                color="sky"
              />
              <ExploreCard
                href={ROUTES.TRENDING}
                icon={<CalendarClock className="w-4 h-4" />}
                title="Upcoming"
                description="Coming soon"
                color="violet"
              />
              <ExploreCard
                href={ROUTES.TRENDING}
                icon={<Sparkles className="w-4 h-4" />}
                title="Trending"
                description="What everyone is watching"
                color="amber"
              />
              <ExploreCard
                href={ROUTES.SEARCH}
                icon={<Clock className="w-4 h-4" />}
                title="Browse All"
                description="Search thousands of titles"
                color="emerald"
              />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

const COLOR_MAP: Record<string, { icon: string; bg: string; border: string }> = {
  sky:     { icon: "text-sky-400",     bg: "group-hover:bg-sky-500/[0.07]",     border: "group-hover:border-sky-500/25" },
  violet:  { icon: "text-violet-400",  bg: "group-hover:bg-violet-500/[0.07]",  border: "group-hover:border-violet-500/25" },
  amber:   { icon: "text-amber-400",   bg: "group-hover:bg-amber-500/[0.07]",   border: "group-hover:border-amber-500/25" },
  emerald: { icon: "text-emerald-400", bg: "group-hover:bg-emerald-500/[0.07]", border: "group-hover:border-emerald-500/25" },
};

function ExploreCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.sky;
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.025] border border-white/8 ${c.bg} ${c.border} hover:translate-x-0.5 transition-all duration-200`}
    >
      <span className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.04] text-white/40 transition-colors group-hover:bg-white/[0.07] ${c.icon}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors leading-tight truncate">
          {title}
        </p>
        <p className="text-[11px] text-white/25 font-mono mt-0.5 truncate">{description}</p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}
