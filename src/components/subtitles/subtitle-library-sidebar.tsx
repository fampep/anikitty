"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/common/avatar";
import { CategoryBadge } from "@/components/forum/forum-ui";
import { ROUTES } from "@/constants/routes";
import { forumApi, forumTimeAgo, type ForumThread } from "@/lib/forum";
import type { SubtitleLibraryStats } from "@/lib/subtitle-cache-store";
import { useT } from "@/providers/i18n-provider";
import { MessageCircle, ThumbsUp } from "lucide-react";

export function SubtitleForumSidebar() {
  const t = useT();
  const [threads, setThreads] = useState<ForumThread[]>([]);

  useEffect(() => {
    forumApi
      .listThreads({ sort: "new", page: 1 })
      .then((res) => setThreads(res.threads.slice(0, 3)))
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <div className="border-b border-white/[0.06] px-4 py-3">
        <h2 className="text-[11px] font-mono uppercase tracking-widest text-white/35">
          {t("subsLibrary.latestForum")}
        </h2>
      </div>

      {threads.length === 0 ? (
        <p className="px-4 py-5 text-xs text-white/30">{t("subsLibrary.forumEmpty")}</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {threads.map((thread) => (
            <li key={thread.id} className="px-4 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <Avatar
                  url={thread.avatarUrl ?? undefined}
                  username={thread.username}
                  className="h-[18px] w-[18px]"
                />
                <span
                  className="text-[11px] font-semibold truncate max-w-[7rem]"
                  style={thread.roleColor ? { color: thread.roleColor } : undefined}
                >
                  {thread.username}
                </span>
                <CategoryBadge category={thread.category} />
              </div>
              <Link
                href={`${ROUTES.FORUM}/${thread.id}`}
                className="block text-[13px] font-medium text-white/85 hover:text-violet-300 line-clamp-2 leading-snug transition-colors"
              >
                {thread.title}
              </Link>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-white/30 font-mono">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  {thread.score}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {thread.replyCount}
                </span>
                <span>{forumTimeAgo(thread.lastActivityAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={ROUTES.FORUM}
        className="block border-t border-white/[0.06] px-4 py-3 text-[11px] font-medium text-violet-400/80 hover:text-violet-300 transition-colors"
      >
        {t("subsLibrary.allDiscussions")}
      </Link>
    </div>
  );
}

export function SubtitleCacheSidebar({
  stats,
  loading,
}: {
  stats?: SubtitleLibraryStats;
  loading: boolean;
}) {
  const t = useT();
  const totalAnimes = stats?.totalAnimes ?? 0;
  const totalTracks = stats?.totalTracks ?? 0;
  const completed = stats?.completedAnimes ?? 0;
  const cachedEpisodes = stats?.cachedEpisodes ?? 0;
  const totalEpisodes = stats?.totalEpisodes ?? 0;
  const coveragePct =
    totalEpisodes > 0
      ? Math.round((cachedEpisodes / totalEpisodes) * 100)
      : 0;
  const completedPct =
    totalAnimes > 0 ? Math.round((completed / totalAnimes) * 100) : 0;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <h2 className="text-[11px] font-mono uppercase tracking-widest text-white/35 mb-4">
        {t("subsLibrary.cacheGlance")}
      </h2>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums text-white tracking-tight">
            {loading ? "—" : totalTracks.toLocaleString()}
          </span>
          <span className="text-[11px] font-mono uppercase tracking-wide text-white/30">
            {t("subsLibrary.stats.tracks")}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-white/35 font-mono">
          {loading
            ? "—"
            : t("subsLibrary.cacheMeta", {
                animes: totalAnimes.toLocaleString(),
                completed: completed.toLocaleString(),
              })}
        </p>
      </div>

      <StatBar
        label={t("subsLibrary.coverageEpisodes")}
        value={
          loading
            ? "—"
            : totalEpisodes > 0
              ? t("subsLibrary.episodeCoverageMeta", {
                  cached: cachedEpisodes.toLocaleString(),
                  total: totalEpisodes.toLocaleString(),
                })
              : `${coveragePct}%`
        }
        width={coveragePct}
        variant="primary"
      />
      <StatBar
        label={t("subsLibrary.stats.completed")}
        value={loading ? "—" : `${completed} (${completedPct}%)`}
        width={completedPct}
        variant="alt"
      />
    </div>
  );
}

function StatBar({
  label,
  value,
  width,
  variant,
}: {
  label: string;
  value: string;
  width: number;
  variant: "primary" | "alt";
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-mono">
        <span className="text-white/35 uppercase tracking-wide">{label}</span>
        <span className="text-white/55 tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={
            variant === "primary"
              ? "h-full rounded-full bg-gradient-to-r from-violet-500 to-teal-400 transition-all duration-500"
              : "h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-teal-500/60 transition-all duration-500"
          }
          style={{ width: `${Math.min(100, Math.max(0, width))}%` }}
        />
      </div>
    </div>
  );
}
