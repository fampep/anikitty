"use client";

import ProviderSelect from "@/components/player/provider-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MIRURO_PIPE_PROVIDERS, type MiruroPipeProviderId } from "@/lib/providers/miruro-types";
import { ANIMEX_SERVERS, type AnimexServerId } from "@/lib/providers/animex-config";
import { ANISNATCH_SERVERS, type AnisnatchServerId } from "@/lib/providers/anisnatch-config";
import { LUNAR_SERVERS, type LunarServerId } from "@/lib/providers/lunar-config";
import { ANIMO_SERVERS, type AnimoServerId } from "@/lib/providers/animo-config";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  provider: KittyProvider;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  anisnatchServer?: AnisnatchServerId;
  lunarServer?: LunarServerId;
  animoServer?: AnimoServerId;
  onProviderChange: (provider: KittyProvider) => void;
  onMiruroPipeChange?: (pipe: MiruroPipeProviderId) => void;
  onAnimexServerChange?: (server: AnimexServerId) => void;
  onAnisnatchServerChange?: (server: AnisnatchServerId) => void;
  onLunarServerChange?: (server: LunarServerId) => void;
  onAnimoServerChange?: (server: AnimoServerId) => void;
  className?: string;
};

function ServerSelect<T extends string>({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  placeholder: string;
  onChange: (value: T) => void;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="h-9 min-w-0 flex-1 text-[11px] font-mono bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/12 text-muted-foreground dark:text-white/70">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-[#0c0c0c] border-border dark:border-white/10 max-h-48">
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id} className="text-xs text-foreground/90 dark:text-white/80">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function WatchSimpleProviderRow({
  provider,
  miruroPipe,
  animexServer,
  anisnatchServer,
  lunarServer,
  animoServer,
  onProviderChange,
  onMiruroPipeChange,
  onAnimexServerChange,
  onAnisnatchServerChange,
  onLunarServerChange,
  onAnimoServerChange,
  className,
}: Props) {
  const t = useT();

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ProviderSelect
        value={provider}
        onChange={onProviderChange}
        compact
        className="w-full min-w-0"
      />
      {provider === "Miruro" && miruroPipe && onMiruroPipeChange && (
        <ServerSelect
          value={miruroPipe}
          options={MIRURO_PIPE_PROVIDERS}
          placeholder={t("watch.miruroPipe")}
          onChange={onMiruroPipeChange}
        />
      )}
      {provider === "Animex" && animexServer && onAnimexServerChange && (
        <ServerSelect
          value={animexServer}
          options={ANIMEX_SERVERS}
          placeholder={t("watch.animexServer")}
          onChange={onAnimexServerChange}
        />
      )}
      {provider === "AniSnatch" && anisnatchServer && onAnisnatchServerChange && (
        <ServerSelect
          value={anisnatchServer}
          options={ANISNATCH_SERVERS}
          placeholder={t("watch.anisnatchServer")}
          onChange={onAnisnatchServerChange}
        />
      )}
      {provider === "Lunar" && lunarServer && onLunarServerChange && (
        <ServerSelect
          value={lunarServer}
          options={LUNAR_SERVERS}
          placeholder={t("watch.lunarServer")}
          onChange={onLunarServerChange}
        />
      )}
      {provider === "Animo" && animoServer && onAnimoServerChange && (
        <ServerSelect
          value={animoServer}
          options={ANIMO_SERVERS}
          placeholder={t("watch.animoServer")}
          onChange={onAnimoServerChange}
        />
      )}
    </div>
  );
}
