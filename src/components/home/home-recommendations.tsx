"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
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

  if (!auth) return null;

  const items = data?.data ?? [];

  // New user with no watch history yet — nudge them to start watching.
  if (!isLoading && data && !data.hasHistory) {
    return (
      <Container className="py-8">
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.04] px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground dark:text-white">{t("home.recommendedForYou")}</p>
            <p className="text-xs text-muted-foreground dark:text-white/45 mt-0.5">{t("home.recommendationsHint")}</p>
          </div>
          <Link
            href={ROUTES.TRENDING}
            className="shrink-0 inline-flex items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-xs font-semibold text-violet-100 hover:bg-violet-500/25 transition-colors"
          >
            {t("home.recommendationsCta")}
          </Link>
        </div>
      </Container>
    );
  }

  // Has history but nothing to show (e.g. AniList unavailable) — hide entirely.
  if (!isLoading && items.length === 0) return null;

  return (
    <AnimeSections
      sectionId="recommended-for-you"
      title={t("home.recommendedForYou")}
      icon={<Sparkles className="w-4 h-4" />}
      trendingAnime={items as IAnime[]}
      loading={isLoading}
      layout="row"
    />
  );
}
