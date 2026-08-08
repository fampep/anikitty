"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  Film,
  Loader2,
  Play,
  Search,
  Timer,
} from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import type {
  SkipDatabaseAnimeGroup,
  SkipDatabaseEpisode,
  SkipDatabasePayload,
} from "@/lib/skip/community-skip-server";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Tab = "live" | "pending";

const PAGE_SIZE = 24;

function PosterThumb({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- many tiny thumbs; native lazy is cheaper than next/image
      <img
        src={src}
        alt={alt}
        width={56}
        height={80}
        loading="lazy"
        decoding="async"
        className={cn("rounded-xl object-cover bg-zinc-900/80", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-xl bg-zinc-900/80 flex items-center justify-center text-white/20",
        className,
      )}
    >
      <Film className="w-4 h-4" />
    </div>
  );
}

function TimeChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | null;
  tone: "intro" | "outro" | "recap" | "preview" | "none";
}) {
  const has = !!value;
  return (
    <span
      className={cn(
        "timestamp-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-mono tabular-nums border",
        has
          ? tone === "intro"
            ? "border-teal-500/25 bg-teal-500/10 text-teal-200/90 timestamp-chip--intro"
            : tone === "recap"
              ? "border-sky-500/25 bg-sky-500/10 text-sky-200/90 timestamp-chip--recap"
              : tone === "preview"
                ? "border-violet-500/25 bg-violet-500/10 text-violet-200/90 timestamp-chip--preview"
                : tone === "none"
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-200/90 timestamp-chip--none"
                  : "border-zinc-500/30 bg-zinc-500/10 text-zinc-200/85 timestamp-chip--outro"
          : "border-white/8 bg-white/[0.02] text-white/25 timestamp-chip--empty",
      )}
    >
      <span className="text-[9px] uppercase tracking-wider opacity-70">{label}</span>
      {value ?? "—"}
    </span>
  );
}

