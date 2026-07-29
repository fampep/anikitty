"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { Tags } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const QUICK_GENRES = [
  "action",
  "romance",
  "comedy",
  "fantasy",
  "slice-of-life",
  "drama",
  "sci-fi",
  "horror",
  "isekai",
  "shounen",
  "sports",
  "mystery",
] as const;

function genreKey(slug: string) {
  if (slug === "sci-fi") return "sciFi";
  if (slug === "slice-of-life") return "sliceOfLife";
  return slug;
}

export default function HomeGenreBar() {
  const t = useT();

  return (
    <Container className="py-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-0.5">
          <Tags className="w-3.5 h-3.5 text-muted-foreground dark:text-white/30" />
          <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-[0.2em]">
            {t("home.browseByGenre")}
          </p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-momentum">
          {QUICK_GENRES.map((genre) => (
            <Link
              key={genre}
              href={ROUTES.genre(genre)}
              className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/85 hover:border-white/22 hover:bg-accent dark:hover:bg-white/[0.06] transition-all"
            >
              {t(`search.filterGenres.${genreKey(genre)}`)}
            </Link>
          ))}
          <Link
            href={ROUTES.SEARCH}
            className="shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-semibold border border-dashed border-border dark:border-white/12 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 hover:border-border dark:border-white/25 transition-all"
          >
            {t("home.allGenres")}
          </Link>
        </div>
      </div>
    </Container>
  );
}
