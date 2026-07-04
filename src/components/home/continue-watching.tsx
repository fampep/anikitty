"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { ChevronLeft, ChevronRight, History, Play, RefreshCw, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { useProgressStore } from "@/store/progress-store";
import Image from "next/image";
import Link from "next/link";
import { cn, formatSecondsToMMSS } from "@/lib/core/utils";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface ContinueItem {
  id: string;
  name: string;
  poster: string;
  episodeId: string;
  watchDetail: WatchHistory;
}

interface ContinueWatchingRow {
  animeId: string;
  episodeId?: string;
  currentTime?: number;
  duration?: number;
  lastUpdated?: string;
  anime?: {
    title?: {
      english?: string;
      user_preferred?: string;
      romaji?: string;
    };
    cover_image?: {
      large?: string;
      extra_large?: string;
    };
    poster?: string;
  };
}

type Props = { loading?: boolean };

const CONTINUE_CACHE_KEY = "kitty:continue-watching";

function readContinueCache(userId: string): ContinueItem[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CONTINUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { userId: string; items: ContinueItem[] };
    return parsed.userId === userId ? parsed.items : null;
  } catch {
    return null;
  }
}

function writeContinueCache(userId: string, items: ContinueItem[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CONTINUE_CACHE_KEY,
      JSON.stringify({ userId, items }),
    );
  } catch {
    /* ignore */
  }
}

function mapContinueRows(
  data: ContinueWatchingRow[],
  getProgress: (animeId: string, episodeId: string) => { current: number; duration: number } | null,
): ContinueItem[] {
  return data.map((r) => {
    const animeData = r.anime ?? {};
    const title =
      animeData?.title?.english ??
      animeData?.title?.user_preferred ??
      animeData?.title?.romaji ??
      r.animeId;
    const poster =
      animeData?.cover_image?.large ??
      animeData?.cover_image?.extra_large ??
      animeData?.poster ??
      "";
    const episodeNumber = parseInt((r.episodeId ?? "ep-0").replace("ep-", ""), 10) || 0;
    const cached = getProgress(r.animeId, r.episodeId ?? "");
    return {
      id: r.animeId,
      name: title,
      poster,
      episodeId: r.episodeId ?? "",
      watchDetail: {
        id: r.animeId,
        current: cached?.current ?? r.currentTime ?? 0,
        timestamp: cached?.duration ?? r.duration ?? 0,
        episodeId: r.episodeId ?? "",
        episodeNumber,
        created: r.lastUpdated ?? "",
      },
    };
  });
}

