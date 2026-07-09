"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import { SectionHeading } from "./section-heading";
import { UserBadges } from "@/components/profile/user-badges";
import { CommentFeedBody } from "@/components/comments/comment-feed-body";
import { MessageSquare, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

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

function CommentsFeed({ comments }: { comments: LatestComment[] }) {
  const t = useT();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const revealSpoiler = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRevealed((prev) => new Set([...prev, id]));
  };

  return (
    <div className="w-full grid gap-2 sm:grid-cols-2">
      {comments.map((c) => (
        <Link
          key={c.id}
          href={commentLink(c)}
          className="flex flex-col gap-2.5 p-3.5 rounded-xl border border-border/80 dark:border-white/[0.07] bg-muted/20 dark:bg-white/[0.02] hover:border-violet-400/25 hover:bg-violet-500/[0.04] transition-colors group"
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
            <ArrowRight className="w-3 h-3 shrink-0 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function LatestComments({ bare = false }: { bare?: boolean }) {
  const t = useT();
  const [comments, setComments] = useState<LatestComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/comments/latest")
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const header = (
    <div className="flex items-center justify-between gap-3 w-full">
      <SectionHeading icon={<MessageSquare className="w-4 h-4" />} title={t("home.latestComments")} />
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-300/70 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t("common.live")}
        </span>
        <Link
          href={ROUTES.COMMUNITY}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/75 transition-colors"
        >
          {t("common.seeAll")}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );

  if (bare) {
    if (loading) return <BareLoadingSkeleton />;
    if (!comments.length) return null;
    return (
      <div className="flex flex-col gap-4">
        {header}
        <CommentsFeed comments={comments} />
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;
  if (!comments.length) return null;

  return (
    <Container className="flex flex-col gap-5 py-8 items-start">
      {header}
      <CommentsFeed comments={comments} />
    </Container>
  );
}

const BareLoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-muted dark:bg-white/15 animate-pulse" />
      <div className="h-5 w-40 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-xl border border-border/50 dark:border-white/5">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-accent dark:bg-white/8 animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-32 rounded bg-accent dark:bg-white/8 animate-pulse" />
              <div className="h-3 w-full rounded bg-muted/50 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-4 py-8">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-muted dark:bg-white/15 animate-pulse" />
      <div className="h-5 w-40 animate-pulse bg-accent dark:bg-white/8 rounded" />
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-3.5 rounded-xl">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-full bg-accent dark:bg-white/8 animate-pulse shrink-0" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="h-3 w-32 rounded bg-accent dark:bg-white/8 animate-pulse" />
              <div className="h-3 w-full rounded bg-muted/50 dark:bg-white/5 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </Container>
);
