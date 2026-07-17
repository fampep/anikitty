"use client";

import { Captions, Globe2, Mic, Server } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { formatStreamQualityLabel } from "@/lib/kitty/stream-quality";
import { resolveServerCodename } from "@/lib/kitty/server-display";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { audioChipClass, getProviderAccent, providerChipClass } from "@/lib/kitty/provider-ui-styles";
import { useT } from "@/providers/i18n-provider";

type Props = {
  providerLabel: string;
  streamAudio: "sub" | "dub";
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
  serverName,
  provider,
  qualityLabel,
  proxyNodeLabel,
  raceMs,
  className,
}: Props) {
  const t = useT();
  const accent = getProviderAccent(provider);
  const server = resolveServerCodename(provider, serverName) ?? serverName?.trim();
  const audioLabel = streamAudio === "dub" ? t("card.dub") : t("card.sub");
  const quality = qualityLabel ? formatStreamQualityLabel(qualityLabel) : null;
  const proxyTitle =
    raceMs != null && Number.isFinite(raceMs)
      ? `CDN race ${Math.round(raceMs)}ms`
      : undefined;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 px-3 py-2 text-[10px] font-mono border-t border-border dark:border-white/[0.06] bg-gradient-to-r from-[#080808] via-[#0a0a0a] to-[#080808]",
        className,
      )}
    >
      <span className={providerChipClass(provider)}>
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
        <Server className="w-3 h-3 opacity-70 shrink-0" />
        {providerLabel}
      </span>

      <span className={audioChipClass(streamAudio)}>
        {streamAudio === "dub" ? <Mic className="w-2.5 h-2.5 shrink-0" /> : <Captions className="w-2.5 h-2.5 shrink-0" />}
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
