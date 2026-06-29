"use client";

import AnimeCard from "@/components/anime/anime-card";
import Pagination from "@/components/common/pagination";
import { ROUTES } from "@/constants/routes";
import useBookMarks, { type Bookmark, type WatchHistory } from "@/hooks/use-get-bookmark";
import { anisurgeContinue, folderToStatus, statusToFolder } from "@/lib/oauth/anisurge";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { ChevronLeft, ChevronRight, Tv2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const CARD_W = 130;

type Props = {
  status: string;
  username: string;
  isOwn: boolean;
};

function mapPublicItem(item: {
  animeId: string;
  folder: string;
  addedAt?: string;
  anime?: {
    title?: { english?: string; romaji?: string };
    cover_image?: { large?: string; extra_large?: string };
  } | null;
}): Bookmark {
  const animeData = item.anime ?? {};
  const title =
    animeData?.title?.english ??
    animeData?.title?.romaji ??
    item.animeId;
  const poster =
    animeData?.cover_image?.large ??
    animeData?.cover_image?.extra_large ??
    "";

  return {
    id: item.animeId,
    user: "",
    animeId: item.animeId,
    thumbnail: poster,
    animeTitle: title,
    status: folderToStatus(item.folder ?? "WATCHING"),
    created: item.addedAt ?? "",
    expand: { watchHistory: [] },
  };
}

function AnimeLists({ status, username, isOwn }: Props) {
  const { auth } = useAuthStore();
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const [currentPage, setPage] = React.useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const ownBookmarks = useBookMarks({
    status,
    page: currentPage,
    per_page: 20,
    populate: isOwn,
  });

  const [publicBookmarks, setPublicBookmarks] = useState<Bookmark[] | null>(null);
  const [publicTotalPages, setPublicTotalPages] = useState(0);
  const [publicLoading, setPublicLoading] = useState(!isOwn);

  useEffect(() => {
    if (isOwn) return;
    const folder = statusToFolder(status);
    const offset = (currentPage - 1) * 20;
    setPublicLoading(true);
    fetch(
      `/api/users/${encodeURIComponent(username)}/watchlist?folder=${encodeURIComponent(folder)}&limit=20&offset=${offset}`,
      withAuth(),
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const results = res?.results ?? [];
        setPublicBookmarks(results.length ? results.map(mapPublicItem) : null);
        const total = res?.total ?? results.length;
        setPublicTotalPages(Math.ceil(total / 20));
      })
      .catch(() => setPublicBookmarks(null))
      .finally(() => setPublicLoading(false));
  }, [isOwn, username, status, currentPage]);

  const bookmarks = isOwn ? ownBookmarks.bookmarks : publicBookmarks;
  const totalPages = isOwn ? ownBookmarks.totalPages : publicTotalPages;
  const isLoading = isOwn ? ownBookmarks.isLoading : publicLoading;

  const [progressMap, setProgressMap] = useState<Record<string, WatchHistory>>({});
  useEffect(() => {
    if (!isOwn || !auth) return;
    anisurgeContinue.get(true, 100).then((res: any) => {
      const data: any[] = res?.data ?? [];
      const map: Record<string, WatchHistory> = {};
      data.forEach((r: any) => {
        const episodeNumber = parseInt((r.episodeId ?? "ep-0").replace("ep-", ""), 10) || 0;
        map[r.animeId] = {
          id: r.animeId,
          current: r.currentTime ?? 0,
          timestamp: r.duration ?? 0,
          episodeId: r.episodeId ?? "",
          episodeNumber,
          created: r.lastUpdated ?? "",
        };
      });
      setProgressMap(map);
    }).catch(() => {});
  }, [isOwn, auth, watchlistVersion]);

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateScroll);
  }, [bookmarks]);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -400 : 400, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="flex gap-2.5 overflow-hidden w-full mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-white/5" />
        ))}
      </div>
    );
  }

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Tv2 className="w-10 h-10 text-white/15" />
        <p className="text-white/30 text-sm font-mono">Nothing here yet</p>
        <p className="text-white/20 text-xs">
          {isOwn ? "Start watching anime to fill this list" : "This list is empty"}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Scroll controls */}
      <div className="flex justify-end gap-1 mb-2">
        <button
          onClick={() => scroll("left")}
          disabled={!canScrollLeft}
          className="h-6 w-6 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => scroll("right")}
          disabled={!canScrollRight}
          className="h-6 w-6 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Horizontal scroll row */}
      <div className="relative w-full">
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-2 w-10 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide"
        >
          {bookmarks.map((bookmark) => {
            const progress = progressMap[bookmark.animeId] ?? null;
            const url = progress?.episodeId
              ? `${ROUTES.WATCH}?anime=${bookmark.animeId}&episode=${progress.episodeId}`
              : `${ROUTES.ANIME_DETAILS}/${bookmark.animeId}`;

            return (
              <div key={bookmark.id} style={{ width: CARD_W }} className="shrink-0">
                <AnimeCard
                  compact
                  poster={bookmark.thumbnail}
                  title={bookmark.animeTitle}
                  href={url}
                  className="w-full max-w-none"
                  watchDetail={progress}
                />
              </div>
            );
          })}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            totalPages={totalPages}
            handleNextPage={() => currentPage < totalPages && setPage((p) => p + 1)}
            handlePageChange={(n) => setPage(n)}
            handlePreviousPage={() => currentPage > 1 && setPage((p) => p - 1)}
            currentPage={currentPage}
          />
        </div>
      )}
    </>
  );
}

export default AnimeLists;
