"use client";

import { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

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

  useEffect(() => {
    if (!animeId || !episodeId) {
      setCount(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/account/comments/${encodeURIComponent(animeId)}?countOnly=1&episodeId=${encodeURIComponent(episodeId)}`,
          withAuth(),
        );
        const data = await res.json();
        if (!cancelled) setCount(res.ok ? (data.total ?? 0) : 0);
      } catch {
        if (!cancelled) setCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [animeId, episodeId]);

  const subtitle =
    count === null
      ? t("watch.commentsPreviewLoading", { ep: episodeNumber })
      : count > 0
        ? t("watch.commentsPreview", { ep: episodeNumber, count })
        : t("watch.commentsPreviewEmpty", { ep: episodeNumber });

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={subtitle}
      className={cn(
        "w-full text-left flex items-center gap-3 rounded-xl border border-border/60 dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.025] px-3.5 py-3",
        "hover:bg-muted/40 dark:hover:bg-white/[0.05] hover:border-border dark:hover:border-white/14 transition-colors group",
        className,
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground dark:text-white/45 group-hover:text-zinc-300 transition-colors" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground dark:text-white leading-none">
          {t("watch.tabs.comments")}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground dark:text-white/40 leading-snug truncate">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-mono text-muted-foreground/70 dark:text-white/25 group-hover:text-zinc-300/80 transition-colors">
        →
      </span>
    </button>
  );
}
