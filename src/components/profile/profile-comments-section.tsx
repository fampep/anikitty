"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { CommentFeedBody } from "@/components/comments/comment-feed-body";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

type UserComment = {
  id: string;
  animeId: string;
  episodeId?: string | null;
  episodeNumber?: number | null;
  body: string;
  gifUrl?: string | null;
  isSpoiler?: boolean;
  createdAt: string;
};

function formatAnimeLabel(id: string) {
  if (/^\d+$/.test(id)) return `Anime #${id}`;
  return id
    .replace(/-\d+$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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
  return new Date(iso).toLocaleDateString();
}

export default function ProfileCommentsSection({ username }: { username: string }) {
  const t = useT();
  const [items, setItems] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());

  const load = () => {
    setLoading(true);
    setFailed(false);
    fetch(`/api/users/${encodeURIComponent(username)}/comments`, withAuth())
      .then((r) => r.json())
      .then((d) => {
        setItems(d.comments ?? []);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [username]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/6 px-4 py-3 h-16"
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
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors mt-1"
          >
            {t("profile.retry")}
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground/20 dark:text-white/8" />
        <p className="text-sm text-muted-foreground/70 dark:text-white/20 font-mono">
          {t("profile.noCommentsYet")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border dark:divide-white/[0.04]">
      {items.map((c) => (
        <Link
          key={c.id}
          href={commentHref(c)}
          className="block py-4 rounded-lg -mx-1 px-1 transition-colors hover:bg-muted/30 dark:hover:bg-white/[0.02]"
        >
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-mono font-semibold text-violet-300/80 hover:text-violet-200 transition-colors truncate max-w-[220px]">
              {formatAnimeLabel(c.animeId)}
              {c.episodeNumber ? ` · ${t("watch.episodeShort", { n: c.episodeNumber })}` : ""}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 shrink-0">
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
            textClassName="text-sm text-muted-foreground dark:text-white/55 leading-relaxed"
            gifClassName="rounded-xl max-h-40 w-auto max-w-full ring-1 ring-white/8"
          />
        </Link>
      ))}
    </div>
  );
}
