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
  getKittyProviderMeta,
  KITTY_PROVIDER_META,
  kittyProvidersByGroup,
  providerSupportsDub,
  providerSupportsSub,
  type KittyProvider,
} from "@/lib/kitty/kitty-providers";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import { providerCapabilityBadges } from "@/lib/kitty/provider-picker-utils";
import { sortProvidersForPicker } from "@/lib/kitty/provider-prefs";
import { AUDIO_SEGMENT, getProviderAccent } from "@/lib/kitty/provider-ui-styles";
import { Captions, Headphones, Mic, Server, Zap } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

type Props = {
  provider: KittyProvider;
  streamAudio: "sub" | "dub";
  onAudioChange: (audio: "sub" | "dub") => void;
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

function AudioSegmentedControl({
  value,
  dubEnabled,
  onChange,
  subLabel,
  dubLabel,
}: {
  value: "sub" | "dub";
  dubEnabled: boolean;
  onChange: (audio: "sub" | "dub") => void;
  subLabel: string;
  dubLabel: string;
}) {
  return (
    <div className={AUDIO_SEGMENT.track} role="group" aria-label="Audio">
      <button
        type="button"
        aria-pressed={value === "sub"}
        onClick={() => onChange("sub")}
        className={cn(
          AUDIO_SEGMENT.btn,
          value === "sub" ? AUDIO_SEGMENT.subActive : AUDIO_SEGMENT.subIdle,
        )}
      >
        <Captions className="w-3.5 h-3.5 shrink-0 opacity-80" />
        {subLabel}
      </button>
      <button
        type="button"
        aria-pressed={value === "dub"}
        disabled={!dubEnabled}
        onClick={() => dubEnabled && onChange("dub")}
        className={cn(
          AUDIO_SEGMENT.btn,
          value === "dub" ? AUDIO_SEGMENT.dubActive : AUDIO_SEGMENT.dubIdle,
          !dubEnabled && AUDIO_SEGMENT.dubDisabled,
        )}
      >
        <Mic className="w-3.5 h-3.5 shrink-0 opacity-80" />
        {dubLabel}
      </button>
    </div>
  );
}

export default function WatchSimpleProviderRow({
  provider,
  streamAudio,
  onAudioChange,
  onProviderChange,
  streamCaps,
  preferredProvider,
  className,
}: Props) {
  const t = useT();
  const serverCount = KITTY_PROVIDER_META.length;
  const dubEnabled = providerSupportsDub(provider);
  const providerMeta = getKittyProviderMeta(provider);
  const accent = getProviderAccent(provider);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border dark:border-white/[0.08]",
        "bg-gradient-to-b from-muted/40 to-muted/20 dark:from-white/[0.04] dark:to-white/[0.015]",
        "p-3 shadow-sm",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40",
          streamAudio === "dub" ? "text-amber-400" : "text-teal-400",
        )}
      />

      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground dark:text-white/30">
          {t("watch.source")}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-mono font-semibold",
            accent.chip,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
          {providerMeta.label}
          <span className="opacity-40">·</span>
          {streamAudio === "dub" ? t("card.dub") : t("card.sub")}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-stretch gap-3 sm:gap-2.5">
        <div className="min-w-0 flex-1">
          <FieldLabel icon={<Headphones className="w-3 h-3" />}>{t("watch.audio")}</FieldLabel>
          <AudioSegmentedControl
            value={streamAudio}
            dubEnabled={dubEnabled}
            onChange={onAudioChange}
            subLabel={t("card.sub")}
            dubLabel={t("card.dub")}
          />
        </div>

        <div className="min-w-0 flex-1">
          <FieldLabel icon={<Server className="w-3 h-3" />}>
            {t("watch.server")}
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
      </div>
    </div>
  );
}