function ContinueCard({
  item,
  onRequestRemove,
  removing,
}: {
  item: ContinueItem;
  onRequestRemove: (item: ContinueItem) => void;
  removing: boolean;
}) {
  const t = useT();
  const { current, timestamp: duration, episodeNumber } = item.watchDetail;
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const remaining = duration > current ? duration - current : 0;
  const href = `${ROUTES.WATCH}?anime=${item.id}&episode=${item.episodeId}${current > 10 ? `&t=${Math.floor(current)}` : ""}`;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRequestRemove(item);
  };

  return (
    <div className="relative shrink-0 w-[160px] sm:w-[200px] group">
      <Link href={href} className="block">
        {/* Thumbnail area */}
        <div className="relative w-full rounded-xl overflow-hidden ring-1 ring-white/[0.06] group-hover:ring-violet-400/20 transition-all" style={{ aspectRatio: "16/9" }}>
          <Image
            src={item.poster}
            alt={item.name}
            fill
            unoptimized
            className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="200px"
          />
          {/* Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 dark:from-black/80 via-black/20 to-transparent" />

          {/* Play button on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-xl">
              <Play className="w-4 h-4 text-black fill-black" />
            </div>
          </div>

          {/* Episode badge */}
          <div className="absolute bottom-2 left-2">
            <span className="text-[10px] font-mono font-bold bg-black/70 text-foreground dark:text-white/90 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {t("common.ep")} {episodeNumber}
            </span>
          </div>

          {/* Time remaining */}
          {remaining > 30 && (
            <div className="absolute bottom-2 right-2">
              <span className="text-[9px] font-mono text-muted-foreground dark:text-white/55 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {t("home.epLeft", { time: formatSecondsToMMSS(remaining) })}
              </span>
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent dark:bg-white/10">
            <div
              className="h-full bg-white/70 transition-none"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Title */}
        <p className={cn(
          "mt-2 text-[12px] font-semibold leading-tight line-clamp-1 transition-colors",
          "text-muted-foreground dark:text-white/60 group-hover:text-foreground dark:group-hover:text-white/90",
        )}>
          {item.name}
        </p>
      </Link>

      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        aria-label={t("home.removeContinue")}
        className={cn(
          "absolute top-2 right-2 z-20 flex h-6 w-6 items-center justify-center rounded-lg",
          "bg-black/60 backdrop-blur-md text-muted-foreground dark:text-white/45 ring-1 ring-border dark:ring-white/10",
          "opacity-80 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          "hover:bg-rose-500/15 hover:text-rose-300 hover:ring-rose-400/25",
          "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-violet-400/40",
          "transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none",
        )}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

function RemoveContinueDialog({
  item,
  open,
  removing,
  onClose,
  onConfirm,
}: {
  item: ContinueItem | null;
  open: boolean;
  removing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !removing) onClose(); }}>
      <DialogContent className="border border-border dark:border-white/10 bg-[#0a0a0f] rounded-2xl max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-violet-950/30 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border dark:border-white/8 text-left space-y-2">
          <DialogTitle className="text-foreground dark:text-white font-semibold text-base tracking-tight">
            {t("home.removeContinueTitle")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-white/45 text-sm leading-relaxed">
            {item
              ? t("home.removeContinueConfirm", { title: item.name })
              : t("home.removeContinue")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="px-5 py-4 gap-2 sm:gap-2 sm:justify-end border-t border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={onClose}
            disabled={removing}
            className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-muted-foreground dark:text-white/65 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5 hover:text-foreground dark:hover:text-white/85 transition-colors disabled:opacity-40"
          >
            {t("settings.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={removing}
            className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold ring-1 ring-rose-400/25 hover:bg-rose-500/25 hover:text-rose-200 transition-colors disabled:opacity-40"
          >
            {removing ? t("common.loading") : t("home.removeContinueAction")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ContinueWatching = ({ loading = false }: Props) => {
  const t = useT();
  const { auth } = useAuthStore();
  const lastSaved = useProgressStore((s) => s.lastSaved);
  const removeProgress = useProgressStore((s) => s.removeProgress);
  const [items, setItems] = useState<ContinueItem[]>(() => {
    if (!auth?.id) return [];
    return readContinueCache(auth.id) ?? [];
  });
  const [fetched, setFetched] = useState(() => {
    if (!auth?.id) return true;
    return (readContinueCache(auth.id)?.length ?? 0) > 0;
  });
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<ContinueItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!auth) {
      setItems([]);
      setFetched(true);
      return;
    }

    const cached = readContinueCache(auth.id);
    if (cached?.length) {
      setItems(cached);
      setFetched(true);
    }

    setLoadError(false);
    const getProgress = useProgressStore.getState().getProgress;
    anisurgeContinue
      .get(true, 14)
      .then((res) => {
        const data: any[] = res?.data ?? [];
        const mapped = mapContinueRows(data, getProgress);
        setItems(mapped);
        writeContinueCache(auth.id, mapped);
      })
      .catch(() => {
        if (!cached?.length) {
          setItems([]);
          setLoadError(true);
        }
      })
      .finally(() => setFetched(true));
  }, [auth?.id, lastSaved, retryTick]);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    return () => el.removeEventListener("scroll", updateScrollState);
  }, [items]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -440 : 440, behavior: "smooth" });

  const handleRemove = async (item: ContinueItem) => {
    const key = `${item.id}:${item.episodeId}`;
    setRemovingKey(key);
    const prev = items;
    setItems((list) => list.filter((i) => `${i.id}:${i.episodeId}` !== key));
    try {
      await anisurgeContinue.remove(item.id, item.episodeId);
      removeProgress(item.id, item.episodeId);
      if (auth?.id) {
        writeContinueCache(
          auth.id,
          prev.filter((i) => `${i.id}:${i.episodeId}` !== key),
        );
      }
      setPendingRemove(null);
    } catch {
      setItems(prev);
      toast.error(t("home.removeContinueFailed"));
    } finally {
      setRemovingKey(null);
    }
  };

  const confirmRemove = () => {
    if (!pendingRemove || removingKey) return;
    void handleRemove(pendingRemove);
  };

  if (loading && !fetched) return <LoadingSkeleton />;

  if (!auth) {
    return (
      <Container className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-muted-foreground/80 dark:text-white/25 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-muted-foreground dark:text-white/70">{t("home.continueSignInTitle")}</p>
              <p className="text-[11px] text-muted-foreground dark:text-white/30 font-mono mt-0.5">
                {t("home.continueSignInDesc")}
              </p>
            </div>
          </div>
          <LoginPopoverButton
            customTrigger={
              <button
                type="button"
                className="shrink-0 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors"
              >
                {t("home.signInToContinue")}
              </button>
            }
          />
        </div>
      </Container>
    );
  }

  if (!fetched && !items.length) return <LoadingSkeleton />;

  if (loadError) {
    return (
      <Container className="py-6">
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
          <p className="text-xs text-muted-foreground dark:text-white/40 font-mono">{t("home.continueLoadError")}</p>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/60 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("home.retry")}
          </button>
        </div>
      </Container>
    );
  }

  if (!items.length) return null;

  return (
    <>
      <Container className="flex flex-col gap-4 py-8 items-start">
      <div className="flex items-center gap-2 w-full min-w-0">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
        <History className="text-muted-foreground dark:text-white/45 w-4 h-4" />
        <h5 className="text-xl md:text-2xl font-bold text-foreground dark:text-white tracking-tight min-w-0 truncate flex-1">
          {t("home.continueWatching")}
        </h5>
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative w-full">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-6 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-6 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        )}
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide scroll-momentum">
          {items.map((item) => {
            const key = `${item.id}:${item.episodeId}`;
            return (
              <ContinueCard
                key={key}
                item={item}
                onRequestRemove={setPendingRemove}
                removing={removingKey === key}
              />
            );
          })}
        </div>
      </div>
      </Container>

      <RemoveContinueDialog
        item={pendingRemove}
        open={!!pendingRemove}
        removing={!!removingKey}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
      />
    </>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-4 py-8 items-start">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-muted dark:bg-white/15 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    <div className="flex gap-3 overflow-hidden w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[160px] sm:w-[200px] flex flex-col gap-2">
          <div className="w-full rounded-xl animate-pulse bg-accent dark:bg-white/8" style={{ aspectRatio: "16/9" }} />
          <div className="h-3 w-3/4 rounded animate-pulse bg-muted/60 dark:bg-muted/60 dark:bg-white/6" />
        </div>
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
