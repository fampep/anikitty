"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import type { RecommendedAnime } from "@/types/anime-details";

type Props = {
  recommendations: RecommendedAnime[];
  sourceGenres?: string[];
  sourceStudios?: string[];
};

type Bucket = {
  key: string;
  label: string;
  items: RecommendedAnime[];
};

export default function AnimeRecommendationsPanel({
  recommendations,
  sourceGenres = [],
  sourceStudios = [],
}: Props) {
  const t = useT();

  const buckets = useMemo(() => {
    if (recommendations.length === 0) return [] as Bucket[];

    const genreSet = new Set(sourceGenres.map((g) => g.toLowerCase()));
    const studioSet = new Set(sourceStudios.map((s) => s.toLowerCase()));
    const used = new Set<string>();

    const sameStudio: RecommendedAnime[] = [];
    const sameGenre: RecommendedAnime[] = [];
    const popular: RecommendedAnime[] = [];

    for (const rec of recommendations) {
      const studios = (rec.studios ?? []).map((s) => s.toLowerCase());
      const genres = (rec.genres ?? []).map((g) => g.toLowerCase());
      if (studios.some((s) => studioSet.has(s))) {
        sameStudio.push(rec);
        used.add(rec.id);
      } else if (genres.some((g) => genreSet.has(g))) {
        sameGenre.push(rec);
        used.add(rec.id);
      }
    }

    for (const rec of recommendations) {
      if (!used.has(rec.id)) popular.push(rec);
    }

    const result: Bucket[] = [];
    if (sameStudio.length) {
      result.push({
        key: "studio",
        label: t("anime.recommendations.sameStudio"),
        items: sameStudio,
      });
    }
    if (sameGenre.length) {
      result.push({
        key: "genre",
        label: t("anime.recommendations.similarGenre"),
        items: sameGenre,
      });
    }
    if (popular.length || result.length === 0) {
      result.push({
        key: "popular",
        label: t("anime.recommendations.fansAlsoLiked"),
        items: popular.length ? popular : recommendations,
      });
    }
    return result;
  }, [recommendations, sourceGenres, sourceStudios, t]);

  if (recommendations.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("anime.recommendations.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {buckets.map((bucket) => (
        <section key={bucket.key}>
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-4 inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400/70" />
            {bucket.label}
            <span className="text-muted-foreground/50 dark:text-white/15">{bucket.items.length}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {bucket.items.map((item) => (
              <RecCard key={`${bucket.key}-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecCard({ item }: { item: RecommendedAnime }) {
  return (
    <Link
      href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border dark:border-white/8 group-hover:border-white/20 transition-colors bg-muted/30 dark:bg-white/[0.03]">
        {item.poster ? (
          <Image
            src={item.poster}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
            sizes="(max-width: 640px) 45vw, 160px"
          />
        ) : null}
        {item.recommendationRating != null && item.recommendationRating > 0 && (
          <span className="absolute top-1.5 right-1.5 text-[9px] font-mono font-bold tabular-nums bg-black/70 text-amber-200/90 px-1.5 py-0.5 rounded border border-amber-500/20">
            +{item.recommendationRating}
          </span>
        )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-[12px] font-medium text-foreground/85 dark:text-white/80 line-clamp-2 group-hover:text-foreground dark:group-hover:text-white transition-colors">
          {item.name}
        </p>
        <p className={cn("text-[10px] font-mono text-muted-foreground/70 dark:text-white/30 mt-0.5")}>
          {[item.type, item.rating ? `${item.rating}/10` : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
