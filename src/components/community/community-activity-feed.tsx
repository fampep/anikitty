"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import Avatar from "@/components/common/avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import { UserBadges } from "@/components/profile/user-badges";
import { CommentFeedBody } from "@/components/comments/comment-feed-body";
import { CategoryBadge } from "@/components/forum/forum-ui";
import { MessageSquare, MessagesSquare, ArrowRight, Pin, Lock, MessageCircle } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { forumBodyPreview, forumTimeAgo, type ForumThread } from "@/lib/social/forum";

interface LatestComment {
  id: string;
  body: string;
  gifUrl: string | null;
  isSpoiler?: boolean;
  animeId: string;
  animeTitle?: string | null;
  episodeId?: string | null;
  episodeNumber?: number | null;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
  level?: number;
  levelRole?: string;
  levelRoleColor?: string;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
}

function commentLink(c: LatestComment) {
  if (c.episodeId) {
    return `${ROUTES.WATCH}?anime=${encodeURIComponent(c.animeId)}&episode=${encodeURIComponent(c.episodeId)}`;
  }
  return `${ROUTES.ANIME_DETAILS}/${c.animeId}`;
}

function timeAgo(dateStr: string, t: ReturnType<typeof useT>) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("home.justNow");
  if (m < 60) return t("common.timeAgoMinutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("common.timeAgoHours", { h });
  return t("common.timeAgoDays", { d: Math.floor(h / 24) });
}

