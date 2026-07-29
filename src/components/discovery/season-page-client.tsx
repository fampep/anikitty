"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import {
  getAniListSeason,
  getNextAniListSeason,
  getPrevAniListSeason,
  parseSeasonParam,
  seasonLabel,
} from "@/lib/home/season";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import {
  AnimeGrid,
  DiscoveryHero,
  DiscoverySection,
  MetaChip,
} from "@/components/discovery/discovery-shared";
import type { SeasonHubPayload } from "@/lib/discovery/hubs";
import { cn } from "@/lib/core/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function SeasonPageClient({
  season: seasonParam,
  year: yearParam,
}: {
  season: string;
  year: string;
}) {
  const t = useT();
  const adult = useSettingsStore((s) => s.showAdultContent);
  const parsed = parseSeasonParam(seasonParam);
  const yearNum = parseInt(yearParam, 10);
  const fallback = getAniListSeason();
  const season = parsed ?? fallback.season;
  const year = !isNaN(yearNum) ? yearNum : fallback.year;

  const prev = getPrevAniListSeason(season, year);
  const next = getNextAniListSeason(season, year);

  const [data, setData] = useState<SeasonHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"airing" | "upcoming" | "completed" | "delayed" | "schedule">("airing");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/season/${season.toLowerCase()}/${year}${adult ? "?adult=1" : ""}`,
        );
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [season, year, adult]);

  const tabs = [
    { id: "airing" as const, label: t("discovery.season.currentlyAiring"), count: data?.currentlyAiring.length },
    { id: "upcoming" as const, label: t("discovery.season.upcoming"), count: data?.upcoming.length },
    { id: "completed" as const, label: t("discovery.season.completed"), count: data?.completed.length },
    { id: "delayed" as const, label: t("discovery.season.delayed"), count: data?.delayed.length },
    { id: "schedule" as const, label: t("discovery.season.weeklySchedule") },
  ];

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={`${seasonLabel(season)} ${year}`}
        subtitle={t("discovery.season.subtitle")}
        meta={
          data ? (
            <>
              <MetaChip>
                {t("discovery.season.airingCount", { count: data.currentlyAiring.length })}
              </MetaChip>
              <MetaChip>
                {t("discovery.season.upcomingCount", { count: data.upcoming.length })}
              </MetaChip>
            </>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={ROUTES.season(prev.season, prev.year)}
              className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-white/12 px-3 py-1.5 text-xs hover:bg-white/5"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {seasonLabel(prev.season)} {prev.year}
            </Link>
            <Link
              href={ROUTES.season(next.season, next.year)}
              className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-white/12 px-3 py-1.5 text-xs hover:bg-white/5"
            >
              {seasonLabel(next.season)} {next.year}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-8">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === tabItem.id
                ? "border-white/25 bg-white/10 text-white"
                : "border-border dark:border-white/12 text-muted-foreground hover:bg-white/5",
            )}
          >
            {tabItem.label}
            {tabItem.count != null ? ` (${tabItem.count})` : ""}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && data && tab !== "schedule" && (
        <AnimeGrid
          items={
            tab === "airing"
              ? data.currentlyAiring
              : tab === "upcoming"
                ? data.upcoming
                : tab === "completed"
                  ? data.completed
                  : data.delayed
          }
          empty={t("discovery.empty")}
        />
      )}

      {!loading && data && tab === "schedule" && (
        <div className="space-y-6">
          {data.weeklySchedule.map((day) => (
            <div key={day.weekday}>
              <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35 mb-3">
                {day.label}
                <span className="ml-2 text-white/20">{day.items.length}</span>
              </h3>
              {day.items.length === 0 ? (
                <p className="text-xs text-muted-foreground/60 mb-2">—</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {day.items.map((anime) => (
                    <Link
                      key={anime.id}
                      href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                      className="flex items-center gap-2.5 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-2 pr-3 hover:border-white/20 transition-colors w-full sm:w-auto sm:min-w-[14rem]"
                    >
                      <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md">
                        {anime.poster && (
                          <Image src={anime.poster} alt={anime.name} fill className="object-cover" unoptimized sizes="36px" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium line-clamp-1">{anime.name}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">
                          {anime.airingAt
                            ? new Date(anime.airingAt * 1000).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : anime.type}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && data && (
        <div className="mt-12">
          <DiscoverySection title={t("discovery.season.trending")} count={data.trending.length}>
            <AnimeGrid items={data.trending} />
          </DiscoverySection>
        </div>
      )}
    </Container>
  );
}
