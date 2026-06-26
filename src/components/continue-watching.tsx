"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "./container";
import { ROUTES } from "@/constants/routes";
import { ChevronLeft, ChevronRight, History, Play } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeContinue } from "@/lib/anisurge";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { useProgressStore } from "@/store/progress-store";
import Image from "next/image";
import Link from "next/link";
import { cn, formatSecondsToMMSS } from "@/lib/utils";
import LoginPopoverButton from "./login-popover-button";

interface ContinueItem {
  id: string;
  name: string;
  poster: string;
  episodeId: string;
  watchDetail: WatchHistory;
}

type Props = { loading: boolean };

function ContinueCard({ item }: { item: ContinueItem }) {
  const { current, timestamp: duration, episodeNumber } = item.watchDetail;
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
  const remaining = duration > current ? duration - current : 0;
  const href = `${ROUTES.WATCH}?anime=${item.id}&episode=${item.episodeId}${current > 10 ? `&t=${Math.floor(current)}` : ""}`;

  return (
    <Link href={href} className="block shrink-0 w-[160px] sm:w-[200px] group">
      {/* Thumbnail area */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
        <Image
          src={item.poster}
          alt={item.name}
          fill
          unoptimized
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.06]"
          sizes="200px"
        />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Play button on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2.5 shadow-xl">
            <Play className="w-4 h-4 text-black fill-black" />
          </div>
        </div>

        {/* Episode badge */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] font-mono font-bold bg-black/70 text-white/90 px-1.5 py-0.5 rounded backdrop-blur-sm">
            EP {episodeNumber}
          </span>
        </div>

        {/* Time remaining */}
        {remaining > 30 && (
          <div className="absolute bottom-2 right-2">
            <span className="text-[9px] font-mono text-white/55 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
              {formatSecondsToMMSS(remaining)} left
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
          <div
            className="h-full bg-white/70 transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Title */}
      <p className={cn(
        "mt-2 text-[12px] font-semibold leading-tight line-clamp-1 transition-colors",
        "text-white/60 group-hover:text-white/90",
      )}>
        {item.name}
      </p>
    </Link>
  );
}

const ContinueWatching = ({ loading }: Props) => {
  const { auth } = useAuthStore();
  const lastSaved = useProgressStore((s) => s.lastSaved);
  const getProgress = useProgressStore((s) => s.getProgress);
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!auth) { setItems([]); setFetched(true); return; }

    anisurgeContinue
      .get(true, 14)
      .then((res) => {
        const data: any[] = res?.data ?? [];
        setItems(
          data.map((r) => {
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
              episodeId: r.episodeId,
              watchDetail: {
                id: r.animeId,
                current: cached?.current ?? r.currentTime ?? 0,
                timestamp: cached?.duration ?? r.duration ?? 0,
                episodeId: r.episodeId ?? "",
                episodeNumber,
                created: r.lastUpdated ?? "",
              },
            };
          }),
        );
      })
      .catch(() => setItems([]))
      .finally(() => setFetched(true));
  }, [auth, lastSaved]);

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

  if (loading) return <LoadingSkeleton />;

  if (!auth) {
    return (
      <Container className="py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-white/8 bg-white/[0.02]">
          <div className="flex items-start gap-3">
            <History className="w-5 h-5 text-white/25 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white/70">Continue where you left off</p>
              <p className="text-[11px] text-white/30 font-mono mt-0.5">
                Sign in to sync your watch progress across devices
              </p>
            </div>
          </div>
          <LoginPopoverButton
            customTrigger={
              <button
                type="button"
                className="shrink-0 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold hover:bg-white/90 transition-colors"
              >
                Sign in to continue
              </button>
            }
          />
        </div>
      </Container>
    );
  }

  if (!fetched) return <LoadingSkeleton />;
  if (!items.length) return null;

  return (
    <Container className="flex flex-col gap-4 py-8 items-start">
      <div className="flex items-center gap-3 w-full">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
        <History className="text-white/45 w-4 h-4" />
        <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">Continue Watching</h5>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
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
          {items.map((item) => (
            <ContinueCard key={item.id + item.episodeId} item={item} />
          ))}
        </div>
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-4 py-8 items-start">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-white/15 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="flex gap-3 overflow-hidden w-full">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="shrink-0 w-[160px] sm:w-[200px] flex flex-col gap-2">
          <div className="w-full rounded-xl animate-pulse bg-white/8" style={{ aspectRatio: "16/9" }} />
          <div className="h-3 w-3/4 rounded animate-pulse bg-white/6" />
        </div>
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
