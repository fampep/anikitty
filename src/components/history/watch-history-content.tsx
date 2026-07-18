"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { History, Loader2, Play, Clock, RotateCcw } from "lucide-react";
import Container from "@/components/layout/container";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const PAGE_SIZE = 24;

type HistoryItem = {
  animeId: string;
  episodeId: string;
  episodeNumber: number | null;
  currentTime: number;
  duration: number;
  language: string;
  lastUpdated: string | null;
  anime: {
    title?: { english?: string | null; romaji?: string | null };
    cover_image?: { large?: string | null; extra_large?: string | null };
  } | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function pct(current: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.min(100, Math.round((current / duration) * 100));
}

export default function WatchHistoryContent() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(
    async (offset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setError(false);
      }
      try {
        const res = await fetch(
          `/api/account/watch/continue?latestPerAnime=false&limit=${PAGE_SIZE}&offset=${offset}`,
          withAuth(),
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        const rows: HistoryItem[] = data.data ?? [];
        setItems((prev) => (append ? [...prev, ...rows] : rows));
        setHasMore(rows.length === PAGE_SIZE);
      } catch {
        if (!append) setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (auth) load(0, false);
    else setLoading(false);
  }, [auth, load]);

  const title = (it: HistoryItem) =>
    it.anime?.title?.english || it.anime?.title?.romaji || it.animeId;

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
          <History className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
            {t("history.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/35 font-mono ml-[1.375rem] pl-8 mb-10 max-w-2xl leading-relaxed">
          {t("history.subtitle")}
        </p>

        {!auth ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-6 px-5 rounded-2xl bg-gradient-to-r from-white/[0.03] to-zinc-500/[0.04] border border-border dark:border-white/8">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <History className="w-5 h-5 text-muted-foreground/70 dark:text-white/25 shrink-0" />
              <p className="text-sm text-muted-foreground dark:text-white/45">{t("history.signIn")}</p>
            </div>
            <LoginPopoverButton />
          </div>
        ) : loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[76px] rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/6 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <History className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
            <p className="text-sm text-red-400/80 font-mono">{t("history.loadError")}</p>
            <button
              onClick={() => load(0, false)}
              className="px-4 py-1.5 rounded-lg border border-border dark:border-white/10 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/60 text-xs font-semibold transition-colors"
            >
              {t("history.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 px-6 text-center rounded-2xl border border-dashed border-border dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.015]">
            <div className="w-14 h-14 rounded-2xl bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/[0.08] flex items-center justify-center">
              <History className="w-6 h-6 text-muted-foreground/70 dark:text-white/20" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground dark:text-white/35 font-medium">{t("history.empty")}</p>
              <Link href={ROUTES.TRENDING} className="text-xs text-zinc-400/80 hover:text-zinc-300 mt-1 inline-block">
                {t("history.emptyCta")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => {
                const progress = pct(it.currentTime, it.duration);
                const finished = progress >= 90;
                const poster = it.anime?.cover_image?.large || it.anime?.cover_image?.extra_large || "";
                const href = `${ROUTES.WATCH}?anime=${encodeURIComponent(it.animeId)}&episode=${encodeURIComponent(it.episodeId)}${it.currentTime > 10 && !finished ? `&t=${Math.floor(it.currentTime)}` : ""}`;
                return (
                  <Link
                    key={`${it.animeId}-${it.episodeId}-${i}`}
                    href={href}
                    className="group flex items-center gap-3.5 p-2.5 rounded-xl border border-border dark:border-white/[0.06] bg-muted/30 dark:bg-white/[0.02] hover:bg-muted/50 dark:hover:bg-white/[0.04] hover:border-border dark:hover:border-white/12 transition-colors"
                  >
                    <div className="relative w-24 sm:w-28 aspect-video shrink-0 rounded-lg overflow-hidden bg-black/40 ring-1 ring-white/8">
                      {poster ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                      {/* progress bar */}
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-black/50">
                        <div
                          className={cn("h-full", finished ? "bg-emerald-400" : "bg-primary")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground dark:text-white/90 truncate">
                        {title(it)}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {it.episodeNumber != null && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-300/80">
                            {t("history.episode", { n: it.episodeNumber })}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-muted/60 dark:bg-white/6 border border-border dark:border-white/8 text-muted-foreground dark:text-white/40 uppercase">
                          {it.language}
                        </span>
                        {finished ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-300/80">
                            {t("history.finished")}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-primary/10 border border-primary/20 text-zinc-300/80">
                            {t("history.percentWatched", { p: progress })}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 dark:text-white/25">
                          <Clock className="w-2.5 h-2.5" />
                          {relativeTime(it.lastUpdated)}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold border border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/55 group-hover:text-foreground dark:group-hover:text-white/85 transition-colors">
                      {finished ? <RotateCcw className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span className="hidden sm:inline">
                        {finished ? t("history.rewatch") : t("history.resume")}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => load(items.length, true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl border border-border dark:border-white/12 bg-muted/50 dark:bg-white/5 hover:bg-accent dark:hover:bg-white/8 text-muted-foreground dark:text-white/60 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t("history.loadMore")}
                </button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
