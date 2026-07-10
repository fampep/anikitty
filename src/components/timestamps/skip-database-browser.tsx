"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Film,
  Loader2,
  Play,
  Search,
  SkipForward,
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
      <Image
        src={src}
        alt={alt}
        width={48}
        height={68}
        unoptimized
        className={cn("rounded-md object-cover bg-muted/40 dark:bg-white/5 border border-border/60 dark:border-white/10", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-md bg-muted/50 dark:bg-white/[0.04] border border-border/60 dark:border-white/10 flex items-center justify-center",
        className,
      )}
    >
      <Film className="w-4 h-4 text-muted-foreground/50 dark:text-white/20" />
    </div>
  );
}

function EpisodeRow({
  ep,
  mode,
  posterUrl,
  animeTitle,
}: {
  ep: SkipDatabaseEpisode;
  mode: Tab;
  posterUrl?: string | null;
  animeTitle: string;
}) {
  const t = useT();
  const thumb = ep.episodeThumbnail ?? posterUrl;

  return (
    <div className="flex gap-3 px-3 py-2.5 rounded-xl border border-border/80 dark:border-white/8 bg-muted/20 dark:bg-white/[0.02]">
      <PosterThumb
        src={thumb}
        alt={ep.episodeTitle ?? `${animeTitle} episode ${ep.episode}`}
        className="w-10 h-14 shrink-0"
      />

      <div className="min-w-0 flex-1 flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold font-mono text-foreground dark:text-white/85 tabular-nums">
                {t("timestamps.episode", { n: ep.episode })}
              </span>
              {mode === "pending" && (
                <span className="text-[9px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-amber-500/12 border border-amber-400/25 text-amber-300">
                  {t("timestamps.pendingBadge")}
                </span>
              )}
            </div>
            {ep.episodeTitle && (
              <p className="text-sm font-medium text-foreground/90 dark:text-white/80 leading-snug line-clamp-2 mt-0.5">
                {ep.episodeTitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {ep.submitterUsername && (
              <Link
                href={ROUTES.profile(ep.submitterUsername)}
                className="text-[10px] font-mono text-muted-foreground dark:text-white/40 hover:text-sky-300 transition-colors truncate max-w-[100px]"
              >
                @{ep.submitterUsername}
              </Link>
            )}
            <Link
              href={ep.watchUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border border-sky-500/25 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15 transition-colors"
            >
              <Play className="w-3 h-3" />
              {t("timestamps.watch")}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="rounded-lg border border-border/60 dark:border-white/6 bg-black/20 px-2.5 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground dark:text-white/35 mb-0.5">
              {t("skipSubmit.intro")}
            </p>
            <p className={cn("tabular-nums", ep.hasIntro ? "text-sky-300/90" : "text-white/25")}>
              {ep.introLabel ?? "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border/60 dark:border-white/6 bg-black/20 px-2.5 py-1.5">
            <p className="text-[9px] uppercase tracking-wide text-muted-foreground dark:text-white/35 mb-0.5">
              {t("skipSubmit.outro")}
            </p>
            <p className={cn("tabular-nums", ep.hasOutro ? "text-violet-300/90" : "text-white/25")}>
              {ep.outroLabel ?? "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnimeGroupCard({
  group,
  mode,
  defaultOpen,
}: {
  group: SkipDatabaseAnimeGroup;
  mode: Tab;
  defaultOpen?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <article className="rounded-2xl border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 text-left hover:bg-muted/40 dark:hover:bg-white/[0.03] transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground dark:text-white/40" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground dark:text-white/40" />
        )}

        <PosterThumb
          src={group.posterUrl}
          alt={group.animeTitle}
          className="w-11 h-[3.75rem] shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm sm:text-base font-semibold text-foreground dark:text-white leading-snug line-clamp-2">
            {group.animeTitle}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground dark:text-white/35 mt-0.5">
            {t("timestamps.episodeCount", { count: group.episodes.length })}
          </p>
        </div>

        <Link
          href={group.episodes[0]?.animeUrl ?? `/anime/${group.anilistId}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-mono text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 border border-border dark:border-white/10"
        >
          <ExternalLink className="w-3 h-3" />
          <span className="hidden sm:inline">{t("timestamps.animePage")}</span>
        </Link>
      </button>

      {open && (
        <div className="px-3 pb-3 flex flex-col gap-2">
          {group.episodes.map((ep) => (
            <EpisodeRow
              key={`${group.anilistId}-${ep.episode}`}
              ep={ep}
              mode={mode}
              posterUrl={group.posterUrl}
              animeTitle={group.animeTitle}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default function SkipDatabaseBrowser() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("live");
  const [query, setQuery] = useState("");
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

  const groups = useMemo(() => {
    const source = tab === "live" ? data?.live ?? [] : data?.pending ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (g) =>
        g.animeTitle.toLowerCase().includes(q) ||
        String(g.anilistId).includes(q) ||
        g.episodes.some((ep) => ep.episodeTitle?.toLowerCase().includes(q)),
    );
  }, [data, tab, query]);

  return (
    <Container className="mt-16 sm:mt-20 pb-16 max-w-4xl">
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">
              {t("timestamps.title")}
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/45 mt-0.5">
              {t("timestamps.subtitle")}
            </p>
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: t("timestamps.statLive"), value: data.stats.liveEpisodes, accent: "text-sky-300" },
              { label: t("timestamps.statAnime"), value: data.stats.liveAnime, accent: "text-violet-300" },
              { label: t("timestamps.statPending"), value: data.stats.pendingEpisodes, accent: "text-amber-300" },
              { label: t("timestamps.statPendingAnime"), value: data.stats.pendingAnime, accent: "text-rose-300" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-3 py-2"
              >
                <p className={cn("text-lg font-bold tabular-nums", s.accent)}>{s.value}</p>
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4">
        <div className="inline-flex rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-1">
          <button
            type="button"
            onClick={() => setTab("live")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "live"
                ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/25"
                : "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <SkipForward className="w-3.5 h-3.5" />
              {t("timestamps.tabLive")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              tab === "pending"
                ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25"
                : "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t("timestamps.tabPending")}
            </span>
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-white/30" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("timestamps.searchPlaceholder")}
            className="w-full rounded-xl pl-9 pr-3 py-2 text-sm bg-muted/40 dark:bg-white/[0.04] border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground dark:text-white/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">{t("timestamps.loadFailed")}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 text-xs font-semibold text-sky-300 hover:text-sky-200"
          >
            {t("timestamps.retry")}
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] px-6 py-14 text-center">
          <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">
            {tab === "live" ? t("timestamps.emptyLive") : t("timestamps.emptyPending")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group, i) => (
            <AnimeGroupCard
              key={`${tab}-${group.anilistId}`}
              group={group}
              mode={tab}
              defaultOpen={i < 3 && !query.trim()}
            />
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
        {t("timestamps.footerHint")}
      </p>
    </Container>
  );
}
