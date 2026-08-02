"use client";

import Link from "next/link";
import {
  Award,
  BookOpen,
  Clock,
  Flame,
  Gem,
  Heart,
  Layers,
  Sparkles,
  Swords,
  Film,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CURATED_COLLECTIONS } from "@/lib/discovery/collections";
import { useT } from "@/providers/i18n-provider";
import { DiscoveryHero } from "@/components/discovery/discovery-shared";
import { CollectionsBrowser } from "@/components/collections/collections-browser";

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

export default function CollectionsIndexPage() {
  const t = useT();

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={t("discovery.collections.title")}
        subtitle={t("discovery.collections.subtitle")}
      />
      <h2 className="mb-3 text-sm font-semibold text-foreground dark:text-white/80">
        {t("discovery.collections.curatedHeading")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CURATED_COLLECTIONS.map((c) => {
          const Icon = ICONS[c.slug] ?? Clock;
          return (
            <Link
              key={c.slug}
              href={ROUTES.collection(c.slug)}
              className={`group relative overflow-hidden rounded-2xl border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] p-5 transition-colors hover:border-border dark:hover:border-white/20`}
            >
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-80`} />
              <div className="relative">
                <Icon className="h-5 w-5 text-foreground/70 dark:text-white/70 mb-3" />
                <h2 className="text-base font-semibold text-foreground dark:text-white/90">{c.title}</h2>
                <p className="mt-1.5 text-xs text-muted-foreground dark:text-white/45 leading-relaxed line-clamp-3">
                  {c.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-10 text-sm font-semibold text-foreground dark:text-white/80">
        {t("discovery.collections.communityHeading")}
      </h2>
      <CollectionsBrowser />
    </Container>
  );
}
