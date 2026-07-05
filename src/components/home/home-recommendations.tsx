"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useGetRecommendations } from "@/query/home/get-recommendations";
import { useT } from "@/providers/i18n-provider";
import type { IAnime } from "@/types/anime";

const AnimeSections = dynamic(() => import("@/components/home/anime-sections"));

/** "Recommended for you" — personalized from the viewer's watch history. */
export default function HomeRecommendations() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { data, isLoading } = useGetRecommendations(Boolean(auth));

  // Hide entirely for guests or when there's nothing to recommend yet.
  if (!auth) return null;
  if (!isLoading && (!data || data.length === 0)) return null;

  return (
    <AnimeSections
      sectionId="recommended-for-you"
      title={t("home.recommendedForYou")}
      icon={<Sparkles className="w-4 h-4" />}
      trendingAnime={(data ?? []) as IAnime[]}
      loading={isLoading}
      layout="row"
    />
  );
}
