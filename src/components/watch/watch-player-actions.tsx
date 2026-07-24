"use client";

import { Loader2, Users } from "lucide-react";
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
      <div className="flex flex-wrap items-center gap-2">
        {anilistId && Number.isFinite(epNum) && episodes && episodes.length > 0 && (
          <WatchDownloadPanel
            anilistId={anilistId}
            currentEpisodeNumber={epNum}
            episodes={episodes}
            audio={streamAudio}
            provider={provider}
          />
        )}

        {w2gCode && w2gIsMember ? (
          <span className="inline-flex h-9 items-center rounded-lg border border-primary/25 bg-primary/10 px-3 text-[11px] font-semibold text-zinc-300/85">
            {t("watch.room", { code: w2gCode })}
          </span>
        ) : auth && onCreateW2g ? (
          <button
            type="button"
            onClick={onCreateW2g}
            disabled={creatingW2g}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-[#161616] px-3 text-[12px] font-semibold text-white/80 transition-colors hover:bg-[#1d1d1d] disabled:opacity-50"
          >
            {creatingW2g ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Users className="w-3.5 h-3.5" />
            )}
            <span>{t("watch.watchTogether")}</span>
          </button>
        ) : (
          <LoginPopoverButton
            customTrigger={
              <button
                type="button"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-[#161616] px-3 text-[12px] font-semibold text-white/70 transition-colors hover:bg-[#1d1d1d] hover:text-white/90"
              >
                <Users className="w-3.5 h-3.5" />
                <span>{t("watch.watchTogether")}</span>
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
