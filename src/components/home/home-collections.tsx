"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  Film,
  Flame,
  Gem,
  Heart,
  Layers,
  Sparkles,
  Swords,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CURATED_COLLECTIONS } from "@/lib/discovery/collections";
import { useT } from "@/providers/i18n-provider";
import { HomeSectionLink } from "./home-shared";

const ICONS: Record<string, typeof Sparkles> = {
  "best-of-2026": Flame,
  "award-winners": Award,
  "beginner-friendly": Sparkles,
  "dark-fantasy": Swords,
  "best-romance": Heart,
  "movies-under-2-hours": Film,
  "long-running": Layers,
  "hidden-gems": Gem,
  "based-on-visual-novels": BookOpen,
  "based-on-manga": BookOpen,
};

export default function HomeCollections() {
  const t = useT();

  return (
    <Container id="collections" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.COLLECTIONS}
        title={t("home.popularCollections")}
        icon={<Sparkles className="w-4 h-4" />}
        compact
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {CURATED_COLLECTIONS.slice(0, 8).map(({ slug, title, accent }) => {
          const Icon = ICONS[slug] ?? Sparkles;
          return (
            <Link
              key={slug}
              href={ROUTES.collection(slug)}
              className={`group relative overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] px-3.5 py-4 transition-colors hover:border-border dark:hover:border-white/20 hover:bg-muted/50 dark:hover:bg-white/[0.06]`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-80`} />
              <div className="relative flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-foreground/70 dark:text-white/70 shrink-0" aria-hidden />
                <span className="text-sm font-semibold text-foreground dark:text-white/90 line-clamp-2">
                  {title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </Container>
  );
}
