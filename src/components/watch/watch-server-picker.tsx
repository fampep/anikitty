"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import { formatStreamQualityLabel } from "@/lib/kitty/stream-quality";
import {
  fetchAnilistSiteServers,
  type AnilistSiteServer,
} from "@/lib/kitty/anilist-site-client";
import { isAnilistSiteProvider, type AnilistSiteProviderId } from "@/lib/kitty/anilist-site-providers";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  qualities?: KittyStreamQuality[];
  activeFile?: string;
  dataIds?: string | null;
  onPickQuality: (entry: KittyStreamQuality) => void;
  onPickSiteServer: (server: AnilistSiteServer) => void;
  className?: string;
};

export default function WatchServerPicker({
  provider,
  streamAudio,
  qualities = [],
  activeFile,
  dataIds,
  onPickQuality,
  onPickSiteServer,
  className,
}: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [siteServers, setSiteServers] = useState<AnilistSiteServer[]>([]);
  const [loadingSite, setLoadingSite] = useState(false);

  const uniqueQualities = qualities.filter(
    (q, i, arr) => arr.findIndex((x) => x.file === q.file) === i,
  );
  const canFetchSite = isAnilistSiteProvider(provider) && Boolean(dataIds);
  const hasQualities = uniqueQualities.length > 1;
  const hasSite = canFetchSite && siteServers.length > 1;

  useEffect(() => {
    if (!open || !canFetchSite || !dataIds) return;
    let cancelled = false;
    setLoadingSite(true);
    void fetchAnilistSiteServers({
      provider: provider as AnilistSiteProviderId,
      dataIds,
      audio: streamAudio,
    })
      .then((rows) => {
        if (!cancelled) setSiteServers(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingSite(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, canFetchSite, dataIds, provider, streamAudio]);

  if (!hasQualities && !canFetchSite) return null;

  return (
    <div className={cn("rounded-lg border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02]", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-mono text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white/80"
      >
        <span>{t("watch.serverPickerTitle")}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border dark:border-white/[0.06] px-2 py-2 space-y-2">
          {hasQualities && (
            <div className="flex flex-wrap gap-1.5">
              {uniqueQualities.map((q) => {
                const active = activeFile === q.file;
                return (
                  <button
                    key={q.file}
                    type="button"
                    onClick={() => onPickQuality(q)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors",
                      active
                        ? "border-teal-400/35 bg-teal-500/15 text-teal-100"
                        : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-teal-400/25",
                    )}
                  >
                    {formatStreamQualityLabel(q.quality)}
                  </button>
                );
              })}
            </div>
          )}
          {canFetchSite && (
            <div className="space-y-1.5">
              {loadingSite && (
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 px-1">
                  {t("watch.serverPickerLoading")}
                </p>
              )}
              {!loadingSite && siteServers.length === 0 && (
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 px-1">
                  {t("watch.serverPickerEmpty")}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {siteServers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onPickSiteServer(s)}
                    className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold border border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-violet-400/25 hover:text-violet-100/90"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
