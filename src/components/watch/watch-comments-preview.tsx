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
          `/api/account/comments/${encodeURIComponent(animeId)}?page=1&episodeId=${encodeURIComponent(episodeId)}`,
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
        "w-full text-left rounded-xl border border-border dark:border-white/10 bg-gradient-to-br from-violet-500/[0.08] via-white/[0.03] to-transparent px-4 py-3.5",
        "hover:bg-violet-500/[0.1] hover:border-violet-400/20 transition-all group",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-400/15 group-hover:border-violet-400/30 transition-colors">
          <MessageSquare className="h-4 w-4 text-violet-300/80" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground dark:text-white leading-none">
            {t("watch.tabs.comments")}
          </p>
          <p className="mt-1.5 text-[12px] text-muted-foreground dark:text-white/40 leading-snug">{subtitle}</p>
        </div>
        <span className="shrink-0 text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 group-hover:text-violet-300/70 transition-colors mt-0.5">
          →
        </span>
      </div>
    </button>
  );
}
