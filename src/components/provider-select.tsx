"use client";

import { Fragment, type ReactNode } from "react";
import { Captions, Mic, Server, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_KITTY_PROVIDER,
  kittyProvidersByGroup,
  kittyProvidersForAudioMode,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty-providers";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

type Props = {
  value: KittyProvider;
  onChange: (provider: KittyProvider) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export default function ProviderSelect({
  value,
  onChange,
  disabled,
  compact,
  className,
}: Props) {
  const t = useT();

  return (
    <Select value={value} onValueChange={(v) => onChange(v as KittyProvider)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          compact
            ? "h-8 min-w-[9.5rem] text-[11px] font-mono bg-white/[0.04] border-white/12 text-white/70 hover:bg-white/[0.07]"
            : "h-9 min-w-[11rem] text-xs font-mono bg-white/[0.04] border-white/12 text-white/75 hover:bg-white/[0.07]",
          value === "Miruro" && "border-violet-500/25 bg-violet-500/[0.06] text-violet-100/85",
          value === "AnimeSogo" && "border-teal-500/25 bg-teal-500/[0.06] text-teal-100/85",
          className,
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Server className="w-3.5 h-3.5 shrink-0 opacity-50" />
          <SelectValue placeholder={t("watch.providerSelect")} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-[#0c0c0c] border-white/10 max-h-[min(22rem,70vh)]">
        {(["featured", "other"] as const).map((group) => {
          const items = kittyProvidersByGroup(group);
          if (items.length === 0) return null;

          return (
            <SelectGroup key={group}>
              <SelectLabel className="text-[10px] font-mono uppercase tracking-widest text-white/30 px-2 py-1.5">
                {group === "featured"
                  ? t("watch.providerGroupFeatured")
                  : t("watch.providerGroupOther")}
              </SelectLabel>
              {items.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  textValue={p.label}
                  className="text-xs text-white/80 focus:bg-white/[0.06] focus:text-white py-2.5"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.label}</span>
                      {p.kittySubs && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono uppercase bg-violet-500/15 border border-violet-500/25 text-violet-300/90">
                          /subs
                        </span>
                      )}
                      {(p.nativeSubs || p.kittySubs) && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono uppercase bg-teal-500/15 border border-teal-500/25 text-teal-300/90">
                          <Captions className="w-2.5 h-2.5" />
                          {t("watch.providerSubsBadge")}
                        </span>
                      )}
                      {p.supportsDub && (
                        <span className="inline-flex items-center gap-0.5 rounded px-1 py-px text-[9px] font-mono uppercase bg-amber-500/15 border border-amber-500/25 text-amber-300/90">
                          <Mic className="w-2.5 h-2.5" />
                          {t("card.dub")}
                        </span>
                      )}
                    </div>
                    {p.hint && (
                      <span className="text-[10px] font-mono text-white/35 truncate">{p.hint}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function ProviderQuickPick({
  value,
  onChange,
  className,
}: {
  value: KittyProvider;
  onChange: (provider: KittyProvider) => void;
  className?: string;
}) {
  return (
    <ProviderGrid
      provider={value}
      audioMode="sub"
      onSelect={(p) => onChange(p)}
      className={className}
      rows={["sub", "dub", "multi"]}
    />
  );
}

const PROVIDER_ROW_STYLES: Record<
  ProviderAudioMode,
  { active: string; idle: string; label: string }
> = {
  sub: {
    label: "text-teal-300/70",
    active: "bg-teal-500/25 border-teal-400/45 text-teal-100",
    idle: "border-white/10 text-white/45 hover:border-teal-500/30 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
  },
  dub: {
    label: "text-amber-300/70",
    active: "bg-amber-500/25 border-amber-400/45 text-amber-100",
    idle: "border-white/10 text-white/45 hover:border-amber-500/30 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
  },
  multi: {
    label: "text-violet-300/70",
    active: "bg-violet-500/25 border-violet-400/45 text-violet-100",
    idle: "border-white/10 text-white/45 hover:border-violet-500/30 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
  },
};

type ProviderGridProps = {
  provider: KittyProvider;
  audioMode: ProviderAudioMode;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  disabled?: boolean;
  className?: string;
  /** Limit which rows render (default: all three). */
  rows?: ProviderAudioMode[];
};

export function ProviderGrid({
  provider,
  audioMode,
  onSelect,
  disabled,
  className,
  rows = ["sub", "dub", "multi"],
}: ProviderGridProps) {
  const t = useT();

  const rowLabels: Record<ProviderAudioMode, string> = {
    sub: t("card.sub"),
    dub: t("card.dub"),
    multi: t("watch.multi"),
  };

  const rowIcons: Record<ProviderAudioMode, ReactNode> = {
    sub: <Captions className="w-3 h-3 shrink-0" />,
    dub: <Mic className="w-3 h-3 shrink-0" />,
    multi: <Sparkles className="w-3 h-3 shrink-0" />,
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {rows.map((mode) => {
        const items = kittyProvidersForAudioMode(mode);
        if (items.length === 0) return null;
        const styles = PROVIDER_ROW_STYLES[mode];

        return (
          <div key={mode} className="flex items-start gap-2 min-w-0">
            <span
              className={cn(
                "flex items-center gap-1 w-14 shrink-0 pt-1.5 text-[10px] font-bold font-mono uppercase tracking-wide",
                styles.label,
              )}
            >
              {rowIcons[mode]}
              {rowLabels[mode]}
            </span>
            <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
              {(["featured", "other"] as const).map((group, groupIdx) => {
                const groupItems = items.filter((p) => p.group === group);
                if (groupItems.length === 0) return null;

                return (
                  <Fragment key={group}>
                    {groupIdx > 0 && groupItems.length > 0 && (
                      <span className="w-full h-0 basis-full" aria-hidden />
                    )}
                    {groupItems.map((p) => {
                      const isActive = provider === p.id && audioMode === mode;
                      return (
                        <button
                          key={`${mode}-${p.id}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => onSelect(p.id, mode)}
                          title={p.hint}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40 disabled:pointer-events-none",
                            isActive ? styles.active : styles.idle,
                            p.group === "featured" && !isActive && "text-white/55",
                            p.group === "other" && !isActive && "text-white/35",
                          )}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ProviderChipRow<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  accent = "violet",
  className,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string; hint?: string }[];
  onChange: (id: T) => void;
  disabled?: boolean;
  accent?: "violet" | "rose";
  className?: string;
}) {
  const accentActive =
    accent === "rose"
      ? "bg-rose-500/25 border-rose-400/45 text-rose-100"
      : "bg-violet-500/25 border-violet-400/45 text-violet-100";
  const accentIdle =
    accent === "rose"
      ? "border-white/10 text-white/45 hover:border-rose-500/30 hover:text-rose-200/80 hover:bg-rose-500/[0.06]"
      : "border-white/10 text-white/45 hover:border-violet-500/30 hover:text-violet-200/80 hover:bg-violet-500/[0.06]";
  const accentLabel = accent === "rose" ? "text-rose-300/70" : "text-violet-300/70";

  return (
    <div className={cn("flex items-start gap-2 min-w-0", className)}>
      <span
        className={cn(
          "flex items-center gap-1 w-14 shrink-0 pt-1.5 text-[10px] font-bold font-mono uppercase tracking-wide",
          accentLabel,
        )}
      >
        <Server className="w-3 h-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
        {options.map((opt) => {
          const isActive = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              title={opt.hint}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                isActive ? accentActive : accentIdle,
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DEFAULT_KITTY_PROVIDER };
