"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
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
        className={cn("rounded object-cover bg-zinc-900/80", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded bg-zinc-900/80 flex items-center justify-center text-white/20",
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
  tone: "intro" | "outro";
}) {
  const has = !!value;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-mono tabular-nums border",
        has
          ? tone === "intro"
            ? "border-teal-500/25 bg-teal-500/10 text-teal-200/90"
            : "border-zinc-500/30 bg-zinc-500/10 text-zinc-200/85"
          : "border-white/8 bg-white/[0.02] text-white/25",
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
    <div className="flex gap-3 py-2.5 border-t border-white/[0.06] first:border-t-0">
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
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white transition-colors"
            >
              <Play className="w-3 h-3" />
              {t("timestamps.watch")}
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <TimeChip label="OP" value={ep.introLabel} tone="intro" />
          <TimeChip label="ED" value={ep.outroLabel} tone="outro" />
        </div>
      </div>
    </div>
  );
});

const AnimeGroup = memo(function AnimeGroup({
  group,
  mode,
}: {
  group: SkipDatabaseAnimeGroup;
  mode: Tab;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const episodeCount = group.episodes.length;

  return (
    <article className="border-b border-white/[0.07] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 py-4 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <PosterThumb
          src={group.posterUrl}
          alt={group.animeTitle}
          className="w-12 h-[4.25rem] shrink-0 shadow-lg shadow-black/40"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] sm:text-base font-semibold text-white leading-snug line-clamp-2 tracking-tight">
            {group.animeTitle}
          </p>
          <p className="text-[11px] font-mono text-white/35 mt-1">
            {t("timestamps.episodeCount", { count: episodeCount })}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-white/30 transition-transform duration-200",
            open && "rotate-180 text-white/55",
          )}
        />
      </button>

      {open ? (
        <div className="pb-4 pl-0 sm:pl-[3.75rem]">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={group.episodes[0]?.animeUrl ?? `/anime/${group.anilistId}`}
              className="text-[11px] font-mono text-white/40 hover:text-teal-300 transition-colors"
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
    <div className="relative min-h-[70vh]">
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(45,212,191,0.12),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_90%_20%,rgba(251,146,60,0.06),transparent_50%)]" />
      </div>

      <Container className="pt-20 sm:pt-24 pb-[calc(var(--mobile-nav-total)+3rem)] sm:pb-20 max-w-3xl">
        <header className="mb-10 sm:mb-12">
          <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-teal-300/70 mb-3">
            AniKitty
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.05]">
            {t("timestamps.title")}
          </h1>
          <p className="mt-3 text-base sm:text-lg text-white/50 max-w-xl leading-relaxed">
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

        <div className="sticky top-[calc(var(--nav-total-height)+0.35rem)] z-20 -mx-4 px-4 py-2 mb-2 backdrop-blur-md bg-background/80 border-b border-white/[0.06] sm:mx-0 sm:px-0">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="inline-flex gap-1 text-sm">
              <button
                type="button"
                onClick={() => setTab("live")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-medium transition-colors",
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
                  "px-3 py-1.5 rounded-md font-medium transition-colors",
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
                className="w-full rounded-md pl-9 pr-3 py-2 text-sm bg-white/[0.04] border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20 transition-colors"
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
          <div>
            {visibleGroups.map((group) => (
              <AnimeGroup
                key={`${tab}-${group.anilistId}`}
                group={group}
                mode={tab}
              />
            ))}
            {hasMore ? (
              <div className="pt-6 pb-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="text-sm font-medium text-teal-300/90 hover:text-teal-200 transition-colors"
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
