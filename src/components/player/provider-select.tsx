"use client";

import { useState, type ReactNode } from "react";
import { Captions, ChevronDown, ChevronRight, Eye, EyeOff, Mic, Server } from "lucide-react";
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
  getKittyProviderLabel,
  kittyProvidersByGroup,
  kittyProvidersForAudioMode,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { getPreferredDefaultProvider } from "@/lib/kitty/provider-order";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import {
  providerCapabilityBadges,
} from "@/lib/kitty/provider-picker-utils";
import { sortProvidersForPicker } from "@/lib/kitty/provider-prefs";
import { getProviderAccent, providerPillClass as providerPillAccentClass } from "@/lib/kitty/provider-ui-styles";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

type Props = {
  value: KittyProvider;
  onChange: (provider: KittyProvider) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
};

export function ProviderCapabilityBadge({
  caps,
  compact,
}: {
  caps: { sub: boolean; dub: boolean };
  compact?: boolean;
}) {
  if (!caps.sub && !caps.dub) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono opacity-80",
        compact ? "text-[8px]" : "text-[9px]",
      )}
    >
      {caps.sub && <span className="text-teal-300/80">S</span>}
      {caps.dub && <span className="text-amber-300/80">D</span>}
    </span>
  );
}

export function ProviderDefaultBadge({
  id,
  compact,
}: {
  id: KittyProvider;
  compact?: boolean;
}) {
  const t = useT();
  const providerOrder = useSettingsStore((s) => s.providerOrder);
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const preferredDefault = getPreferredDefaultProvider(providerOrder, defaultProvider);
  if (id !== preferredDefault) return null;

  return (
    <span
      className={cn(
        "font-mono font-bold uppercase rounded border shrink-0 border-teal-400/45 bg-teal-500/15 text-teal-200/90",
        compact ? "text-[8px] px-1 py-px leading-tight" : "text-[9px] px-1.5 py-0.5",
      )}
    >
      {t("watch.providerDefaultBadge")}
    </span>
  );
}

