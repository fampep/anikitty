"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Container from "./container";
import Avatar from "./common/avatar";
import { SectionHeading } from "./section-heading";
import { RoleBadge } from "./role-badge";
import { MessageSquare, ArrowRight } from "lucide-react";
import { ROUTES } from "@/constants/routes";

interface LatestComment {
  id: string;
  body: string;
  gifUrl: string | null;
  animeId: string;
  episodeId?: string | null;
  episodeNumber?: number | null;
  createdAt: string;
  username: string;
  avatarUrl: string | null;
  role: string | null;
  roleColor: string | null;
}

function commentLink(c: LatestComment) {
  if (c.episodeId) {
    return `${ROUTES.WATCH}?anime=${encodeURIComponent(c.animeId)}&episode=${encodeURIComponent(c.episodeId)}`;
  }
  return `${ROUTES.ANIME_DETAILS}/${c.animeId}`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatAnimeId(id: string) {
  return id
    .replace(/-\d+$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function CommentsFeed({ comments }: { comments: LatestComment[] }) {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {comments.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-3 p-3 rounded-xl border border-transparent hover:border-white/8 hover:bg-white/[0.025] transition-colors group"
        >
          <Avatar
            username={c.username}
            url={c.avatarUrl ?? undefined}
            className="w-9 h-9 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className="text-[12.5px] font-semibold text-white/85">{c.username}</span>
              {c.role && c.role !== "user" && (
                <RoleBadge role={c.role} color={c.roleColor} size="xs" />
              )}
              <span className="text-[10px] text-white/25 font-mono">{timeAgo(c.createdAt)}</span>
            </div>
            {c.body && (
              <p className="text-[12.5px] text-white/55 line-clamp-2 leading-relaxed group-hover:text-white/70 transition-colors">
                {c.body}
              </p>
            )}
            {c.gifUrl && !c.body && (
              <p className="text-[11px] text-white/30 font-mono italic">shared a GIF</p>
            )}
            <Link
              href={commentLink(c)}
              className="inline-flex items-center gap-1.5 mt-1.5 text-[10px] text-white/30 hover:text-white/65 font-mono transition-colors max-w-full flex-wrap"
            >
              <span className="truncate">{formatAnimeId(c.animeId)}</span>
              {c.episodeNumber && (
                <span className="shrink-0 px-1.5 py-px rounded bg-sky-500/10 border border-sky-500/20 text-sky-300/70">
                  Ep {c.episodeNumber}
                </span>
              )}
              <ArrowRight className="w-3 h-3 shrink-0 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LatestComments({ bare = false }: { bare?: boolean }) {
  const [comments, setComments] = useState<LatestComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/comments/latest")
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (bare) {
    if (loading) return <BareLoadingSkeleton />;
    if (!comments.length) return null;
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <SectionHeading icon={<MessageSquare className="w-4 h-4" />} title="Latest Comments" />
          <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-emerald-300/70 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <CommentsFeed comments={comments} />
      </div>
    );
  }

  if (loading) return <LoadingSkeleton />;
  if (!comments.length) return null;

  return (
    <Container className="flex flex-col gap-5 py-8 items-start">
      <SectionHeading icon={<MessageSquare className="w-4 h-4" />} title="Latest Comments" />
      <CommentsFeed comments={comments} />
    </Container>
  );
}

const BareLoadingSkeleton = () => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-white/15 animate-pulse" />
      <div className="h-5 w-40 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-white/8 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-32 rounded bg-white/8 animate-pulse" />
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-4 py-8">
    <div className="flex items-center gap-3">
      <div className="w-[3px] h-5 rounded-full bg-white/15 animate-pulse" />
      <div className="h-5 w-40 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="flex flex-col divide-y divide-white/5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <div className="w-8 h-8 rounded-full bg-white/8 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="h-3 w-32 rounded bg-white/8 animate-pulse" />
            <div className="h-3 w-full rounded bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </Container>
);
