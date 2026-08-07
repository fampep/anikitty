"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetHomeCriticalData, useGetHomeDiscoveryData } from "@/query/home/get-home-page-data";
import { ROUTES } from "@/constants/routes";
import LazyMount from "@/components/shared/lazy-mount";
import LandingHero from "@/components/landing/landing-hero";
import LandingStats from "@/components/landing/landing-stats";
import LandingWatchYourWay from "@/components/landing/landing-watch-your-way";
import LandingTrendingRow from "@/components/landing/landing-trending-row";
import LandingCompletedRow from "@/components/landing/landing-completed-row";
import LandingFooter from "@/components/landing/landing-footer";

const LandingFeatures = dynamic(() => import("@/components/landing/landing-features"));
const LandingPlayerPreview = dynamic(() => import("@/components/landing/landing-player-preview"));
const LandingScheduleStrip = dynamic(() => import("@/components/landing/landing-schedule-strip"));
const LandingSyncStory = dynamic(() => import("@/components/landing/landing-sync-story"));
const LandingSearchDemo = dynamic(() => import("@/components/landing/landing-search-demo"));
const LandingCommunity = dynamic(() => import("@/components/landing/landing-community"));
const LandingFaq = dynamic(() => import("@/components/landing/landing-faq"));
const LandingSupportPerks = dynamic(() => import("@/components/landing/landing-support-perks"));
const LandingFinalCta = dynamic(() => import("@/components/landing/landing-final-cta"));

const LANDING_HASH_IDS = new Set(["features", "support"]);

export default function LandingPage() {
  const router = useRouter();
  const { data: homeData, isLoading: homeLoading } = useGetHomeCriticalData();
  const { data: discoveryData, isLoading: discoveryLoading } = useGetHomeDiscoveryData();
  const spotlight = homeData?.spotlightAnimes?.[0] ?? null;

  useEffect(() => {
    router.prefetch(ROUTES.HOME);
    router.prefetch(ROUTES.SEARCH);
    router.prefetch(ROUTES.TRENDING);
  }, [router]);

  // One-shot hash scroll, then clear — sticky #features/#support + LazyMount
  // remounts were yanking scroll back up (same class of bug as home quick nav).
  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash || !LANDING_HASH_IDS.has(hash)) return;

    const apply = () => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "/");
    };

    // Target wrappers are always in the DOM; children may still be lazy.
    requestAnimationFrame(apply);
  }, []);

  return (
    <div className="landing-console relative min-h-screen bg-[#050507] text-white overflow-x-hidden flex flex-col">
      <LandingHero poster={spotlight?.poster ?? null} />
      <LandingStats />
      <LazyMount keepMounted retainMinHeight minHeight={460} rootMargin="350px 0px">
        <LandingPlayerPreview />
      </LazyMount>
      <LandingWatchYourWay />
      <LandingTrendingRow anime={homeData?.trendingAnimes ?? []} loading={homeLoading} />
      <LazyMount keepMounted retainMinHeight minHeight={280} rootMargin="350px 0px">
        <LandingScheduleStrip />
      </LazyMount>
      <LandingCompletedRow anime={discoveryData?.latestCompletedAnimes ?? []} loading={discoveryLoading} />

      <LazyMount
        id="features"
        keepMounted
        retainMinHeight
        minHeight={420}
        rootMargin="400px 0px"
        className="scroll-mt-20"
      >
        <LandingFeatures />
      </LazyMount>

      <LazyMount keepMounted retainMinHeight minHeight={360} rootMargin="400px 0px">
        <LandingSearchDemo />
      </LazyMount>

      <LazyMount keepMounted retainMinHeight minHeight={360} rootMargin="400px 0px">
        <LandingSupportPerks />
      </LazyMount>

      <LazyMount keepMounted retainMinHeight minHeight={360} rootMargin="400px 0px">
        <LandingFaq />
      </LazyMount>

      <LandingCommunity />

      <LazyMount keepMounted retainMinHeight minHeight={320} rootMargin="400px 0px">
        <LandingSyncStory />
      </LazyMount>

      <LazyMount keepMounted retainMinHeight minHeight={260} rootMargin="400px 0px">
        <LandingFinalCta />
      </LazyMount>

      <LandingFooter />
    </div>
  );
}
