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
      className={cn(
        "w-full text-left rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5",
        "hover:bg-white/[0.06] hover:border-white/15 transition-colors",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] border border-white/10">
          <MessageSquare className="h-4 w-4 text-white/55" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-none">
            {t("watch.tabs.comments")}
          </p>
          <p className="mt-1.5 text-[12px] text-white/40 leading-snug">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}
