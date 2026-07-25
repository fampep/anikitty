"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import FramedAvatar from "@/components/common/framed-avatar";

type PreviewComment = {
  id: string;
  username: string;
  avatarUrl?: string | null;
  equippedFrame?: string | null;
  isSpoiler: boolean;
  body: string | null;
  gifUrl?: string | null;
};

type Props = {
  animeId: string;
  episodeId: string | null;
  episodeNumber: number;
  onOpen: () => void;
  className?: string;
};

export default function WatchCommentsPreview({
  animeId,
  episodeId,
  episodeNumber,
  onOpen,
  className,
}: Props) {
  const t = useT();
  const [count, setCount] = useState<number | null>(null);
  const [previews, setPreviews] = useState<PreviewComment[]>([]);

  useEffect(() => {
    if (!animeId || !episodeId) {
      setCount(null);
      setPreviews([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/account/comments/${encodeURIComponent(animeId)}?countOnly=1&preview=1&episodeId=${encodeURIComponent(episodeId)}`,
          withAuth(),
        );
        const data = await res.json();
        if (cancelled) return;
        setCount(res.ok ? (data.total ?? 0) : 0);
        setPreviews(res.ok && Array.isArray(data.previews) ? data.previews : []);
      } catch {
        if (!cancelled) {
          setCount(0);
          setPreviews([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [animeId, episodeId]);

  const meta =
    count === null
      ? t("watch.commentsPreviewLoading", { ep: episodeNumber })
      : count > 0
        ? t("watch.commentsPreview", { ep: episodeNumber, count })
        : t("watch.commentsPreviewEmpty", { ep: episodeNumber });

  const snippet = previews.find((p) => !p.isSpoiler && (p.body || p.gifUrl));
  const snippetText = snippet
    ? snippet.body?.trim()
      ? snippet.body.trim()
      : snippet.gifUrl
        ? t("home.sharedGif")
        : ""
    : "";

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={meta}
      className={cn(
        "w-full text-left rounded-xl border border-border/50 dark:border-white/[0.08] bg-transparent px-3 py-3",
        "hover:bg-muted/30 dark:hover:bg-white/[0.035] hover:border-border dark:hover:border-white/14 transition-colors group",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/60 dark:border-white/[0.08] bg-muted/40 dark:bg-white/[0.04]">
          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground dark:text-white/45 group-hover:text-zinc-300 transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[12px] font-semibold text-foreground/90 dark:text-white/88 leading-none">
              {t("watch.tabs.comments")}
            </p>
            {count != null && count > 0 ? (
              <span className="rounded-md border border-border/70 dark:border-white/10 bg-muted/50 dark:bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-muted-foreground dark:text-white/40">
                {count}
              </span>
            ) : null}
          </div>
          <p className="mt-1.5 text-[10px] font-mono text-muted-foreground dark:text-white/35 leading-snug truncate">
            {meta}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-muted-foreground/60 dark:text-white/22 group-hover:text-zinc-300/80 transition-colors">
          →
        </span>
      </div>

      {previews.length > 0 ? (
        <div className="mt-2.5 flex items-start gap-2.5 border-t border-border/40 dark:border-white/[0.06] pt-2.5">
          <div className="flex shrink-0 -space-x-1.5">
            {previews.slice(0, 2).map((p) => (
              <FramedAvatar
                key={p.id}
                username={p.username}
                url={p.avatarUrl ?? undefined}
                frameSlug={p.equippedFrame}
                className="h-6 w-6 ring-2 ring-background dark:ring-[#0a0a0a]"
              />
            ))}
          </div>
          <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted-foreground dark:text-white/45 line-clamp-2">
            {snippet ? (
              <>
                <span className="font-medium text-foreground/80 dark:text-white/70">{snippet.username}</span>
                <span className="text-muted-foreground/70 dark:text-white/30"> · </span>
                {snippet.isSpoiler ? t("comments.spoilerBadge") : snippetText}
              </>
            ) : (
              t("comments.hiddenSpoilers", { count: previews.length })
            )}
          </p>
        </div>
      ) : null}
    </button>
  );
}
