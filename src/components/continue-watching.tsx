"use client";

import React, { useEffect, useRef, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeContinue } from "@/lib/anisurge";
import { WatchHistory } from "@/hooks/use-get-bookmark";

interface ContinueItem {
  id: string;
  name: string;
  poster: string;
  episodeId: string;
  watchDetail: WatchHistory;
}

type Props = { loading: boolean };

const ContinueWatching = ({ loading }: Props) => {
  const { auth } = useAuthStore();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!auth) {
      setItems([]);
      setFetched(true);
      return;
    }

    setError(null);
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

            return {
              id: r.animeId,
              name: title,
              poster,
              episodeId: r.episodeId,
              watchDetail: {
                id: r.animeId,
                current: r.currentTime ?? 0,
                timestamp: r.duration ?? 0,
                episodeId: r.episodeId ?? "",
                episodeNumber,
                created: r.lastUpdated ?? "",
              },
            };
          }),
        );
      })
      .catch((e: any) => {
        console.error("[ContinueWatching]", e);
        setError(e?.message ?? "Failed to load watch history");
        setItems([]);
      })
      .finally(() => setFetched(true));
  }, [auth]);

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

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
  };

  if (loading || !fetched) return <LoadingSkeleton />;
  if (error) return (
    <Container className="py-4">
      <p className="text-white/30 text-xs font-mono">Watch history unavailable</p>
    </Container>
  );
  if (!items.length) return null;

  return (
    <Container className="flex flex-col gap-4 py-8 items-start">
      <div className="flex items-center gap-3 w-full">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-white/70 to-white/20 shrink-0" />
        <History className="text-white/45 w-4 h-4" />
        <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Continue Watching
        </h5>

        {/* Arrow controls */}
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
        {/* Left fade */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-12 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        )}
        {/* Right fade */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        )}

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
        >
          {items.map((item, idx) => (
            <BlurFade key={item.id} delay={idx * 0.04} inView>
              <div className="w-[130px] shrink-0">
                <AnimeCard
                  compact
                  title={item.name}
                  poster={item.poster}
                  className="w-full max-w-none"
                  href={`${ROUTES.WATCH}?anime=${item.id}&episode=${item.episodeId}${item.watchDetail.current > 10 ? `&t=${Math.floor(item.watchDetail.current)}` : ""}`}
                  watchDetail={item.watchDetail}
                />
              </div>
            </BlurFade>
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
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="w-[130px] shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-white/8" />
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