export default function ProviderSelect({
  value,
  onChange,
  disabled,
  compact,
  className,
}: Props) {
  const t = useT();
  const providerOrder = useSettingsStore((s) => s.providerOrder);
  const defaultProvider = useSettingsStore((s) => s.defaultProvider);
  const showAdultContent = useSettingsStore((s) => s.showAdultContent);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as KittyProvider)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          compact
            ? "h-8 min-w-[9.5rem] text-[11px] font-mono bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/12 text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/[0.07]"
            : "h-9 min-w-[11rem] text-xs font-mono bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/12 text-foreground/85 dark:text-white/75 hover:bg-accent dark:hover:bg-white/[0.07]",
          getProviderAccent(value).chip,
          className,
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <Server className="w-3.5 h-3.5 shrink-0 opacity-50" />
          <SelectValue placeholder={t("watch.providerSelect")}>
            {getKittyProviderLabel(value)}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-[#0c0c0c] border-border dark:border-white/10 max-h-[min(22rem,70vh)]">
        {(["featured", "other"] as const).map((group) => {
          const items = sortProvidersForPicker(
            kittyProvidersByGroup(group).filter((p) => showAdultContent || !p.adultOnly),
            {
              priorityOrder: providerOrder,
              defaultProvider,
            },
          );
          if (items.length === 0) return null;

          return (
            <SelectGroup key={group}>
              <SelectLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30 px-2 py-1.5">
                {group === "featured"
                  ? t("watch.providerGroupFeatured")
                  : t("watch.providerGroupOther")}
              </SelectLabel>
              {items.map((p) => (
                <SelectItem
                  key={p.id}
                  value={p.id}
                  textValue={p.label}
                  className="text-xs text-foreground/90 dark:text-white/80 focus:bg-accent dark:bg-white/[0.06] focus:text-foreground dark:text-white py-2.5"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.label}</span>
                      <ProviderDefaultBadge id={p.id} />
                    </div>
                    {p.hint && (
                      <span className="text-[10px] font-mono text-muted-foreground dark:text-white/35 truncate">{p.hint}</span>
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
  audioMode = "sub",
  onSelect,
  className,
  compact,
  streamCaps,
}: {
  value: KittyProvider;
  audioMode?: ProviderAudioMode;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  className?: string;
  compact?: boolean;
  streamCaps?: EpisodeStreamCapabilities;
}) {
  return (
    <ProviderGrid
      provider={value}
      audioMode={audioMode}
      compact={compact}
      onSelect={onSelect}
      className={className}
      streamCaps={streamCaps}
    />
  );
}

const PROVIDER_GRID_ROWS: ProviderAudioMode[] = ["sub", "dub"];

const PROVIDER_ROW_STYLES: Record<
  ProviderAudioMode,
  { active: string; idle: string; label: string }
> = {
  sub: {
    label: "text-teal-300/70",
    active: "bg-teal-500/25 border-teal-400/45 text-teal-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-teal-500/30 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
  },
  dub: {
    label: "text-amber-300/70",
    active: "bg-amber-500/25 border-amber-400/45 text-amber-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-amber-500/30 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
  },
  hardsub: {
    label: "text-sky-300/70",
    active: "bg-sky-500/25 border-sky-400/45 text-sky-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-sky-500/30 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
  },
  multi: {
    label: "text-zinc-300/70",
    active: "bg-primary/25 border-primary/45 text-zinc-100",
    idle: "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:border-primary/30 hover:text-zinc-200/80 hover:bg-primary/[0.06]",
  },
};

type ProviderGridProps = {
  provider: KittyProvider;
  audioMode: ProviderAudioMode;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  disabled?: boolean;
  className?: string;
  rows?: ProviderAudioMode[];
  compact?: boolean;
  streamCaps?: EpisodeStreamCapabilities;
};

function ProviderScrollRow({
  compact,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  if (!compact) {
    return <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">{children}</div>;
  }
  return (
    <div className="overflow-x-auto overscroll-x-contain px-2.5 pb-2.5 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex flex-nowrap gap-1.5 w-max min-w-full">{children}</div>
    </div>
  );
}

function providerPillClass(
  compact: boolean | undefined,
  isActive: boolean,
  _styles: (typeof PROVIDER_ROW_STYLES)[ProviderAudioMode],
  providerId: KittyProvider,
) {
  return cn(
    providerPillAccentClass(providerId, isActive),
    compact ? "min-h-9 px-3 py-2 text-xs rounded-lg" : "px-2.5 py-1.5 text-[11px] rounded-md",
  );
}

export function ProviderGrid({
  provider,
  audioMode,
  onSelect,
  disabled,
  className,
  rows,
  compact,
  streamCaps,
}: ProviderGridProps) {
  const t = useT();
  const { providerSectionHidden, toggleProviderSectionHidden, providerOrder, defaultProvider, showAdultContent } = useSettingsStore();
  const visibleRows = rows ?? PROVIDER_GRID_ROWS;
  const [expandedRows, setExpandedRows] = useState<Partial<Record<ProviderAudioMode, boolean>>>({});

  const rowLabels: Partial<Record<ProviderAudioMode, string>> = {
    sub: t("watch.softSubBadge"),
    dub: t("card.dub"),
  };

  const rowIcons: Partial<Record<ProviderAudioMode, ReactNode>> = {
    sub: <Captions className="w-3 h-3 shrink-0" />,
    dub: <Mic className="w-3 h-3 shrink-0" />,
  };

  return (
    <div className={cn("flex flex-col w-full", compact ? "gap-2.5" : "gap-2", className)}>
      {compact && (
        <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 leading-relaxed px-0.5">
          {t("watch.providerSectionsMobileHint")}
        </p>
      )}
      {visibleRows.map((mode) => {
        const baseItems = kittyProvidersForAudioMode(mode, { includeAdult: showAdultContent });
        const items = sortProvidersForPicker(baseItems, {
          priorityOrder: providerOrder,
          defaultProvider,
        });
        if (items.length === 0) return null;
        const styles = PROVIDER_ROW_STYLES[mode];
        const isHidden = providerSectionHidden[mode] ?? false;
        const activeItem = items.find((p) => provider === p.id && audioMode === mode);

        const rowExpanded = !!expandedRows[mode];
        const defaultVisible = compact ? 6 : 9;
        const collapsible = items.length > defaultVisible + 2;
        let visibleItems = items;
        if (collapsible && !rowExpanded) {
          visibleItems = items.slice(0, defaultVisible);
          if (activeItem && !visibleItems.some((p) => p.id === activeItem.id)) {
            visibleItems = [...visibleItems, activeItem];
          }
        }
        const hiddenCount = items.length - visibleItems.length;

        const providerPills = visibleItems.map((p) => {
          const isActive = provider === p.id && audioMode === mode;
          const rowCaps = streamCaps?.providers?.[p.id] ?? null;
          const badges = providerCapabilityBadges(rowCaps);

          return (
            <button
              key={`${mode}-${p.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id, mode)}
              title={p.hint}
              className={providerPillClass(compact, isActive, styles, p.id)}
            >
              <span className="truncate max-w-[8.5rem] sm:max-w-none">{p.label}</span>
              <ProviderCapabilityBadge caps={badges} compact />
              <ProviderDefaultBadge id={p.id} compact />
            </button>
          );
        });

        const moreToggle = collapsible ? (
          <button
            key={`${mode}-more`}
            type="button"
            onClick={() => setExpandedRows((s) => ({ ...s, [mode]: !rowExpanded }))}
            className={cn(
              "inline-flex items-center gap-1 font-mono font-semibold border border-dashed transition-colors shrink-0 touch-manipulation",
              compact ? "min-h-9 px-3 py-2 text-xs rounded-lg" : "px-2 py-1 text-[11px] rounded-md",
              "border-border dark:border-white/12 text-muted-foreground dark:text-white/40 hover:text-foreground/80 dark:hover:text-white/75 hover:border-white/25",
            )}
          >
            {rowExpanded ? t("watch.showLess") : `+${hiddenCount} ${t("watch.more")}`}
            <ChevronDown className={cn("w-3 h-3 opacity-60 transition-transform", rowExpanded && "rotate-180")} />
          </button>
        ) : null;

        const sectionLabel = rowLabels[mode] ?? mode;
        const sectionIcon = rowIcons[mode];

        if (compact) {
          return (
            <div
              key={mode}
              className="rounded-xl border border-border dark:border-white/[0.08] bg-gradient-to-b from-muted/30 to-transparent dark:from-white/[0.03] dark:to-transparent overflow-hidden shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleProviderSectionHidden(mode)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-11 touch-manipulation transition-colors active:bg-muted/50 dark:bg-white/[0.04]",
                  isHidden && "border-b border-border dark:border-white/[0.06]",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("shrink-0", styles.label)}>{sectionIcon}</span>
                  <span className={cn("text-[11px] font-bold font-mono uppercase tracking-wide", styles.label)}>
                    {sectionLabel}
                  </span>
                  {!isHidden && (
                    <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30 tabular-nums">
                      {items.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isHidden && activeItem && (
                    <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-md border", styles.active)}>
                      {activeItem.label}
                    </span>
                  )}
                  {isHidden ? (
                    <EyeOff className="w-3.5 h-3.5 opacity-60" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 opacity-40" />
                  )}
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 opacity-40 transition-transform",
                      !isHidden && "rotate-180",
                    )}
                  />
                </div>
              </button>
              {!isHidden && (
                <ProviderScrollRow compact>
                  {providerPills}
                  {moreToggle}
                </ProviderScrollRow>
              )}
            </div>
          );
        }

        return (
          <div
            key={mode}
            className="rounded-xl border border-border dark:border-white/[0.06] bg-muted/20 dark:bg-white/[0.015] px-2.5 py-2 flex items-start gap-2 min-w-0"
          >
            <button
              type="button"
              onClick={() => toggleProviderSectionHidden(mode)}
              title={
                isHidden
                  ? t("watch.showProviderSection", { section: sectionLabel })
                  : t("watch.hideProviderSection", { section: sectionLabel })
              }
              className={cn(
                "flex items-center gap-1 w-14 shrink-0 pt-1.5 text-[10px] font-bold font-mono uppercase tracking-wide transition-opacity hover:opacity-100 touch-manipulation",
                styles.label,
                isHidden && "opacity-60",
              )}
            >
              {isHidden ? (
                <ChevronRight className="w-3 h-3 shrink-0" />
              ) : (
                sectionIcon
              )}
              <span className="truncate">{sectionLabel}</span>
              {isHidden ? (
                <EyeOff className="w-2.5 h-2.5 shrink-0 opacity-70" />
              ) : (
                <Eye className="w-2.5 h-2.5 shrink-0 opacity-40" />
              )}
            </button>
            {!isHidden ? (
              <ProviderScrollRow compact={false}>
                {providerPills}
                {moreToggle}
              </ProviderScrollRow>
            ) : activeItem ? (
              <div className="flex flex-wrap gap-1.5 min-w-0 flex-1 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold border",
                    styles.active,
                  )}
                >
                  {activeItem.label}
                </span>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export { DEFAULT_KITTY_PROVIDER };
