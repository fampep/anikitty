"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";

type Props = {
  anime: IAnime[];
  loading?: boolean;
  id?: string;
};

export default function LandingTrendingRow({ anime, loading, id }: Props) {
  const t = useT();
  const items = anime?.slice(0, 8) ?? [];

  if (!loading && items.length === 0) return null;

  return (
    <section id={id} className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-border dark:border-white/[0.06] scroll-mt-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="site-label mb-2">{t("landing.trendingLabel")}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white/90">{t("landing.trendingTitle")}</h2>
          </div>
          <Link
            href={ROUTES.HOME}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground dark:text-white/40 hover:text-foreground/85 dark:text-white/75 transition-colors shrink-0"
          >
            {t("landing.seeAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-momentum snap-x snap-mandatory">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="shrink-0 snap-start w-[110px] sm:w-[128px] aspect-[2/3] rounded-xl bg-muted/50 dark:bg-white/[0.04] animate-pulse" />
              ))
            : items.map((item, index) => (
                <Link
                  key={item.id}
                  href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
                  className="group shrink-0 snap-start w-[110px] sm:w-[128px]"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/[0.08] group-hover:ring-violet-400/35 group-hover:shadow-lg group-hover:shadow-violet-950/30 transition-all duration-300">
                    <span className="absolute top-2 left-2 z-[2] flex h-6 min-w-6 items-center justify-center rounded-md bg-black/70 backdrop-blur-sm px-1.5 text-[10px] font-bold text-foreground dark:text-white/90 ring-1 ring-border dark:ring-white/10">
                      #{index + 1}
                    </span>
                    <Image
                      src={item.poster}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      sizes="128px"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-background/50 dark:via-black/40 to-transparent p-2 pt-8">
                      <p className="text-[10px] font-semibold text-foreground dark:text-white/90 line-clamp-2 leading-snug">{item.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