function formatAnimeId(id: string) {
  return id
    .replace(/-\d+$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function animeLabel(c: LatestComment) {
  return c.animeTitle ?? formatAnimeId(c.animeId);
}

function PanelHeader({
  icon,
  title,
  href,
  linkLabel,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-[3px] h-5 rounded-full bg-gradient-to-b from-violet-400/70 to-violet-400/20 shrink-0" />
        <span className="text-violet-300/70">{icon}</span>
        <h2 className="text-base font-bold text-foreground dark:text-white/90 truncate">{title}</h2>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/75 transition-colors shrink-0"
      >
        {linkLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function CommentsColumn({ comments }: { comments: LatestComment[] }) {
  const t = useT();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const revealSpoiler = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRevealed((prev) => new Set([...prev, id]));
  };

  if (!comments.length) {
    return (
      <p className="text-sm text-muted-foreground dark:text-white/35 font-mono py-8 text-center">
        {t("community.noComments")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={commentLink(c)}
          className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/80 dark:border-white/[0.07] bg-muted/20 dark:bg-white/[0.02] hover:border-violet-400/25 hover:bg-violet-500/[0.04] transition-colors group"
        >
          <div className="flex items-start gap-3 min-w-0">
            <FramedAvatar
              username={c.username}
              url={c.avatarUrl ?? undefined}
              frameSlug={c.equippedFrame}
              className="w-9 h-9 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="text-[12.5px] font-semibold text-foreground dark:text-white/85 truncate">
                  <CosmeticUsername username={c.username} iconSlug={c.equippedIcon} />
                </span>
                <UserBadges
                  role={c.role}
                  roleColor={c.roleColor}
                  level={c.level}
                  levelRole={c.levelRole}
                  levelRoleColor={c.levelRoleColor}
                  size="xs"
                />
                {c.isSpoiler ? (
                  <span className="text-[9px] font-mono uppercase tracking-wider text-amber-300/80 px-1.5 py-px rounded bg-amber-500/10 border border-amber-500/20">
                    {t("comments.spoilerBadge")}
                  </span>
                ) : null}
                <span className="text-[10px] text-muted-foreground/80 dark:text-white/25 font-mono ml-auto shrink-0">
                  {timeAgo(c.createdAt, t)}
                </span>
              </div>

              <div className="line-clamp-3">
                <CommentFeedBody
                  id={c.id}
                  body={c.body}
                  gifUrl={c.gifUrl}
                  isSpoiler={c.isSpoiler}
                  revealedIds={revealed}
                  onReveal={revealSpoiler}
                  textClassName="text-[12.5px] text-muted-foreground dark:text-white/60 group-hover:text-muted-foreground dark:group-hover:text-white/75 transition-colors"
                />
              </div>

              {c.gifUrl && !c.body ? (
                <p className="text-[11px] text-muted-foreground dark:text-white/30 font-mono italic mt-1">
                  {t("home.sharedGif")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-white/30 font-mono pl-12">
            <span className="truncate">{animeLabel(c)}</span>
            {c.episodeNumber ? (
              <span className="shrink-0 px-1.5 py-px rounded bg-sky-500/10 border border-sky-500/20 text-sky-300/70">
                Ep {c.episodeNumber}
              </span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}

function ForumColumn({ threads }: { threads: ForumThread[] }) {
  const t = useT();

  if (!threads.length) {
    return (
      <p className="text-sm text-muted-foreground dark:text-white/35 font-mono py-8 text-center">
        {t("community.noForumThreads")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          href={`${ROUTES.FORUM}/${thread.id}`}
          className="flex flex-col gap-2 p-3.5 rounded-xl border border-border/80 dark:border-white/[0.07] bg-muted/20 dark:bg-white/[0.02] hover:border-emerald-400/20 hover:bg-emerald-500/[0.03] transition-colors group"
        >
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryBadge category={thread.category} />
            {thread.isPinned ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                <Pin className="w-2.5 h-2.5" />
                {t("forum.pinned")}
              </span>
            ) : null}
            {thread.isLocked ? (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-muted-foreground dark:text-white/40 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 px-1.5 py-0.5 rounded-md">
                <Lock className="w-2.5 h-2.5" />
                {t("forum.locked")}
              </span>
            ) : null}
            <span className="text-[10px] font-mono text-muted-foreground dark:text-white/25 ml-auto">
              {forumTimeAgo(thread.lastActivityAt ?? thread.createdAt)}
            </span>
          </div>

          <h3 className="text-[13.5px] font-bold text-foreground dark:text-white/90 group-hover:text-foreground dark:group-hover:text-white leading-snug line-clamp-2">
            {thread.title}
          </h3>

          <p className="text-[12px] text-muted-foreground dark:text-white/45 line-clamp-2 leading-relaxed">
            {forumBodyPreview(thread.body, 140)}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Avatar username={thread.username} url={thread.avatarUrl ?? undefined} className="w-5 h-5 shrink-0" />
            <span className="text-[11px] font-semibold text-muted-foreground dark:text-white/60">{thread.username}</span>
            <UserBadges
              role={thread.role}
              roleColor={thread.roleColor}
              level={thread.level}
              levelRole={thread.levelRole}
              levelRoleColor={thread.levelRoleColor}
              size="xs"
            />
            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground dark:text-white/30 ml-auto">
              <MessageCircle className="w-3 h-3" />
              {t("community.replies", { count: thread.replyCount })}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-xl border border-border/50 dark:border-white/5 animate-pulse">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-accent dark:bg-white/8 shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-3 w-28 rounded bg-accent dark:bg-white/8" />
              <div className="h-3 w-full rounded bg-muted/50 dark:bg-white/5" />
              <div className="h-3 w-2/3 rounded bg-muted/50 dark:bg-white/5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityActivityFeed() {
  const t = useT();
  const [comments, setComments] = useState<LatestComment[]>([]);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/comments/latest").then((r) => r.json()),
      fetch("/api/forum/latest").then((r) => r.json()),
    ])
      .then(([commentsData, forumData]) => {
        setComments(commentsData.comments ?? []);
        setThreads(forumData.threads ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const empty = !loading && !comments.length && !threads.length;
  if (empty) return null;

  return (
    <Container className="py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <section className="site-panel p-4 sm:p-5">
          <PanelHeader
            icon={<MessageSquare className="w-4 h-4" />}
            title={t("community.latestComments")}
            href={ROUTES.COMMUNITY}
            linkLabel={t("common.seeAll")}
          />
          {loading ? <ColumnSkeleton /> : <CommentsColumn comments={comments} />}
        </section>

        <section className="site-panel p-4 sm:p-5">
          <PanelHeader
            icon={<MessagesSquare className="w-4 h-4" />}
            title={t("community.latestForum")}
            href={ROUTES.FORUM}
            linkLabel={t("community.forumCta")}
          />
          {loading ? <ColumnSkeleton /> : <ForumColumn threads={threads} />}
        </section>
      </div>
    </Container>
  );
}
