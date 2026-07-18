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
        "w-full text-left flex items-center gap-2.5 rounded-lg border border-border/50 dark:border-white/[0.07] bg-transparent px-3 py-2.5",
        "hover:bg-muted/30 dark:hover:bg-white/[0.04] hover:border-border dark:hover:border-white/12 transition-colors group",
        className,
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/40 group-hover:text-zinc-300 transition-colors" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-foreground/90 dark:text-white/85 leading-none">
          {t("watch.tabs.comments")}
        </p>
        <p className="mt-1 text-[10px] font-mono text-muted-foreground dark:text-white/35 leading-snug truncate">
          {subtitle}
        </p>
      </div>
      <span className="shrink-0 text-[11px] font-mono text-muted-foreground/60 dark:text-white/22 group-hover:text-zinc-300/80 transition-colors">
        →
      </span>
    </button>
  );
}
