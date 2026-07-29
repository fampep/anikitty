"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetHomeCriticalData } from "@/query/home/get-home-page-data";
import { ROUTES } from "@/constants/routes";
import LazyMount from "@/components/shared/lazy-mount";
import LandingHero from "@/components/landing/landing-hero";
import LandingStats from "@/components/landing/landing-stats";
import LandingWatchYourWay from "@/components/landing/landing-watch-your-way";
import LandingTrendingRow from "@/components/landing/landing-trending-row";
import LandingFooter from "@/components/landing/landing-footer";

const LandingFeatures = dynamic(() => import("@/components/landing/landing-features"));
const LandingWhy = dynamic(() => import("@/components/landing/landing-why"));
const LandingPlayerPreview = dynamic(() => import("@/components/landing/landing-player-preview"));
const LandingScheduleStrip = dynamic(() => import("@/components/landing/landing-schedule-strip"));
const LandingSyncStory = dynamic(() => import("@/components/landing/landing-sync-story"));
const LandingPersonalized = dynamic(() => import("@/components/landing/landing-personalized"));
const LandingSearchDemo = dynamic(() => import("@/components/landing/landing-search-demo"));
const LandingCommunity = dynamic(() => import("@/components/landing/landing-community"));
const LandingFaq = dynamic(() => import("@/components/landing/landing-faq"));
const LandingTestimonials = dynamic(() => import("@/components/landing/landing-testimonials"));
const LandingSupportPerks = dynamic(() => import("@/components/landing/landing-support-perks"));
const LandingFinalCta = dynamic(() => import("@/components/landing/landing-final-cta"));

export default function LandingPage() {
  const router = useRouter();
  const { data: homeData, isLoading: homeLoading } = useGetHomeCriticalData();
  const spotlight = homeData?.spotlightAnimes?.[0] ?? null;

  useEffect(() => {
    router.prefetch(ROUTES.HOME);
    router.prefetch(ROUTES.SEARCH);
    router.prefetch(ROUTES.TRENDING);
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#09090b] text-white overflow-x-hidden flex flex-col">
      <LandingHero poster={spotlight?.poster ?? null} />
      <LandingStats />
      <LandingWatchYourWay />
      <LandingTrendingRow anime={homeData?.trendingAnimes ?? []} loading={homeLoading} />

      <LazyMount keepMounted minHeight={280} rootMargin="400px 0px">
        <LandingScheduleStrip />
      </LazyMount>

      <LazyMount keepMounted minHeight={420} rootMargin="400px 0px">
        <LandingFeatures />
      </LazyMount>

      <LazyMount keepMounted minHeight={380} rootMargin="400px 0px">
        <LandingWhy />
      </LazyMount>

      <LazyMount keepMounted minHeight={480} rootMargin="400px 0px">
        <LandingPlayerPreview />
      </LazyMount>

      <LazyMount keepMounted minHeight={320} rootMargin="400px 0px">
        <LandingSyncStory />
      </LazyMount>

      <LazyMount keepMounted minHeight={320} rootMargin="400px 0px">
        <LandingPersonalized />
      </LazyMount>

      <LazyMount keepMounted minHeight={400} rootMargin="400px 0px">
        <LandingSearchDemo />
      </LazyMount>

      <LazyMount keepMounted minHeight={320} rootMargin="400px 0px">
        <LandingCommunity />
      </LazyMount>

      <LazyMount keepMounted minHeight={360} rootMargin="400px 0px">
        <LandingFaq />
      </LazyMount>

      <LazyMount keepMounted minHeight={280} rootMargin="400px 0px">
        <LandingTestimonials />
      </LazyMount>

      <LazyMount keepMounted minHeight={360} rootMargin="400px 0px">
        <LandingSupportPerks />
      </LazyMount>

      <LazyMount keepMounted minHeight={220} rootMargin="360px 0px">
        <LandingFinalCta />
      </LazyMount>

      <LandingFooter />
    </div>
  );
}
