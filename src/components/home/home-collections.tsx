"use client";

import Link from "next/link";
import {
  Flame,
  Ghost,
  Heart,
  Laugh,
  Rocket,
  Sparkles,
  Swords,
  Wand2,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { HomeSectionLink } from "./home-shared";

const COLLECTIONS = [
  { slug: "action", icon: Swords, accent: "from-rose-500/25 to-transparent" },
  { slug: "romance", icon: Heart, accent: "from-pink-500/25 to-transparent" },
  { slug: "comedy", icon: Laugh, accent: "from-amber-500/25 to-transparent" },
  { slug: "fantasy", icon: Wand2, accent: "from-emerald-500/25 to-transparent" },
  { slug: "sci-fi", icon: Rocket, accent: "from-sky-500/25 to-transparent" },
  { slug: "horror", icon: Ghost, accent: "from-violet-500/20 to-transparent" },
  { slug: "isekai", icon: Sparkles, accent: "from-cyan-500/20 to-transparent" },
  { slug: "shounen", icon: Flame, accent: "from-orange-500/25 to-transparent" },
] as const;

function genreKey(slug: string) {
  if (slug === "sci-fi") return "sciFi";
  if (slug === "slice-of-life") return "sliceOfLife";
  return slug;
}

export default function HomeCollections() {
  const t = useT();

  return (
    <Container id="collections" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.SEARCH}
        title={t("home.popularCollections")}
        icon={<Sparkles className="w-4 h-4" />}
        compact
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        {COLLECTIONS.map(({ slug, icon: Icon, accent }) => (
          <Link
            key={slug}
            href={`${ROUTES.SEARCH}?genres=${slug}`}
            className={`group relative overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] px-3.5 py-4 transition-colors hover:border-border dark:hover:border-white/20 hover:bg-muted/50 dark:hover:bg-white/[0.06]`}
          >
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-80`} />
            <div className="relative flex items-center gap-2.5">
              <Icon className="h-4 w-4 text-foreground/70 dark:text-white/70" aria-hidden />
              <span className="text-sm font-semibold text-foreground dark:text-white/90">
                {t(`search.filterGenres.${genreKey(slug)}`)}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </Container>
  );
}
