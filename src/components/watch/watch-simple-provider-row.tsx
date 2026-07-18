"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProviderDefaultBadge, ProviderCapabilityBadge } from "@/components/player/provider-select";
import {
  KITTY_PROVIDER_META,
  kittyProvidersByGroup,
  providerSupportsDub,
  providerSupportsSub,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import { providerCapabilityBadges } from "@/lib/kitty/provider-picker-utils";
import { sortProvidersForPicker } from "@/lib/kitty/provider-prefs";
import { Captions, Mic, Server, Zap } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  onAudioChange?: (audio: "sub" | "dub") => void;
  onProviderChange: (provider: KittyProvider) => void;
  streamCaps?: EpisodeStreamCapabilities;
  preferredProvider?: KittyProvider | null;
  className?: string;
};

const TRIGGER_CLASS =
  "h-10 w-full min-w-0 text-[12px] font-mono bg-muted/40 dark:bg-black/25 border-border dark:border-white/10 text-foreground/85 dark:text-white/75 hover:bg-accent dark:hover:bg-white/[0.06] shadow-sm";

const CONTENT_CLASS = "bg-[#0a0a0a] border-border dark:border-white/10";

function FieldLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-white/35">
      {icon}
      {children}
    </div>
  );
}

function LangBadges({ id }: { id: KittyProvider }) {
  const sub = providerSupportsSub(id);
  const dub = providerSupportsDub(id);
  return (
    <span className="ml-auto flex items-center gap-1 pl-3 shrink-0">
      {sub && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-teal-300/85">
          <Captions className="w-2.5 h-2.5" />
          SUB
        </span>
      )}
      {dub && (
        <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold text-amber-300/85">
          <Mic className="w-2.5 h-2.5" />
          DUB
        </span>
      )}
    </span>
  );
}

export default function WatchSimpleProviderRow({
  provider,
  onProviderChange,
  streamCaps,
  preferredProvider,
  className,
}: Props) {
  const t = useT();
  const serverCount = KITTY_PROVIDER_META.length;

  return (
    <div className={cn("min-w-0", className)}>
      <FieldLabel icon={<Server className="w-3 h-3" />}>
        {t("watch.providerSelect")}
        <span className="text-muted-foreground/60 dark:text-white/20">({serverCount})</span>
      </FieldLabel>
      <Select value={provider} onValueChange={(v) => onProviderChange(v as KittyProvider)}>
        <SelectTrigger className={TRIGGER_CLASS}>
          <div className="flex items-center gap-1.5 min-w-0">
            <Zap className="w-3.5 h-3.5 shrink-0 opacity-60" />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className={cn(CONTENT_CLASS, "max-h-[min(22rem,60vh)]")}>
          {(["featured", "other"] as const).map((group) => {
            const items = sortProvidersForPicker(kittyProvidersByGroup(group), {
              preferredId: preferredProvider,
            });
            if (items.length === 0) return null;
            return (
              <SelectGroup key={group}>
                <SelectLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30 px-2 py-1.5">
                  {group === "featured"
                    ? t("watch.providerGroupFeatured")
                    : t("watch.providerGroupOther")}
                </SelectLabel>
                {items.map((p) => {
                  const badges = providerCapabilityBadges(streamCaps?.providers?.[p.id] ?? null);
                  return (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      textValue={p.label}
                      className="text-xs text-foreground/90 dark:text-white/80"
                    >
                      <span className="flex w-full items-center gap-2 min-w-0">
                        <span className="font-semibold truncate">{p.label}</span>
                        <ProviderDefaultBadge id={p.id} />
                        {streamCaps ? (
                          <ProviderCapabilityBadge caps={badges} />
                        ) : (
                          <LangBadges id={p.id} />
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
