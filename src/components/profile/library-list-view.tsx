"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Grid3x3,
  List,
  ChevronUp,
  ChevronDown,
  X,
  Star,
  Repeat,
  Check,
  Trash2,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { Bookmark } from "@/hooks/use-get-bookmark";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import Pagination from "@/components/common/pagination";
import { BulkSelectToolbar } from "@/components/common/bulk-select-toolbar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ViewMode = "list" | "grid";
type SortBy = "updated" | "added" | "title" | "score" | "rewatches";

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "updated", label: "Last Updated" },
  { value: "added", label: "Date Added" },
  { value: "title", label: "Title (A–Z)" },
  { value: "score", label: "Score (Highest)" },
  { value: "rewatches", label: "Most Rewatched" },
];

type Props = {
  status: string;
  username: string;
  isOwn: boolean;
};

export default function LibraryListView({ status, username, isOwn }: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const watchlistVersion = useWatchlistStore((s) => s.version);
  const bumpWatchlist = useWatchlistStore((s) => s.bump);

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortBy, setSortBy] = useState<SortBy>("updated");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFolder, setBulkFolder] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inBulk, setInBulk] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Fetch bookmarks with sort and search
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      setBookmarks(null);
      return;
    }

    setIsLoading(true);
    const offset = (currentPage - 1) * perPage;

    const folderMap: Record<string, string> = {
      watching: "WATCHING",
      completed: "COMPLETED",
      "plan to watch": "PLANNING",
      "on hold": "PAUSED",
      dropped: "DROPPED",
    };

    const folder = folderMap[status] || status?.toUpperCase() || "WATCHING";

    const params = new URLSearchParams({
      folder,
      limit: String(perPage),
      offset: String(offset),
      sort: sortBy,
      ...(searchTerm && { search: searchTerm }),
    });

    fetch(`/api/account/watchlist?${params.toString()}`, withAuth())
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((res) => {
        const results = res?.results ?? [];
        setBookmarks(results.length ? results : null);
        const total = res?.total ?? results.length;
        setTotalPages(Math.ceil(total / perPage));
      })
      .catch((err) => {
        console.error("Watchlist fetch error:", err);
        setBookmarks(null);
      })
      .finally(() => setIsLoading(false));
  }, [auth, status, sortBy, searchTerm, currentPage, perPage, watchlistVersion]);

  useEffect(() => {
    setSelected(new Set());
    setInBulk(false);
    setHiddenIds(new Set());
  }, [status, currentPage, searchTerm, sortBy]);

  const visible = bookmarks?.filter((b) => !hiddenIds.has(b.animeId)) ?? bookmarks;

  const removeFromWatchlist = async (animeIds: string[]) => {
    if (!animeIds.length) return;
    setRemoving(true);
    setHiddenIds((prev) => new Set([...prev, ...animeIds]));
    try {
      await Promise.all(
        animeIds.map((id) =>
          fetch(`/api/account/watchlist/${encodeURIComponent(id)}`, {
            method: "DELETE",
            ...withAuth(),
          })
        )
      );
      bumpWatchlist();
      setSelected(new Set());
      setInBulk(false);
      setBulkOpen(false);
      toast.success(
        animeIds.length === 1
          ? "Removed from list"
          : `Removed ${animeIds.length} items`,
      );
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        animeIds.forEach((id) => next.delete(id));
        return next;
      });
      toast.error("Failed to remove items");
    } finally {
      setRemoving(false);
    }
  };

  const handleBulkRemove = () => {
    if (selected.size === 0) return;
    setBulkOpen(true);
    setBulkFolder(null);
  };

  const handleBulkMove = () => {
    if (!bulkFolder || selected.size === 0) return;
    // TODO: implement move to folder
    toast.info("Move not yet implemented");
    setBulkOpen(false);
    setBulkFolder(null);
  };

  const visibleIds = visible?.map((b) => b.animeId) ?? [];

  if (!auth) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Sign in to view your library
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 flex items-center gap-2 bg-muted/30 dark:bg-white/[0.03] border border-border dark:border-white/10 rounded-lg px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground/50" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search titles..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-muted-foreground/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortBy)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border border-border dark:border-white/10 rounded-lg">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-2 transition-colors border-l border-border dark:border-white/10",
                viewMode === "grid"
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk selection toolbar */}
      {inBulk && isOwn && (
        <BulkSelectToolbar
          className="mb-3"
          selectedCount={selected.size}
          totalCount={visibleIds.length}
          busy={removing}
          onDone={() => {
            setInBulk(false);
            setSelected(new Set());
          }}
          onSelectAll={() => setSelected(new Set(visibleIds))}
          onClearSelection={() => setSelected(new Set())}
          onRemove={handleBulkRemove}
          removeLabel={`Remove ${selected.size}`}
        />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!visible || visible.length === 0) && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-foreground/80 dark:text-white/70">
            {searchTerm ? "No results found" : "Nothing here yet"}
          </p>
          <p className="text-xs text-muted-foreground dark:text-white/35">
            {searchTerm
              ? `Try a different search term`
              : isOwn
                ? "Start watching anime to fill this list"
                : "This list is empty"}
          </p>
        </div>
      )}

      {/* List View */}
      {!isLoading && visible && visible.length > 0 && viewMode === "list" && (
        <div className="space-y-1 mb-4">
          {visible.map((bookmark) => {
            const title = bookmark.animeTitle || bookmark.anime?.title?.english || bookmark.anime?.title?.romaji || "Unknown";
            const addedDate = bookmark.addedAt ? new Date(bookmark.addedAt).toLocaleDateString() : "—";
            return (
            <div
              key={bookmark.animeId}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 dark:hover:bg-white/[0.05] transition-colors",
                selected.has(bookmark.animeId) &&
                  "bg-primary/10 ring-1 ring-primary/30",
              )}
            >
              {isOwn && inBulk && (
                <button
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(bookmark.animeId)) {
                      next.delete(bookmark.animeId);
                    } else {
                      next.add(bookmark.animeId);
                    }
                    setSelected(next);
                  }}
                  className="flex h-5 w-5 items-center justify-center rounded border border-border dark:border-white/10 shrink-0"
                >
                  {selected.has(bookmark.animeId) && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              )}

              <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-muted/40 dark:bg-white/[0.04]">
                {bookmark.thumbnail || bookmark.anime?.cover_image?.large ? (
                  <Image
                    src={bookmark.thumbnail || bookmark.anime?.cover_image?.large || ""}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>

              <Link
                href={`/anime/${encodeURIComponent(bookmark.animeId)}`}
                className="flex-1 min-w-0 group"
              >
                <p className="truncate text-sm font-medium text-foreground/90 dark:text-white/80 group-hover:text-primary">
                  {title}
                </p>
                <p className="text-[11px] text-muted-foreground dark:text-white/40">
                  Added {addedDate}
                </p>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0">
                {typeof bookmark.score === "number" && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-300">
                    <Star className="h-3 w-3 fill-current" />
                    {bookmark.score}
                  </span>
                )}
                {(bookmark.rewatchCount ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-cyan-300">
                    <Repeat className="h-3 w-3" />
                    {bookmark.rewatchCount}
                  </span>
                )}
              </div>

              {isOwn && !inBulk && (
                <button
                  onClick={() => void removeFromWatchlist([bookmark.animeId])}
                  disabled={removing}
                  className="p-1 text-muted-foreground hover:text-rose-400 transition-colors disabled:opacity-40 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && visible && visible.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-4">
          {visible.map((bookmark) => {
            const title = bookmark.animeTitle || bookmark.anime?.title?.english || bookmark.anime?.title?.romaji || "Unknown";
            return (
            <div
              key={bookmark.animeId}
              className={cn(
                "relative group",
                selected.has(bookmark.animeId) &&
                  "ring-2 ring-primary/60 rounded-lg",
              )}
            >
              {isOwn && inBulk && (
                <button
                  onClick={() => {
                    const next = new Set(selected);
                    if (next.has(bookmark.animeId)) {
                      next.delete(bookmark.animeId);
                    } else {
                      next.add(bookmark.animeId);
                    }
                    setSelected(next);
                  }}
                  className="absolute top-1.5 left-1.5 z-30 flex h-5 w-5 items-center justify-center rounded-md border bg-black/70 border-white/20"
                >
                  {selected.has(bookmark.animeId) && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              )}

              <Link
                href={`/anime/${encodeURIComponent(bookmark.animeId)}`}
                className="flex flex-col gap-1.5 group cursor-pointer"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted/40 dark:bg-white/[0.04]">
                  {bookmark.thumbnail || bookmark.anime?.cover_image?.large ? (
                    <Image
                      src={bookmark.thumbnail || bookmark.anime?.cover_image?.large || ""}
                      alt=""
                      fill
                      sizes="120px"
                      className="object-cover transition-transform group-hover:scale-105"
                      unoptimized
                    />
                  ) : null}
                  {typeof bookmark.score === "number" && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-black/75 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      {bookmark.score}
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 text-[11px] font-medium text-foreground/85 dark:text-white/75">
                  {title}
                </p>
              </Link>

              {isOwn && !inBulk && (
                <button
                  onClick={() => void removeFromWatchlist([bookmark.animeId])}
                  disabled={removing}
                  className="absolute bottom-1.5 right-1.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-black/60 text-muted-foreground hover:text-rose-300 disabled:opacity-40"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            totalPages={totalPages}
            currentPage={currentPage}
            handlePageChange={(page) => setCurrentPage(page)}
            handleNextPage={() =>
              currentPage < totalPages && setCurrentPage((p) => p + 1)
            }
            handlePreviousPage={() =>
              currentPage > 1 && setCurrentPage((p) => p - 1)
            }
          />
        </div>
      )}

      {/* Bulk action dialogs */}
      <Dialog open={bulkOpen && bulkFolder === null} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove items?</DialogTitle>
            <DialogDescription>
              Remove {selected.size} item{selected.size !== 1 ? "s" : ""} from your
              list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setBulkOpen(false)}
              disabled={removing}
              className="px-4 py-2 rounded border border-border dark:border-white/10 text-sm font-semibold hover:bg-muted/50 dark:hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => void removeFromWatchlist([...selected])}
              disabled={removing}
              className="px-4 py-2 rounded bg-rose-500/15 text-rose-300 text-sm font-bold ring-1 ring-rose-400/25 hover:bg-rose-500/25 transition-colors disabled:opacity-40"
            >
              {removing ? "Removing..." : "Remove"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit button for bulk mode */}
      {!inBulk && isOwn && visible && visible.length > 0 && (
        <button
          onClick={() => setInBulk(true)}
          className="text-xs font-semibold text-muted-foreground hover:text-foreground px-2.5 py-1 rounded border border-border dark:border-white/12 transition-all hover:border-primary"
        >
          Edit
        </button>
      )}
    </>
  );
}
