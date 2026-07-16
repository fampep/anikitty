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
        "w-full text-left rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.03] px-4 py-3.5",
        "hover:bg-muted/50 dark:hover:bg-white/[0.05] hover:border-border dark:hover:border-white/14 transition-all group",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 dark:bg-white/[0.05] border border-border dark:border-white/10 group-hover:border-teal-400/25 transition-colors">
          <MessageSquare className="h-4 w-4 text-muted-foreground dark:text-white/55 group-hover:text-teal-300/80 transition-colors" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground dark:text-white leading-none">
            {t("watch.tabs.comments")}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground dark:text-white/40 leading-snug">{subtitle}</p>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 group-hover:text-teal-300/70 transition-colors mt-0.5">
          →
        </span>
      </div>
    </button>
  );
}
