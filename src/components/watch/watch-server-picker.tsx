"use client";

import { useEffect, useMemo, useState } from "react";
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

function QualityChip({
  q,
  active,
  onPick,
}: {
  q: KittyStreamQuality;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "px-2 py-1 rounded-md text-[10px] font-mono font-semibold border transition-colors touch-manipulation",
        active
          ? "border-zinc-400/35 bg-zinc-500/15 text-zinc-100"
          : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-zinc-400/25",
      )}
    >
      {formatStreamQualityLabel(q.quality)}
    </button>
  );
}

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

  const uniqueQualities = useMemo(
    () => qualities.filter((q, i, arr) => arr.findIndex((x) => x.file === q.file) === i),
    [qualities],
  );
  const canFetchSite = isAnilistSiteProvider(provider) && Boolean(dataIds);
  const hasQualities = uniqueQualities.length > 1;
  const activeQuality = uniqueQualities.find((q) => q.file === activeFile);

  useEffect(() => {
    setOpen(false);
    setSiteServers([]);
  }, [provider, streamAudio]);

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

  const qualityChips = hasQualities && (
    <div className="flex flex-wrap gap-1.5">
      {uniqueQualities.map((q) => (
        <QualityChip
          key={q.file}
          q={q}
          active={activeFile === q.file}
          onPick={() => onPickQuality(q)}
        />
      ))}
    </div>
  );

  // Qualities only — show inline, no collapse.
  if (hasQualities && !canFetchSite) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] px-3 py-2",
          className,
        )}
      >
        <p className="mb-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/35">
          {t("watch.serverPickerTitle")}
        </p>
        {qualityChips}
      </div>
    );
  }

  const headerHint = activeQuality
    ? formatStreamQualityLabel(activeQuality.quality)
    : canFetchSite
      ? t("watch.serverPickerTitle")
      : null;

  return (
    <div className={cn("rounded-lg border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02]", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[11px] font-mono text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white/80"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span>{t("watch.serverPickerTitle")}</span>
          {headerHint && (
            <span className="truncate rounded-md border border-teal-400/25 bg-teal-500/10 px-1.5 py-px text-[9px] font-bold text-teal-200/90">
              {headerHint}
            </span>
          )}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border dark:border-white/[0.06] px-2 py-2 space-y-2">
          {qualityChips}
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
                    className="px-2 py-1 rounded-md text-[10px] font-mono font-semibold border border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-primary/25 hover:text-zinc-100/90 touch-manipulation"
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
