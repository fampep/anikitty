"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  MessagesSquare,
  Search,
  PenSquare,
  Pin,
  Lock,
  MessageCircle,
  Loader2,
  LogIn,
  User,
  Flame,
  HelpCircle,
} from "lucide-react";
import Container from "@/components/container";
import Avatar from "@/components/common/avatar";
import { UserBadges } from "@/components/user-badges";
import { CategoryBadge, VoteButtons } from "@/components/forum/forum-ui";
import NewThreadComposer from "@/components/forum/new-thread-composer";
import LoginPopoverButton from "@/components/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { FORUM_CATEGORIES } from "@/constants/forum";
import { forumApi, forumTimeAgo, ForumThread, ForumStats } from "@/lib/forum";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

const SORTS = [
  { id: "active", label: "Active" },
  { id: "new", label: "New" },
  { id: "top", label: "Top" },
  { id: "unanswered", label: "Unanswered" },
] as const;

export default function ForumPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { auth } = useAuthStore();
  const isLoggedIn = !!auth;

  const sort = params.get("sort") ?? "active";
  const category = params.get("category") ?? "all";
  const mine = params.get("mine") === "true";
  const initialQ = params.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [composing, setComposing] = useState(false);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Sync URL when filters change
  const updateUrl = useCallback(
    (next: { sort?: string; category?: string; q?: string; mine?: boolean }) => {
      const p = new URLSearchParams();
      const s = next.sort ?? sort;
      const c = next.category ?? category;
      const query = next.q ?? debouncedQ;
      const showMine = next.mine ?? mine;
      if (s !== "active") p.set("sort", s);
      if (c !== "all") p.set("category", c);
      if (query) p.set("q", query);
      if (showMine) p.set("mine", "true");
      const qs = p.toString();
      router.replace(`${ROUTES.FORUM}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [sort, category, debouncedQ, mine, router],
  );

  useEffect(() => {
    forumApi.getStats().then(setStats).catch(() => {});
  }, []);

  // Fetch threads when filters change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(1);
    forumApi
      .listThreads({
        sort,
        category: category === "all" ? undefined : category,
        q: debouncedQ || undefined,
        page: 1,
        mine: mine && isLoggedIn,
      })
      .then((res) => {
        if (cancelled) return;
        setThreads(res.threads);
        setTotal(res.total);
        setHasMore(res.hasMore);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e?.message ?? "Failed to load threads");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sort, category, debouncedQ, mine, isLoggedIn]);

  // Push search query into URL after debounce
  useEffect(() => {
    updateUrl({ q: debouncedQ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await forumApi.listThreads({
        sort,
        category: category === "all" ? undefined : category,
        q: debouncedQ || undefined,
        page: next,
        mine: mine && isLoggedIn,
      });
      setThreads((prev) => [...prev, ...res.threads]);
      setHasMore(res.hasMore);
      setTotal(res.total);
      setPage(next);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleVote = async (thread: ForumThread, vote: 1 | -1) => {
    if (!isLoggedIn) {
      toast.error("Sign in to vote");
      return;
    }
    const prevVote = thread.myVote;
    const sameVote = prevVote === vote;
    const newVote: 0 | 1 | -1 = sameVote ? 0 : vote;
    const delta = newVote - prevVote;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === thread.id ? { ...t, myVote: newVote, score: t.score + delta } : t,
      ),
    );
    try {
      await forumApi.voteThread(thread.id, vote);
    } catch (e: any) {
      // revert
      setThreads((prev) =>
        prev.map((t) =>
          t.id === thread.id ? { ...t, myVote: prevVote, score: t.score - delta } : t,
        ),
      );
      toast.error(e?.message ?? "Vote failed");
    }
  };

  const statsMemo = useMemo(() => stats, [stats]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <Container className="flex flex-col gap-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-0.5 h-6 bg-white/35 shrink-0" />
              <MessagesSquare className="w-5 h-5 text-white/50" />
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Forum</h1>
            </div>
            <p className="text-sm text-white/35 font-mono pl-[3.25rem]">
              Discuss anime, share recommendations, meet the community.
            </p>
          </div>

          {statsMemo && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pl-[3.25rem] sm:pl-0">
              <StatPill icon={<MessagesSquare className="w-3 h-3" />} label={`${statsMemo.totalThreads} threads`} />
              <StatPill icon={<MessageCircle className="w-3 h-3" />} label={`${statsMemo.totalReplies} replies`} />
              <StatPill icon={<Flame className="w-3 h-3" />} label={`${statsMemo.activeToday} active today`} />
              <Link
                href={ROUTES.CHAT}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                Live Chat
              </Link>
            </div>
          )}
        </div>

        {/* ── Controls row ── */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search threads..."
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25 focus:bg-white/[0.05] transition-colors"
            />
          </div>

          {/* Sort + filters */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {isLoggedIn && (
              <button
                onClick={() => updateUrl({ mine: !mine })}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors",
                  mine
                    ? "bg-white/10 text-white border-white/15"
                    : "bg-white/[0.03] text-white/45 border-white/8 hover:text-white/75",
                )}
              >
                <User className="w-3.5 h-3.5" />
                My threads
              </button>
            )}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/8">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateUrl({ sort: s.id })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors",
                    sort === s.id
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:text-white/75",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* New thread CTA */}
          {isLoggedIn ? (
            <button
              onClick={() => setComposing((v) => !v)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 active:scale-95 transition-all shrink-0"
            >
              <PenSquare className="w-4 h-4" />
              New Thread
            </button>
          ) : (
            <LoginPopoverButton
              customTrigger={
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/[0.05] text-white/70 border border-white/12 text-sm font-semibold rounded-xl hover:bg-white/8 hover:text-white transition-all shrink-0">
                  <LogIn className="w-4 h-4" />
                  Sign in to post
                </button>
              }
            />
          )}
        </div>

        {/* ── Composer (collapsible) ── */}
        {composing && isLoggedIn && (
          <NewThreadComposer
            defaultCategory={category}
            onCreated={(t) => {
              setThreads((prev) => [t, ...prev]);
              setComposing(false);
            }}
            onCancel={() => setComposing(false)}
          />
        )}

        {/* ── Layout: categories sidebar + thread list ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-start">
          {/* Categories + guidelines */}
          <aside className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 lg:sticky lg:top-24">
            <CategoryFilter
              active={category === "all" && !mine}
              label="All Threads"
              count={statsMemo?.totalThreads}
              onClick={() => updateUrl({ category: "all", mine: false })}
            />
            {FORUM_CATEGORIES.map((c) => (
              <CategoryFilter
                key={c.id}
                active={category === c.id && !mine}
                label={c.label}
                description={c.description}
                color={c.color}
                count={statsMemo?.categoryCounts[c.id]}
                onClick={() => updateUrl({ category: c.id, mine: false })}
              />
            ))}

            <div className="hidden lg:flex flex-col gap-2 mt-4 p-3.5 rounded-xl bg-white/[0.02] border border-white/8">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-white/70">
                <HelpCircle className="w-3.5 h-3.5" />
                Community tips
              </div>
              <ul className="text-[10.5px] text-white/35 font-mono space-y-1.5 leading-relaxed">
                <li>· Use Recommendations for &quot;what should I watch?&quot;</li>
                <li>· Search before posting — your question may exist</li>
                <li>· Upvote helpful threads and replies</li>
                <li>· Quote replies to keep context clear</li>
              </ul>
            </div>
          </aside>

          {/* Thread list */}
          <div className="flex flex-col gap-2 min-w-0">
            {!loading && total > 0 && (
              <p className="text-[11px] font-mono text-white/30 px-1">
                Showing {threads.length} of {total} thread{total !== 1 ? "s" : ""}
                {mine ? " you started" : ""}
              </p>
            )}
            {loading ? (
              <ThreadSkeleton count={5} />
            ) : threads.length === 0 ? (
              <EmptyState query={debouncedQ} category={category} />
            ) : (
              <>
                {threads.map((t) => (
                  <ThreadRow key={t.id} thread={t} onVote={handleVote} />
                ))}
                {hasMore && (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-sm font-semibold text-white/55 hover:text-white hover:bg-white/[0.06] hover:border-white/15 transition-colors disabled:opacity-40"
                  >
                    {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Load more
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}

function StatPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/8 text-[11px] font-mono text-white/45">
      {icon}
      {label}
    </span>
  );
}

function CategoryFilter({
  active,
  label,
  description,
  count,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  description?: string;
  count?: number;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start text-left px-3.5 py-2.5 rounded-xl border shrink-0 transition-colors min-w-[140px]",
        active
          ? "bg-white/[0.06] border-white/15 text-white"
          : "bg-white/[0.02] border-white/8 text-white/55 hover:text-white/85 hover:bg-white/[0.04]",
      )}
    >
      <span className="text-[13px] font-semibold leading-tight flex items-center gap-2 w-full">
        {color && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0",
              color === "sky" && "bg-sky-400",
              color === "violet" && "bg-violet-400",
              color === "amber" && "bg-amber-400",
              color === "emerald" && "bg-emerald-400",
              color === "rose" && "bg-rose-400",
            )}
          />
        )}
        <span className="truncate">{label}</span>
        {typeof count === "number" && count > 0 && (
          <span className="text-[10px] font-mono text-white/30 ml-auto shrink-0">{count}</span>
        )}
      </span>
      {description && (
        <span className="hidden lg:block text-[10.5px] font-mono text-white/30 mt-0.5">
          {description}
        </span>
      )}
    </button>
  );
}

function ThreadRow({
  thread,
  onVote,
}: {
  thread: ForumThread;
  onVote: (t: ForumThread, vote: 1 | -1) => void;
}) {
  return (
    <div className="group flex gap-3 sm:gap-4 p-4 rounded-xl bg-white/[0.025] border border-white/8 hover:border-white/15 hover:bg-white/[0.04] transition-colors">
      <VoteButtons
        score={thread.score}
        myVote={thread.myVote}
        onVote={(v) => onVote(thread, v)}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <CategoryBadge category={thread.category} />
          {thread.isPinned && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
              <Pin className="w-2.5 h-2.5" /> Pinned
            </span>
          )}
          {thread.isLocked && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-white/40 bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded-md">
              <Lock className="w-2.5 h-2.5" /> Locked
            </span>
          )}
          {thread.replyCount === 0 && (
            <span className="text-[10px] font-bold text-sky-300/80 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md">
              Needs replies
            </span>
          )}
        </div>

        <Link href={`${ROUTES.FORUM}/${thread.id}`} className="block">
          <h2 className="text-[15px] sm:text-base font-bold text-white/90 group-hover:text-white leading-snug line-clamp-2">
            {thread.title}
          </h2>
        </Link>

        <p className="text-[12.5px] text-white/45 line-clamp-2 leading-relaxed">
          {thread.body}
        </p>

        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Link href={`/profile/${thread.username}`} className="flex items-center gap-2">
            <Avatar
              username={thread.username}
              url={thread.avatarUrl ?? undefined}
              className="w-5 h-5 shrink-0"
            />
            <span className="text-[11.5px] font-semibold text-white/65 hover:text-white transition-colors">
              {thread.username}
            </span>
          </Link>
          <UserBadges
            role={thread.role}
            roleColor={thread.roleColor}
            level={thread.level}
            levelRole={thread.levelRole}
            levelRoleColor={thread.levelRoleColor}
          />
          <span className="text-[10px] font-mono text-white/30">
            {forumTimeAgo(thread.createdAt)}
          </span>
          {thread.lastActivityAt && (
            <>
              <span className="text-[10px] font-mono text-white/15">·</span>
              <span className="text-[10px] font-mono text-white/30">
                active {forumTimeAgo(thread.lastActivityAt)}
              </span>
            </>
          )}
          <span className="text-[10px] font-mono text-white/15">·</span>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-white/35">
            <MessageCircle className="w-3 h-3" />
            {thread.replyCount}
          </span>
          {thread.updatedAt && (
            <>
              <span className="text-[10px] font-mono text-white/15">·</span>
              <span className="text-[10px] font-mono text-white/25">edited</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ThreadSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/6 animate-pulse"
        >
          <div className="w-8 h-16 rounded bg-white/5" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 w-16 bg-white/5 rounded" />
            <div className="h-4 w-3/4 bg-white/8 rounded" />
            <div className="h-3 w-full bg-white/5 rounded" />
            <div className="h-3 w-1/3 bg-white/5 rounded mt-1" />
          </div>
        </div>
      ))}
    </>
  );
}

function EmptyState({ query, category }: { query: string; category: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10">
      <MessagesSquare className="w-10 h-10 text-white/15 mb-3" />
      <h3 className="text-base font-bold text-white/75 mb-1">
        {query ? "No matching threads" : "No threads yet"}
      </h3>
      <p className="text-[12.5px] text-white/35 font-mono max-w-xs">
        {query
          ? `Nothing matches "${query}".`
          : category !== "all"
            ? "Be the first to start a discussion in this category."
            : "Be the first to start a discussion."}
      </p>
    </div>
  );
}
