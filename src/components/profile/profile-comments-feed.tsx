"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  MessageSquare,
  Search,
  Trash2,
} from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { CommentFeedBody } from "@/components/comments/comment-feed-body";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type UserComment = {
  id: string;
  animeId: string;
  animeTitle?: string | null;
  episodeId?: string | null;
  episodeNumber?: number | null;
  body: string;
  gifUrl?: string | null;
  isSpoiler?: boolean;
  createdAt: string;
};

type CommentsResponse = {
  comments: UserComment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const PAGE_SIZE = 10;

function commentHref(c: UserComment) {
  if (c.episodeId) {
    return `${ROUTES.WATCH}?anime=${encodeURIComponent(c.animeId)}&episode=${encodeURIComponent(c.episodeId)}`;
  }
  return `${ROUTES.ANIME_DETAILS}/${c.animeId}`;
}

function relativeTime(iso: string, t: ReturnType<typeof useT>): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return t("home.justNow");
  const m = Math.floor(s / 60);
  if (m < 60) return t("common.timeAgoMinutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("common.timeAgoHours", { h });
  const d = Math.floor(h / 24);
  if (d < 30) return t("common.timeAgoDays", { d });
  const mo = Math.floor(d / 30);
  if (mo < 12) return t("profile.commentsPage.monthsAgo", { count: mo });
  return new Date(iso).toLocaleDateString();
}

function buildPageNumbers(current: number, total: number): (number | "...")[] {
  const pages = Array.from({ length: total }, (_, i) => i + 1).filter((page) => {
    return page === 1 || page === total || Math.abs(page - current) <= 1;
  });
  return pages.reduce<(number | "...")[]>((acc, page, i, arr) => {
    if (i > 0 && page - (arr[i - 1] as number) > 1) acc.push("...");
    acc.push(page);
    return acc;
  }, []);
}

type Props = {
  username: string;
  variant?: "full" | "compact";
  limit?: number;
};

export default function ProfileCommentsFeed({ username, variant = "full", limit }: Props) {
  const t = useT();
  const pageSize = limit ?? (variant === "compact" ? 5 : PAGE_SIZE);
  const [items, setItems] = useState<UserComment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort]);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pageSize),
      sort,
    });
    if (debouncedSearch) params.set("q", debouncedSearch);

    fetch(`/api/users/${encodeURIComponent(username)}/comments?${params}`, withAuth())
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json() as Promise<CommentsResponse>;
      })
      .then((d) => {
        setItems(d.comments ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [username, page, pageSize, sort, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
  const hasFilters = debouncedSearch.length > 0 || sort !== "newest";

  const clearFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setSort("newest");
    setPage(1);
  };

  if (loading && items.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(variant === "compact" ? 3 : 5)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-muted/40 dark:bg-[#0a0a0a] border border-border dark:border-white/6 h-[72px]"
          />
        ))}
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
        <div>
          <p className="text-sm text-muted-foreground dark:text-white/50 font-medium">
            {t("profile.failedToLoadComments")}
          </p>
          <button
            type="button"
            onClick={load}
            className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors mt-1"
          >
            {t("profile.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="profile-comments" className="w-full">
      {variant === "full" && (
        <div className="mb-3 flex flex-row items-center gap-2">
          <div className="relative flex-1">
            <span className="flex h-[2.1rem] items-center overflow-hidden rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-[#0a0a0a] pr-2.5 transition-all focus-within:ring-1 focus-within:ring-primary/50">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("profile.commentsPage.searchPlaceholder")}
                className="h-full w-full border-none bg-transparent pl-3 text-sm font-medium text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-neutral-400 outline-none focus:ring-0"
              />
              <Search className="h-4 w-4 shrink-0 text-muted-foreground dark:text-neutral-400" />
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
              className="flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-[#0a0a0a] text-muted-foreground dark:text-white/80 transition-all hover:bg-accent dark:hover:bg-neutral-800 hover:text-foreground dark:hover:text-white"
              aria-label={sort === "newest" ? t("profile.commentsPage.sortNewest") : t("profile.commentsPage.sortOldest")}
              title={sort === "newest" ? t("profile.commentsPage.sortNewest") : t("profile.commentsPage.sortOldest")}
            >
              {sort === "newest" ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpAZ className="h-4 w-4" />}
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-[#0a0a0a] text-muted-foreground dark:text-white/80 transition-all hover:bg-accent dark:hover:bg-neutral-800 hover:text-foreground dark:hover:text-white"
                aria-label={t("profile.commentsPage.clearFilters")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground dark:text-white/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>{t("profile.commentsPage.count", { count: total })}</span>
        </div>
        {variant === "compact" && total > 0 && (
          <Link
            href={ROUTES.profileComments(username)}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            {t("profile.commentsPage.viewAll")}
          </Link>
        )}
      </div>

      {!items.length ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center rounded-xl border border-dashed border-border dark:border-white/10">
          <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
          <p className="text-sm text-muted-foreground/70 dark:text-white/30">
            {debouncedSearch ? t("profile.commentsPage.noResults") : t("profile.noCommentsYet")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Link
              key={c.id}
              href={commentHref(c)}
              className="block rounded-xl border border-border/60 dark:border-transparent bg-muted/30 dark:bg-[#0a0a0a] p-3 transition-colors hover:bg-accent/50 dark:hover:bg-neutral-900"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 pt-0.5">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-foreground/90 dark:text-white/90 transition-colors hover:text-primary truncate max-w-full">
                      {c.animeTitle}
                      {c.episodeNumber ? ` · ${t("watch.episodeShort", { n: c.episodeNumber })}` : ""}
                    </span>
                    <span className="text-muted-foreground/50 dark:text-white/30">•</span>
                    <span className="text-muted-foreground dark:text-white/50 shrink-0">
                      {relativeTime(c.createdAt, t)}
                    </span>
                  </div>
                  <CommentFeedBody
                    id={c.id}
                    body={c.body}
                    gifUrl={c.gifUrl}
                    isSpoiler={c.isSpoiler}
                    revealedIds={revealed}
                    onReveal={(id) => setRevealed((prev) => new Set(prev).add(id))}
                    textClassName="text-sm leading-relaxed text-muted-foreground dark:text-white/70 line-clamp-2"
                    gifClassName="mt-2 max-h-[200px] max-w-[200px] rounded-lg bg-muted/30 object-contain"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {variant === "full" && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex flex-wrap justify-center gap-2">
            {pageNumbers.map((p, index) =>
              p === "..." ? (
                <span
                  key={`ellipsis-${index}`}
                  className="flex h-10 w-10 items-center justify-center text-sm text-muted-foreground dark:text-white/40"
                >
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={p === page ? "page" : undefined}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-medium transition-colors",
                    p === page
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 dark:bg-white/5 text-muted-foreground dark:text-white/80 hover:bg-accent dark:hover:bg-zinc-700",
                  )}
                >
                  {p}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
