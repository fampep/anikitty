"use client";

import AnimeCard from "@/components/anime/anime-card";
import Pagination from "@/components/common/pagination";
import { BulkSelectToolbar } from "@/components/common/bulk-select-toolbar";
import { ROUTES } from "@/constants/routes";
import useBookMarks, { type Bookmark, type WatchHistory } from "@/hooks/use-get-bookmark";
import { useBulkSelect } from "@/hooks/use-bulk-select";
import { accountContinue, accountWatchlist, folderToStatus, statusToFolder } from "@/lib/oauth/account";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { ChevronLeft, ChevronRight, Check, Pencil, Tv2, Star, Repeat, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  rewatchCount?: number;
  score?: number | null;
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
    rewatchCount: item.rewatchCount ?? 0,
    score: item.score ?? null,
    expand: { watchHistory: [] },
  };
}

function AnimeLists({ status, username, isOwn }: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const bumpWatchlist = useWatchlistStore((s) => s.bump);
  const [currentPage, setPage] = React.useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const bulk = useBulkSelect();

  const ownBookmarks = useBookMarks({
    status,
    page: currentPage,
    per_page: 20,
    populate: isOwn,
  });

  const [publicBookmarks, setPublicBookmarks] = useState<Bookmark[] | null>(null);
  const [publicTotalPages, setPublicTotalPages] = useState(0);
  const [publicLoading, setPublicLoading] = useState(!isOwn);
  const publicInitialLoadRef = useRef(true);

  useEffect(() => {
    if (isOwn) return;
    const folder = statusToFolder(status);
    const offset = (currentPage - 1) * 20;
    if (publicInitialLoadRef.current) setPublicLoading(true);
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
      .finally(() => {
        setPublicLoading(false);
        publicInitialLoadRef.current = false;
      });
  }, [isOwn, username, status, currentPage]);

  const rawBookmarks = isOwn ? ownBookmarks.bookmarks : publicBookmarks;
  const bookmarks = rawBookmarks?.filter((b) => !hiddenIds.has(b.animeId)) ?? rawBookmarks;
  const totalPages = isOwn ? ownBookmarks.totalPages : publicTotalPages;
  const isLoading = isOwn ? ownBookmarks.isLoading : publicLoading;

  useEffect(() => {
    setHiddenIds(new Set());
    bulk.exitEdit();
  }, [status, currentPage, watchlistVersion, bulk.exitEdit]);

  const [progressMap, setProgressMap] = useState<Record<string, WatchHistory>>({});
  useEffect(() => {
    if (!isOwn || !auth) return;
    accountContinue.get(true, 100).then((res: any) => {
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

  const removeFromWatchlist = async (animeIds: string[]) => {
    if (!animeIds.length) return;
    setRemoving(true);
    setHiddenIds((prev) => new Set([...prev, ...animeIds]));
    try {
      await Promise.all(animeIds.map((id) => accountWatchlist.remove(id)));
      bumpWatchlist();
      bulk.exitEdit();
      setConfirmOpen(false);
      toast.success(
        animeIds.length === 1
          ? t("profile.removeWatchlistSuccess")
          : t("profile.removeWatchlistSuccessMany", { count: animeIds.length }),
      );
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        animeIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.error(t("profile.removeWatchlistFailed"));
    } finally {
      setRemoving(false);
    }
  };

  const handleQuickRemove = (e: React.MouseEvent, animeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    void removeFromWatchlist([animeId]);
  };

  const handleBulkRemove = () => {
    if (bulk.selectedCount === 0) return;
    setConfirmOpen(true);
  };

  const confirmBulkRemove = () => {
    void removeFromWatchlist([...bulk.selected]);
  };

  if (isLoading) {
    return (
      <div className="flex gap-2.5 overflow-hidden w-full mt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ width: CARD_W }} className="shrink-0 rounded-xl aspect-[2/3] animate-pulse bg-muted/50 dark:bg-white/5" />
        ))}
      </div>
    );
  }

  if (!bookmarks || bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Tv2 className="w-10 h-10 text-muted-foreground/50 dark:text-white/15" />
        <p className="text-muted-foreground dark:text-white/30 text-sm font-mono">Nothing here yet</p>
        <p className="text-muted-foreground/70 dark:text-white/20 text-xs">
          {isOwn ? "Start watching anime to fill this list" : "This list is empty"}
        </p>
      </div>
    );
  }

  const visibleIds = bookmarks.map((b) => b.animeId);

  return (
    <>
      {bulk.editMode && isOwn ? (
        <BulkSelectToolbar
          className="mb-3"
          selectedCount={bulk.selectedCount}
          totalCount={visibleIds.length}
          busy={removing}
          onDone={bulk.exitEdit}
          onSelectAll={() => bulk.selectAll(visibleIds)}
          onClearSelection={bulk.clearSelection}
          onRemove={handleBulkRemove}
          removeLabel={t("profile.removeFromWatchlist", { count: bulk.selectedCount })}
        />
      ) : (
        <ScrollControls
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScroll={scroll}
          showEdit={isOwn}
          onEdit={bulk.enterEdit}
        />
      )}

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
            const selected = bulk.isSelected(bookmark.animeId);
            const inEdit = bulk.editMode && isOwn;

            return (
              <div
                key={bookmark.id}
                style={{ width: CARD_W }}
                className={cn(
                  "shrink-0 relative group",
                  inEdit && "cursor-pointer",
                  selected && "ring-2 ring-primary/60 rounded-xl",
                )}
                onClick={inEdit ? () => bulk.toggle(bookmark.animeId) : undefined}
                onKeyDown={
                  inEdit
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          bulk.toggle(bookmark.animeId);
                        }
                      }
                    : undefined
                }
                role={inEdit ? "checkbox" : undefined}
                aria-checked={inEdit ? selected : undefined}
                tabIndex={inEdit ? 0 : undefined}
              >
                {typeof bookmark.score === "number" && (
                  <span className="absolute top-1.5 left-1.5 z-20 inline-flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 ring-1 ring-amber-400/30 pointer-events-none">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    {bookmark.score}
                  </span>
                )}
                {(bookmark.rewatchCount ?? 0) > 0 && (
                  <span className="absolute top-1.5 right-1.5 z-20 inline-flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 ring-1 ring-cyan-400/30 pointer-events-none">
                    <Repeat className="w-2.5 h-2.5" />
                    {bookmark.rewatchCount}
                  </span>
                )}

                {inEdit && (
                  <span
                    className={cn(
                      "absolute top-1.5 left-1.5 z-30 flex h-5 w-5 items-center justify-center rounded-md border",
                      selected
                        ? "bg-primary border-primary/50 text-primary-foreground"
                        : "bg-black/70 border-white/20 text-white/50",
                    )}
                  >
                    {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                )}

                {isOwn && !inEdit && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickRemove(e, bookmark.animeId)}
                    disabled={removing}
                    aria-label={t("profile.removeFromWatchlistOne")}
                    className={cn(
                      "absolute bottom-2 right-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-lg",
                      "bg-black/60 text-muted-foreground dark:text-white/45 ring-1 ring-border dark:ring-white/10",
                      "opacity-80 sm:opacity-0 sm:group-hover:opacity-100",
                      "hover:bg-rose-500/15 hover:text-rose-300 hover:ring-rose-400/25",
                      "transition-all disabled:opacity-30",
                    )}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.25} />
                  </button>
                )}

                {inEdit ? (
                  <div className="pointer-events-none">
                    <AnimeCard
                      compact
                      poster={bookmark.thumbnail}
                      title={bookmark.animeTitle}
                      className="w-full max-w-none"
                      watchDetail={progress}
                    />
                  </div>
                ) : (
                  <AnimeCard
                    compact
                    poster={bookmark.thumbnail}
                    title={bookmark.animeTitle}
                    href={url}
                    className="w-full max-w-none"
                    watchDetail={progress}
                  />
                )}
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

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (!open && !removing) setConfirmOpen(false); }}>
        <DialogContent className="border border-border dark:border-white/10 bg-[#09090b] rounded-2xl max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-black/30 [&>button:last-child]:hidden">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-border dark:border-white/8 text-left space-y-2">
            <DialogTitle className="text-foreground dark:text-white font-semibold text-base tracking-tight">
              {t("profile.removeWatchlistTitle")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-white/45 text-sm leading-relaxed">
              {bulk.selectedCount === 1
                ? t("profile.removeWatchlistConfirmOne")
                : t("profile.removeWatchlistConfirmMany", { count: bulk.selectedCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-5 py-4 gap-2 sm:gap-2 sm:justify-end border-t border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={removing}
              className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-muted-foreground dark:text-white/65 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5 hover:text-foreground dark:hover:text-white/85 transition-colors disabled:opacity-40"
            >
              {t("settings.cancel")}
            </button>
            <button
              type="button"
              onClick={confirmBulkRemove}
              disabled={removing}
              className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-300 text-xs font-bold ring-1 ring-rose-400/25 hover:bg-rose-500/25 hover:text-rose-200 transition-colors disabled:opacity-40"
            >
              {removing ? t("common.loading") : t("profile.removeWatchlistAction")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ScrollControls({
  canScrollLeft,
  canScrollRight,
  onScroll,
  showEdit,
  onEdit,
}: {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (dir: "left" | "right") => void;
  showEdit?: boolean;
  onEdit?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex justify-end gap-1 mb-2">
      {showEdit && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mr-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border dark:border-white/12 text-muted-foreground dark:text-white/45 text-xs font-semibold hover:text-foreground/90 dark:hover:text-white/75 hover:border-border dark:hover:border-white/25 transition-all"
        >
          <Pencil className="h-3.5 w-3.5" />
          {t("bulkSelect.edit")}
        </button>
      )}
      <button
        onClick={() => onScroll("left")}
        disabled={!canScrollLeft}
        aria-label={t("profile.scrollLeft")}
        className="h-6 w-6 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onScroll("right")}
        disabled={!canScrollRight}
        aria-label={t("profile.scrollRight")}
        className="h-6 w-6 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default AnimeLists;