const EpisodeRow = memo(function EpisodeRow({
  ep,
  mode,
}: {
  ep: SkipDatabaseEpisode;
  mode: Tab;
}) {
  const t = useT();

  return (
    <div className="timestamp-episode-row flex gap-3 rounded-2xl px-3 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold font-mono text-white/85 tabular-nums">
                {t("timestamps.episode", { n: ep.episode })}
              </span>
              {mode === "pending" && (
                <span className="text-[9px] font-mono uppercase tracking-wide text-amber-200/80">
                  {t("timestamps.pendingBadge")}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {ep.submitterUsername ? (
              <Link
                href={ROUTES.profile(ep.submitterUsername)}
                className="text-[10px] font-mono text-white/35 hover:text-teal-300 transition-colors truncate max-w-[7rem]"
              >
                @{ep.submitterUsername}
              </Link>
            ) : null}
            <Link
              href={ep.watchUrl}
              className="timestamp-watch-link inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold text-white/80 transition-colors"
            >
              <Play className="w-3 h-3" />
              {t("timestamps.watch")}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(ep.segments?.length
            ? ep.segments
            : [
                ...(ep.hasIntro
                  ? [{ type: "intro", label: "OP", rangeLabel: ep.introLabel, noSegment: false }]
                  : []),
                ...(ep.hasOutro
                  ? [{ type: "credits", label: "ED", rangeLabel: ep.outroLabel, noSegment: false }]
                  : []),
              ]
          ).map((seg) => (
            <TimeChip
              key={`${ep.episode}-${seg.type}-${seg.rangeLabel}`}
              label={
                seg.type === "intro"
                  ? "OP"
                  : seg.type === "credits"
                    ? "ED"
                    : seg.type === "recap"
                      ? "Recap"
                      : seg.type === "preview"
                        ? "Prev"
                        : seg.label
              }
              value={seg.noSegment ? "None" : seg.rangeLabel}
              tone={
                seg.noSegment
                  ? "none"
                  : seg.type === "intro"
                    ? "intro"
                    : seg.type === "recap"
                      ? "recap"
                      : seg.type === "preview"
                        ? "preview"
                        : "outro"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const AnimeGroup = memo(function AnimeGroup({
  group,
  mode,
  index,
}: {
  group: SkipDatabaseAnimeGroup;
  mode: Tab;
  index: number;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const episodeCount = group.episodes.length;
  const firstEpisode = group.episodes[0];
  const liveCount = group.episodes.filter((ep) => ep.hasIntro || ep.hasOutro || ep.segments?.length).length;

  return (
    <article
      className="timestamp-anime-card group relative isolate overflow-hidden rounded-[1.35rem] border border-border/60 bg-card/70 dark:border-white/[0.08] dark:bg-[#0b0b0b]"
      style={{ ["--genre-index" as string]: index }}
    >
      {group.posterUrl ? (
        <span
          className="timestamp-anime-card__art"
          style={{ ["--timestamp-poster" as string]: `url("${group.posterUrl}")` }}
          aria-hidden
        />
      ) : (
        <span className="timestamp-anime-card__wash" aria-hidden />
      )}
      <span className="timestamp-anime-card__scrim" aria-hidden />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative z-[2] w-full flex items-center gap-3 p-3 text-left transition-colors sm:p-4"
        aria-expanded={open}
      >
        <PosterThumb
          src={group.posterUrl}
          alt={group.animeTitle}
          className="w-14 h-20 shrink-0 shadow-lg shadow-black/40 ring-1 ring-white/10"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] sm:text-base font-semibold text-white leading-snug line-clamp-2 tracking-tight">
            {group.animeTitle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-white/42">
            <span className="timestamp-mini-pill">
              {t("timestamps.episodeCount", { count: episodeCount })}
            </span>
            <span className="timestamp-mini-pill">
              {liveCount} {mode === "live" ? t("timestamps.tabLive") : t("timestamps.tabPending")}
            </span>
          </div>
        </div>
        <Link
          href={firstEpisode?.animeUrl ?? `/anime/${group.anilistId}`}
          className="timestamp-anime-card__details hidden items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-white/55 transition-colors hover:text-white sm:inline-flex"
          onClick={(e) => e.stopPropagation()}
        >
          {t("timestamps.animePage")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-white/30 transition-transform duration-200",
            open && "rotate-180 text-white/55",
          )}
        />
      </button>

      {open ? (
        <div className="relative z-[2] space-y-2 px-3 pb-4 sm:px-4">
          <div className="flex items-center gap-3">
            <Link
              href={group.episodes[0]?.animeUrl ?? `/anime/${group.anilistId}`}
              className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[11px] font-mono text-white/45 transition-colors hover:border-teal-300/25 hover:text-teal-300"
            >
              {t("timestamps.animePage")}
            </Link>
          </div>
          {group.episodes.map((ep) => (
            <EpisodeRow
              key={`${group.anilistId}-${ep.episode}`}
              ep={ep}
              mode={mode}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
});

export default function SkipDatabaseBrowser() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("live");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SkipDatabasePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/kitty/skip-database");
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, deferredQuery]);

  const groups = useMemo(() => {
    const source = tab === "live" ? data?.live ?? [] : data?.pending ?? [];
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (g) =>
        g.animeTitle.toLowerCase().includes(q) ||
        String(g.anilistId).includes(q),
    );
  }, [data, tab, deferredQuery]);

  const visibleGroups = useMemo(
    () => groups.slice(0, visibleCount),
    [groups, visibleCount],
  );
  const hasMore = visibleCount < groups.length;

  return (
    <div className="timestamps-page relative min-h-[70vh]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="timestamps-page__glow timestamps-page__glow--top" />
        <div className="timestamps-page__glow timestamps-page__glow--side" />
      </div>

      <Container className="pt-[calc(var(--nav-total-height)+1.5rem)] pb-[calc(var(--mobile-nav-total)+3rem)] sm:pb-20">
        <header className="timestamp-hero mb-5 rounded-[1.7rem] border border-border/60 p-5 dark:border-white/[0.08] sm:p-7">
          <p className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
            <Timer className="h-3.5 w-3.5" />
            AniKitty
          </p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white leading-[1.05] sm:text-5xl">
            {t("timestamps.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/58 sm:text-base">
            {t("timestamps.subtitle")}
          </p>

          {data ? (
            <p className="mt-5 text-[12px] font-mono text-white/35 tabular-nums">
              <span className="text-teal-300/80">{data.stats.liveEpisodes}</span>
              {" "}{t("timestamps.statLiveShort")}
              <span className="mx-2 text-white/15">·</span>
              <span className="text-white/60">{data.stats.liveAnime}</span>
              {" "}{t("timestamps.statAnimeShort")}
              {data.stats.pendingEpisodes > 0 ? (
                <>
                  <span className="mx-2 text-white/15">·</span>
                  <span className="text-amber-200/70">{data.stats.pendingEpisodes}</span>
                  {" "}{t("timestamps.statPendingShort")}
                </>
              ) : null}
            </p>
          ) : null}

          <p className="mt-4 text-sm text-white/40 leading-relaxed max-w-lg">
            {t("timestamps.howToContribute")}
          </p>
        </header>

        <div className="timestamp-toolbar sticky top-[calc(var(--nav-total-height)+0.35rem)] z-20 mb-4 rounded-[1.15rem] border border-border/60 bg-background/[0.88] p-2 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#090909]/[0.88]">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="timestamp-tabs inline-flex gap-1 rounded-full border border-border/55 bg-muted/35 p-1 text-sm dark:border-white/[0.08] dark:bg-black/35">
              <button
                type="button"
                onClick={() => setTab("live")}
                className={cn(
                  "rounded-full px-3 py-1.5 font-semibold transition-colors",
                  tab === "live"
                    ? "text-white bg-white/10"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {t("timestamps.tabLive")}
              </button>
              <button
                type="button"
                onClick={() => setTab("pending")}
                className={cn(
                  "rounded-full px-3 py-1.5 font-semibold transition-colors",
                  tab === "pending"
                    ? "text-white bg-white/10"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {t("timestamps.tabPending")}
              </button>
            </div>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("timestamps.searchPlaceholder")}
                className="site-focus h-10 w-full rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-3 text-sm text-white placeholder:text-white/30 transition-colors focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/35">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : !data ? (
          <div className="py-20 text-center">
            <Timer className="w-8 h-8 mx-auto mb-3 text-white/20" />
            <p className="text-sm text-white/40">{t("timestamps.loadFailed")}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-3 text-sm font-medium text-teal-300 hover:text-teal-200 transition-colors"
            >
              {t("timestamps.retry")}
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
              {tab === "live" ? t("timestamps.emptyLive") : t("timestamps.emptyPending")}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleGroups.map((group, index) => (
              <AnimeGroup
                key={`${tab}-${group.anilistId}`}
                group={group}
                mode={tab}
                index={index}
              />
            ))}
            {hasMore ? (
              <div className="pt-3 pb-2 flex justify-center lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-teal-300/90 transition-colors hover:border-teal-300/25 hover:bg-teal-300/10 hover:text-teal-200"
                >
                  {t("timestamps.showMore", {
                    remaining: groups.length - visibleCount,
                  })}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </Container>
    </div>
  );
}
