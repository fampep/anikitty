"use client";

import Link from "next/link";
import {
  CalendarClock,
  Clapperboard,
  Clock,
  ExternalLink,
  Film,
  Heart,
  Radio,
  Star,
  TrendingUp,
  Tv,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import NextEpisodeCountdown from "@/components/anime/next-episode-countdown";
import type { AnimeExternalLink, AnimeRanking, Info, MoreInfo } from "@/types/anime-details";
import { genres as GENRE_OPTIONS } from "@/constants/search-filters";

const GENRE_SLUGS = new Set(GENRE_OPTIONS.map((g) => g.value));
function genreSearchSlug(genre: string): string | null {
  const slug = genre.toLowerCase().replace(/\s+/g, "-");
  return GENRE_SLUGS.has(slug) ? slug : null;
}

type Props = {
  info: Info;
  moreInfo: MoreInfo;
  episodeCountLabel: string | number | null;
  malContentRating?: string | null;
  malBroadcast?: string | null;
  className?: string;
};

function FactRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "" || value === "N/A") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/60 dark:border-white/[0.06] last:border-0">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-white/35 shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-[12px] text-foreground/85 dark:text-white/75 text-right font-medium leading-snug">
        {value}
      </span>
    </div>
  );
}

function pickRank(rankings: AnimeRanking[] | undefined, type: string): AnimeRanking | null {
  if (!rankings?.length) return null;
  const allTime = rankings.find((r) => r.type === type && r.allTime);
  if (allTime) return allTime;
  return rankings.find((r) => r.type === type) ?? null;
}

