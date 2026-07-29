"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { HomeScrollRail } from "@/components/home/home-shared";

type Props = {
  anime: IAnime[];
  loading?: boolean;
};

export default function LandingTrendingRow({ anime, loading }: Props) {
  const t = useT();
  const items = anime?.slice(0, 8) ?? [];

  if (!loading && items.length === 0) return null;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-14 sm:py-16 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div className="max-w-lg">
            <p className="site-label mb-2">{t("landing.trendingLabel")}</p>
            <h2 className="text-xl sm:text-2xl font-bold text-white/90 mb-2">
              {t("landing.trendingTitle")}
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              {t("landing.discoverDesc")}
            </p>
          </div>
          <Link
            href={ROUTES.TRENDING}
            prefetch
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/40 hover:text-white/75 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-md px-1"
          >
            {t("landing.seeAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <HomeScrollRail edgeFade={false}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-[110px] sm:w-[128px] aspect-[2/3] rounded-xl bg-white/[0.04] animate-pulse"
                />
              ))
            : items.map((item) => (
                <Link
                  key={item.id}
                  href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
                  className="group shrink-0 w-[110px] sm:w-[128px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl"
                  aria-label={item.name}
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/[0.08] group-hover:ring-primary/30 transition-all duration-300">
                    <Image
                      src={item.poster}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      sizes="128px"
                      unoptimized
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-8">
                      <p className="text-[10px] font-semibold text-white/90 line-clamp-2 leading-snug">
                        {item.name}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
        </HomeScrollRail>
      </div>
    </section>
  );
}
