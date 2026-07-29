"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import type { HomeStudio } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type Props = {
  studios: HomeStudio[];
  loading?: boolean;
};

export default function HomeFeaturedStudios({ studios, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-3 py-2">
        <div className="h-7 w-40 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 h-20 w-40 rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (!studios.length) return null;

  return (
    <Container id="studios" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.SEARCH}
        title={t("home.featuredStudios")}
        icon={<Building2 className="w-4 h-4" />}
        compact
      />
      {studios.length ? (
        <HomeScrollRail>
          {studios.map((studio) => (
            <Link
              key={studio.id}
              href={ROUTES.studio(studio.id)}
              className="home-glass-card shrink-0 w-[10.5rem] sm:w-[12rem] rounded-xl border border-border/50 dark:border-white/[0.08] px-4 py-4 transition-colors hover:border-border dark:hover:border-white/20"
            >
              <p className="text-sm font-semibold text-foreground dark:text-white/90 line-clamp-2 leading-snug">
                {studio.name}
              </p>
              {studio.favourites != null ? (
                <p className="mt-2 text-[10px] font-mono text-muted-foreground dark:text-white/35 tabular-nums">
                  {studio.favourites.toLocaleString()} ★
                </p>
              ) : null}
            </Link>
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