export default function AnimeDetailSidePanel({
  info,
  moreInfo,
  episodeCountLabel,
  malContentRating,
  malBroadcast,
  className,
}: Props) {
  const t = useT();
  const stats = info.stats;
  const isAiring = moreInfo.status === "Currently Airing";
  const ratedRank = pickRank(info.rankings, "RATED");
  const popularRank = pickRank(info.rankings, "POPULAR");
  const streamingLinks = (info.externalLinks ?? []).filter(
    (l) => !l.type || l.type === "STREAMING",
  );
  const socialLinks = (info.externalLinks ?? []).filter(
    (l) => l.type === "SOCIAL" || l.type === "INFO",
  );

  return (
    <aside
      className={cn(
        "hidden xl:flex flex-col gap-4 xl:sticky xl:top-[calc(var(--nav-total-height)+0.75rem)] xl:self-start xl:max-h-[calc(100vh-var(--nav-total-height)-1.5rem)] xl:overflow-y-auto scrollbar-hide",
        className,
      )}
    >
      <section className="site-panel p-4">
        <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-2">
          {t("anime.sidePanel.quickFacts")}
        </h3>
        <div>
          <FactRow
            icon={<Film className="w-3 h-3" />}
            label={t("anime.detailFields.type")}
            value={stats?.type}
          />
          <FactRow
            icon={<Tv className="w-3 h-3" />}
            label={t("anime.detailFields.episodes")}
            value={episodeCountLabel}
          />
          <FactRow
            icon={<Clock className="w-3 h-3" />}
            label={t("anime.detailFields.duration")}
            value={moreInfo.duration}
          />
          <FactRow
            icon={isAiring ? <Radio className="w-3 h-3 text-emerald-400" /> : undefined}
            label={t("anime.detailFields.status")}
            value={moreInfo.status}
          />
          <FactRow label={t("anime.detailFields.source")} value={moreInfo.source} />
          <FactRow label={t("anime.detailFields.premiered")} value={moreInfo.premiered} />
          <FactRow label={t("anime.detailFields.aired")} value={moreInfo.aired} />
          <FactRow label={t("anime.studios")} value={moreInfo.studios} />
          <FactRow
            label={t("anime.detailFields.malContentRating")}
            value={malContentRating}
          />
          <FactRow label={t("anime.detailFields.malBroadcast")} value={malBroadcast} />
          {info.countryOfOrigin && (
            <FactRow label={t("anime.detailFields.country")} value={info.countryOfOrigin} />
          )}
        </div>
      </section>

      {(info.stats?.rating && info.stats.rating !== "N/A") ||
      info.popularity != null ||
      info.favourites != null ||
      ratedRank ||
      popularRank ? (
        <section className="site-panel p-4">
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-2">
            {t("anime.sidePanel.scores")}
          </h3>
          <div>
            {info.stats?.rating && info.stats.rating !== "N/A" && (
              <FactRow
                icon={<Star className="w-3 h-3 text-amber-400" />}
                label={t("anime.detailFields.rating")}
                value={info.stats.rating}
              />
            )}
            {ratedRank && (
              <FactRow
                icon={<TrendingUp className="w-3 h-3" />}
                label={t("anime.sidePanel.rank")}
                value={`#${ratedRank.rank.toLocaleString()}`}
              />
            )}
            {popularRank && (
              <FactRow
                icon={<TrendingUp className="w-3 h-3" />}
                label={t("anime.sidePanel.popularityRank")}
                value={`#${popularRank.rank.toLocaleString()}`}
              />
            )}
            {info.popularity != null && (
              <FactRow
                label={t("anime.sidePanel.popularity")}
                value={info.popularity.toLocaleString()}
              />
            )}
            {info.favourites != null && (
              <FactRow
                icon={<Heart className="w-3 h-3 text-rose-400" />}
                label={t("anime.sidePanel.favourites")}
                value={info.favourites.toLocaleString()}
              />
            )}
          </div>
        </section>
      ) : null}

      {info.nextAiringEpisode?.airingAt &&
        info.nextAiringEpisode.airingAt * 1000 > Date.now() && (
          <section className="site-panel p-4 border-primary/20 bg-primary/[0.04]">
            <h3 className="text-[10px] font-mono text-primary/80 uppercase tracking-widest mb-2 inline-flex items-center gap-1.5">
              <CalendarClock className="w-3 h-3" />
              {t("anime.detailFields.upcomingEp")}
            </h3>
            <NextEpisodeCountdown
              airingAt={info.nextAiringEpisode.airingAt}
              episode={info.nextAiringEpisode.episode}
              variant="inline"
              className="text-[13px] text-foreground/90 dark:text-white/85 font-semibold"
            />
          </section>
        )}

      {moreInfo.genres?.length > 0 && (
        <section className="site-panel p-4">
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-3">
            {t("anime.sidePanel.genres")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {moreInfo.genres.map((g) => {
              const slug = genreSearchSlug(g);
              const className =
                "px-2 py-1 text-[10px] rounded-md border border-primary/15 text-zinc-200/60 bg-primary/[0.06] hover:bg-primary/10 hover:text-zinc-100/85 transition-colors";
              return slug ? (
                <Link key={g} href={`${ROUTES.SEARCH}?genres=${slug}`} className={className}>
                  {g}
                </Link>
              ) : (
                <span key={g} className={className}>
                  {g}
                </span>
              );
            })}
          </div>
        </section>
      )}

      {(streamingLinks.length > 0 || socialLinks.length > 0) && (
        <section className="site-panel p-4">
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-3">
            {t("anime.sidePanel.links")}
          </h3>
          <div className="flex flex-col gap-1.5">
            {[...streamingLinks, ...socialLinks].slice(0, 8).map((link) => (
              <ExternalLinkRow key={`${link.site}-${link.url}`} link={link} />
            ))}
          </div>
        </section>
      )}

      {(stats?.episodes?.sub ?? 0) > 0 && (
        <section className="site-panel p-4">
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/35 uppercase tracking-widest mb-2">
            {t("anime.sidePanel.streaming")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border border-teal-500/25 bg-teal-500/10 text-teal-300/90">
              <Clapperboard className="w-3 h-3" />
              {stats.episodes.sub} {t("card.sub")}
            </span>
            {(stats.episodes.dub ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border border-sky-500/25 bg-sky-500/10 text-sky-300/90">
                {stats.episodes.dub} {t("card.dub")}
              </span>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}

function ExternalLinkRow({ link }: { link: AnimeExternalLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[11px] text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white/85 hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors"
    >
      <span className="truncate font-medium">{link.site}</span>
      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
    </a>
  );
}
