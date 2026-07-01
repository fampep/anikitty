"use client";

import ProviderSelect from "@/components/player/provider-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MIRURO_PIPE_PROVIDERS, type MiruroPipeProviderId } from "@/lib/providers/miruro-api";
import { ANIMEX_SERVERS, type AnimexServerId } from "@/lib/providers/animex-api";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { useT } from "@/providers/i18n-provider";

type Props = {
  provider: KittyProvider;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  onProviderChange: (provider: KittyProvider) => void;
  onMiruroPipeChange?: (pipe: MiruroPipeProviderId) => void;
  onAnimexServerChange?: (server: AnimexServerId) => void;
};

export default function WatchSimpleProviderRow({
  provider,
  miruroPipe,
  animexServer,
  onProviderChange,
  onMiruroPipeChange,
  onAnimexServerChange,
}: Props) {
  const t = useT();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProviderSelect
        value={provider}
        onChange={onProviderChange}
        compact
        className="min-w-[10rem]"
      />
      {provider === "Miruro" && miruroPipe && onMiruroPipeChange && (
        <Select value={miruroPipe} onValueChange={(v) => onMiruroPipeChange(v as MiruroPipeProviderId)}>
          <SelectTrigger className="h-8 min-w-[8rem] text-[11px] font-mono bg-white/[0.04] border-white/12 text-white/70">
            <SelectValue placeholder={t("watch.miruroPipe")} />
          </SelectTrigger>
          <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-48">
            {MIRURO_PIPE_PROVIDERS.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs text-white/80">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {provider === "Animex" && animexServer && onAnimexServerChange && (
        <Select value={animexServer} onValueChange={(v) => onAnimexServerChange(v as AnimexServerId)}>
          <SelectTrigger className="h-8 min-w-[8rem] text-[11px] font-mono bg-white/[0.04] border-white/12 text-white/70">
            <SelectValue placeholder={t("watch.animexServer")} />
          </SelectTrigger>
          <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-48">
            {ANIMEX_SERVERS.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs text-white/80">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
