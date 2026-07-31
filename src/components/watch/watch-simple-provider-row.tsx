"use client";

import { ProviderQuickPick } from "@/components/player/provider-select";
import {
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import { cn } from "@/lib/core/utils";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  audioMode?: ProviderAudioMode;
  /** Combined provider + mode select (preferred). */
  onSelect?: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  onAudioChange?: (audio: ProviderAudioMode) => void;
  onProviderChange?: (provider: KittyProvider) => void;
  streamCaps?: EpisodeStreamCapabilities;
  capsLoading?: boolean;
  className?: string;
};

/**
 * Compact watch-page source control — opens the shared tabbed picker in a sheet.
 */
export default function WatchSimpleProviderRow({
  provider,
  streamAudio,
  audioMode = "sub",
  onSelect,
  onAudioChange,
  onProviderChange,
  streamCaps,
  capsLoading,
  className,
}: Props) {
  const resolvedMode: ProviderAudioMode =
    streamAudio === "dub" ? "dub" : audioMode === "hardsub" ? "hardsub" : "sub";

  return (
    <div className={cn("min-w-0", className)}>
      <ProviderQuickPick
        value={provider}
        audioMode={resolvedMode}
        compact
        sheetTrigger
        streamCaps={streamCaps}
        capsLoading={capsLoading}
        onSelect={(next, mode) => {
          if (onSelect) {
            onSelect(next, mode);
            return;
          }
          onProviderChange?.(next);
          onAudioChange?.(mode);
        }}
      />
    </div>
  );
}
