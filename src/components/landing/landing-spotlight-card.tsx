"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import type { SpotlightAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { trackEvent } from "@/lib/analytics";

type Props = {
  anime?: SpotlightAnime | null;
  loading?: boolean;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export default function LandingSpotlightCard({ anime, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <section className="relative z-10 px-4 sm:px-6 md:px-12 pb-4">
        <div className="max-w-6xl mx-auto">
          <div className="h-[168px] sm:h-[180px] rounded-2xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/[0.06] animate-pulse" />
        </div>
      </section>
    );
  }

  if (!anime) return null;

  const description = stripHtml(anime.description ?? "").slice(0, 140);
  const epCount = anime.episodes?.sub ?? anime.episodes?.dub;
  const watchHref = `${ROUTES.WATCH}?anime=${encodeURIComponent(anime.id)}`;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 pb-2 sm:pb-4">
      <div className="max-w-6xl mx-auto">
        <div className="group relative overflow-hidden rounded-2xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] backdrop-blur-sm">
          <div className="absolute inset-0 pointer-events-none">
            <Image
              src={anime.poster}
              alt=""
              fill
              className="object-cover opacity-25 saturate-[0.7] blur-sm scale-110"
              sizes="(max-width: 768px) 100vw, 1152px"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/92 to-[#0a0a0f]/70" />
          </div>

          <div className="relative flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5">
            <div className="relative shrink-0 w-[88px] sm:w-[104px] aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/15 shadow-2xl shadow-black/50 mx-auto sm:mx-0">
              <Image
                src={anime.poster}
                alt={anime.name}
                fill
                className="object-cover"
                sizes="104px"
                unoptimized
              />
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-[10px] font-semibold uppercase tracking-wider text-violet-200/90">
                <Sparkles className="w-3 h-3" />
                {t("landing.spotlightLabel")}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground dark:text-white/95 mb-1.5 line-clamp-1">{anime.name}</h2>
              {epCount ? (
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 mb-1.5">
                  {epCount} eps
                  {anime.episodes?.sub && anime.episodes?.dub ? " · Sub & Dub" : anime.episodes?.dub ? " · Dub" : " · Sub"}
                </p>
              ) : null}
              {description ? (
                <p className="text-[12px] sm:text-[13px] text-muted-foreground dark:text-white/45 leading-relaxed line-clamp-2 mb-4 max-w-xl mx-auto sm:mx-0">
                  {description}
                  {description.length >= 140 ? "…" : ""}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Link
                  href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                  onClick={() => trackEvent("landing_spotlight_details")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border dark:border-white/12 bg-muted/50 dark:bg-white/[0.04] text-xs font-semibold text-muted-foreground dark:text-white/70 hover:text-foreground dark:hover:text-white hover:border-border dark:hover:border-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/30"
                >
                  {t("landing.spotlightDetails")}
                </Link>
                <Link
                  href={watchHref}
                  onClick={() => trackEvent("landing_spotlight_watch")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {t("landing.spotlightWatch")}
                  <ArrowRight className="w-3.5 h-3.5 opacity-60" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
