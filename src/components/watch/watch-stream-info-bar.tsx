"use client";

import { Captions, Globe2, Mic, Server } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { formatStreamQualityLabel } from "@/lib/kitty/stream-quality";
import { resolveServerCodename } from "@/lib/kitty/server-display";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { useT } from "@/providers/i18n-provider";

type Props = {
  providerLabel: string;
  streamAudio: "sub" | "dub";
  serverName?: string | null;
  provider: KittyProvider;
  qualityLabel?: string | null;
  proxyNodeLabel?: string | null;
  className?: string;
};

export default function WatchStreamInfoBar({
  providerLabel,
  streamAudio,
  serverName,
  provider,
  qualityLabel,
  proxyNodeLabel,
  className,
}: Props) {
  const t = useT();
  const server = resolveServerCodename(provider, serverName) ?? serverName?.trim();
  const audioLabel = streamAudio === "dub" ? t("card.dub") : t("watch.softSubBadge");
  const quality = qualityLabel ? formatStreamQualityLabel(qualityLabel) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 text-[10px] font-mono text-muted-foreground dark:text-white/45 border-t border-border dark:border-white/[0.06] bg-[#080808]",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 text-foreground/75 dark:text-white/65">
        <Server className="w-3 h-3 opacity-60" />
        {providerLabel}
      </span>
      <span className="opacity-30">·</span>
      <span className="inline-flex items-center gap-1">
        {streamAudio === "dub" ? <Mic className="w-3 h-3 opacity-60" /> : <Captions className="w-3 h-3 opacity-60" />}
        {audioLabel}
      </span>
      {server && (
        <>
          <span className="opacity-30">·</span>
          <span className="truncate max-w-[10rem]">{server}</span>
        </>
      )}
      {quality && (
        <>
          <span className="opacity-30">·</span>
          <span>{quality}</span>
        </>
      )}
      {proxyNodeLabel && (
        <>
          <span className="opacity-30">·</span>
          <span className="inline-flex items-center gap-1">
            <Globe2 className="w-3 h-3 opacity-60" />
            {proxyNodeLabel}
          </span>
        </>
      )}
    </div>
  );
}
