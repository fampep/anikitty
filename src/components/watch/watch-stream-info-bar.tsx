"use client";

import { Captions, Flame, Globe2, Mic, Server } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { formatStreamQualityLabel } from "@/lib/kitty/stream-quality";
import { resolveServerCodename } from "@/lib/kitty/server-display";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { audioChipClass, getProviderAccent, providerChipClass } from "@/lib/kitty/provider-ui-styles";
import { useT } from "@/providers/i18n-provider";

type Props = {
  providerLabel: string;
  streamAudio: "sub" | "dub";
  /** Burned-in hard-sub playback (still Japanese audio / sub track). */
  watchingHardSub?: boolean;
  serverName?: string | null;
  provider: KittyProvider;
  qualityLabel?: string | null;
  proxyNodeLabel?: string | null;
  /** Optional race timing for debug hover (ms). */
  raceMs?: number | null;
  className?: string;
};

function MetaChip({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/80 dark:border-white/[0.08] bg-muted/25 dark:bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground dark:text-white/50",
        className,
      )}
    >
      {children}
    </span>
  );
}

export default function WatchStreamInfoBar({
  providerLabel,
  streamAudio,
  watchingHardSub = false,
  serverName,
  provider,
  qualityLabel,
  proxyNodeLabel,
  raceMs,
  className,
}: Props) {
  const t = useT();
  const accent = getProviderAccent(provider);
  const server = resolveServerCodename(provider, serverName);
  const audioLabel =
    streamAudio === "dub"
      ? t("card.dub")
      : watchingHardSub
        ? t("watch.hardSubsSection")
        : t("watch.softSubBadge");
  const quality = qualityLabel ? formatStreamQualityLabel(qualityLabel) : null;
  const proxyTitle =
    raceMs != null && Number.isFinite(raceMs)
      ? `CDN race ${Math.round(raceMs)}ms`
      : undefined;

  return (
    <div
      className={cn(
        "watch-stream-info anikitty-stream-info flex flex-wrap items-center gap-1 px-2.5 sm:px-3 py-1.5 text-[10px] font-mono",
        className,
      )}
    >
      <span className={providerChipClass(provider)}>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
        <Server className="w-3 h-3 opacity-70 shrink-0" />
        {providerLabel}
      </span>

      <span
        className={audioChipClass(
          watchingHardSub && streamAudio === "sub" ? "sub" : streamAudio,
        )}
      >
        {streamAudio === "dub" ? (
          <Mic className="w-2.5 h-2.5 shrink-0" />
        ) : watchingHardSub ? (
          <Flame className="w-2.5 h-2.5 shrink-0 text-amber-300" />
        ) : (
          <Captions className="w-2.5 h-2.5 shrink-0" />
        )}
        {audioLabel}
      </span>

      {server && (
        <MetaChip className="max-w-[11rem] truncate" title={server}>
          {server}
        </MetaChip>
      )}

      {quality && <MetaChip>{quality}</MetaChip>}

      {proxyNodeLabel && (
        <MetaChip title={proxyTitle}>
          <Globe2 className="w-2.5 h-2.5 opacity-70 shrink-0" />
          {proxyNodeLabel}
          {raceMs != null && Number.isFinite(raceMs) ? ` · ${Math.round(raceMs)}ms` : ""}
        </MetaChip>
      )}
    </div>
  );
}
