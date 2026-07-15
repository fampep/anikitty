"use client";

import { Link2, Loader2, Users } from "lucide-react";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import WatchDownloadPanel from "@/components/watch/watch-download-panel";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import type { Episode } from "@/types/episodes";
import { useT } from "@/providers/i18n-provider";

type Props = {
  anilistId?: number | null;
  episodeNo?: string | null;
  episodes?: Episode[];
  streamAudio: "sub" | "dub";
  provider: KittyProvider;
  onCopyLink: () => void;
  w2gCode?: string | null;
  w2gIsMember?: boolean;
  auth?: boolean;
  creatingW2g?: boolean;
  onCreateW2g?: () => void;
  className?: string;
};

export default function WatchPlayerActions({
  anilistId,
  episodeNo,
  episodes,
  streamAudio,
  provider,
  onCopyLink,
  w2gCode,
  w2gIsMember,
  auth,
  creatingW2g,
  onCreateW2g,
  className,
}: Props) {
  const t = useT();
  const epNum = episodeNo ? parseInt(episodeNo, 10) : NaN;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1.5">
        {anilistId && Number.isFinite(epNum) && episodes && episodes.length > 0 && (
          <WatchDownloadPanel
            anilistId={anilistId}
            currentEpisodeNumber={epNum}
            episodes={episodes}
            audio={streamAudio}
            provider={provider}
          />
        )}

        <button
          type="button"
          onClick={onCopyLink}
          aria-label={t("watch.copyLink")}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70 transition-colors"
          title={t("watch.copyLink")}
        >
          <Link2 className="w-3 h-3" />
          <span className="hidden sm:inline">{t("watch.copyLink")}</span>
        </button>

        {w2gCode && w2gIsMember ? (
          <span className="inline-flex items-center h-8 px-2.5 rounded-lg text-[10px] font-mono bg-violet-500/10 border border-violet-500/25 text-violet-300/80">
            {t("watch.room", { code: w2gCode })}
          </span>
        ) : auth && onCreateW2g ? (
          <button
            type="button"
            onClick={onCreateW2g}
            disabled={creatingW2g}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 transition-colors disabled:opacity-50"
          >
            {creatingW2g ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Users className="w-3 h-3" />
            )}
            <span className="hidden sm:inline">{t("watch.watchTogether")}</span>
          </button>
        ) : (
          <LoginPopoverButton
            customTrigger={
              <button
                type="button"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/12 text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70 transition-colors"
              >
                <Users className="w-3 h-3" />
                <span className="hidden sm:inline">{t("watch.watchTogether")}</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
