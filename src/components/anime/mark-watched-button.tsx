"use client";

import { useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useWatchlistStore } from "@/store/watchlist-store";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

/**
 * "Mark whole series watched" — completes the title in one tap: moves it to the
 * Completed list and syncs AniList to COMPLETED. Hidden once already completed.
 */
export default function MarkWatchedButton({
  animeId,
  anilistId,
  title,
  poster,
  totalEpisodes,
}: {
  animeId: string;
  anilistId?: number;
  title?: string;
  poster?: string;
  totalEpisodes?: number;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const markWatched = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(
        "/api/account/watch/complete-series",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            animeId,
            anilistId: anilistId ?? (parseInt(animeId, 10) || undefined),
            animeTitle: title,
            animeThumbnail: poster,
            totalEpisodes,
          }),
        }),
      );
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      useWatchlistStore.getState().bump();
      toast.success(
        data?.anilistSynced
          ? t("anime.markedWatchedAniList")
          : t("anime.markedWatched"),
      );
    } catch {
      toast.error(t("anime.listError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={markWatched}
      disabled={busy}
      title={t("anime.markWholeSeriesWatched")}
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold border transition-all disabled:opacity-50",
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15",
      )}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <CheckCheck className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">{t("anime.markWatched")}</span>
    </button>
  );
}
