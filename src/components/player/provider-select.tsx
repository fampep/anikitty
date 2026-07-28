"use client";

import { useState, type ReactNode } from "react";
import {
  Captions,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Mic,
  Sparkles,
  Star,
} from "lucide-react";
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
  getKittyProviderNumber,
  kittyProvidersByGroup,
  kittyProvidersForAudioMode,
  RECOMMENDED_PROVIDER_COUNT,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { getPreferredDefaultProvider } from "@/lib/kitty/provider-order";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import {
  providerCapabilityBadges,
  resolveProviderBadgeCaps,
} from "@/lib/kitty/provider-picker-utils";
import { sortProvidersForPicker } from "@/lib/kitty/provider-prefs";
import { getProviderAccent, providerPillClass as providerPillAccentClass } from "@/lib/kitty/provider-ui-styles";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { ProviderRankIcon } from "@/components/player/provider-rank-icon";

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
  loading,
}: {
  caps: { sub: boolean; dub: boolean };
  compact?: boolean;
  /** Soft pulse while episode caps are still probing. */
  loading?: boolean;
}) {
  if (loading && !caps.sub && !caps.dub) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-0.5 font-mono text-muted-foreground/50 dark:text-white/25 animate-pulse",
          compact ? "text-[8px]" : "text-[9px]",
        )}
        aria-hidden
      >
        ··
      </span>
    );
  }
  if (!caps.sub && !caps.dub) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono font-bold tracking-tight",
        compact ? "text-[8px]" : "text-[9px]",
      )}
      title={[caps.sub ? "SUB" : null, caps.dub ? "DUB" : null].filter(Boolean).join(" · ")}
    >
      {caps.sub && <span className="text-teal-300/90">S</span>}
      {caps.dub && <span className="text-amber-300/90">D</span>}
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
        "inline-flex items-center gap-0.5 font-mono font-bold uppercase rounded border shrink-0 border-amber-400/40 bg-amber-500/15 text-amber-200/90",
        compact ? "text-[8px] px-1 py-px leading-tight" : "text-[9px] px-1.5 py-0.5",
      )}
    >
      <Star className={cn(compact ? "w-2 h-2" : "w-2.5 h-2.5", "fill-current")} />
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
  const rank = getKittyProviderNumber(value, providerOrder);
  const accent = getProviderAccent(value);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as KittyProvider)} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "gap-2 transition-colors",
          compact
            ? "h-9 min-w-[10.5rem] rounded-lg text-[11px] font-mono bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/12 text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/[0.07]"
            : "h-10 min-w-[12.5rem] rounded-xl text-xs font-mono bg-muted/50 dark:bg-white/[0.04] border-border dark:border-white/12 text-foreground/85 dark:text-white/75 hover:bg-accent dark:hover:bg-white/[0.07]",
          accent.chip,
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <ProviderRankIcon rank={rank} compact={compact} />
          <SelectValue placeholder={t("watch.providerSelect")}>
            <span className="truncate font-semibold tracking-wide">{getKittyProviderLabel(value)}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent
        className={cn(
          "bg-[#0a0a0f]/98 border-white/10 max-h-[min(24rem,72vh)] min-w-[16rem] p-0",
          "shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)]",
        )}
      >
        <div className="p-1.5 space-y-1">
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
                <SelectLabel className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-white/35 px-2.5 py-2">
                  {group === "featured" ? (
                    <Sparkles className="w-3 h-3 text-teal-300/70" />
                  ) : (
                    <span className="inline-block w-3 h-3 rounded-full border border-white/20" />
                  )}
                  {group === "featured"
                    ? t("watch.providerGroupFeatured")
                    : t("watch.providerGroupOther")}
                </SelectLabel>
                {items.map((p) => {
                  const num = getKittyProviderNumber(p.id, providerOrder);
                  const itemAccent = getProviderAccent(p.id);
                  return (
                    <SelectItem
                      key={p.id}
                      value={p.id}
                      textValue={`${num} ${p.label}`}
                      className={cn(
                        "text-xs text-white/80 rounded-lg py-2.5 pl-2.5 pr-8 my-0.5",
                        "focus:bg-white/[0.07] focus:text-white data-[state=checked]:bg-white/[0.06]",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProviderRankIcon rank={num} />
                        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", itemAccent.dot)} />
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold tracking-wide">{p.label}</span>
                            <ProviderDefaultBadge id={p.id} />
                          </div>
                          {p.hint && (
                            <span className="text-[10px] font-mono text-white/30 truncate">{p.hint}</span>
                          )}
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            );
          })}
        </div>
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
  capsLoading,
}: {
  value: KittyProvider;
  audioMode?: ProviderAudioMode;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  className?: string;
  compact?: boolean;
  streamCaps?: EpisodeStreamCapabilities;
  capsLoading?: boolean;
}) {
  return (
    <ProviderGrid
      provider={value}
      audioMode={audioMode}
      compact={compact}
      onSelect={onSelect}
      className={className}
      streamCaps={streamCaps}
      capsLoading={capsLoading}
    />
  );
}

const PROVIDER_GRID_ROWS: ProviderAudioMode[] = ["sub", "hardsub", "dub"];

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
  capsLoading?: boolean;
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
    <div className="relative">
      <div className="overflow-x-auto overscroll-x-contain px-2.5 pb-2.5 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-nowrap gap-1.5 w-max min-w-full pr-6">{children}</div>
      </div>
      <div
        className="pointer-events-none absolute inset-y-0.5 right-0 w-7 bg-gradient-to-l from-[#0c0c0c]/90 via-[#0c0c0c]/40 to-transparent dark:from-black/70"
        aria-hidden
      />
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
    compact
      ? "min-h-10 px-3.5 py-2 text-[13px] rounded-lg"
      : "px-2.5 py-1.5 text-[12px] rounded-md",
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
  capsLoading,
}: ProviderGridProps) {
  const t = useT();
  const { providerSectionHidden, toggleProviderSectionHidden, providerOrder, defaultProvider, showAdultContent } = useSettingsStore();
  const visibleRows = rows ?? PROVIDER_GRID_ROWS;
  const [expandedRows, setExpandedRows] = useState<Partial<Record<ProviderAudioMode, boolean>>>({});

  const rowLabels: Partial<Record<ProviderAudioMode, string>> = {
    sub: t("watch.softSubBadge"),
    hardsub: t("watch.hardSubsShort"),
    dub: t("card.dub"),
  };

  const rowIcons: Partial<Record<ProviderAudioMode, ReactNode>> = {
    sub: <Captions className="w-3 h-3 shrink-0" />,
    hardsub: <Flame className="w-3 h-3 shrink-0" />,
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

        const recommendedItems = items.filter((p) => {
          const n = getKittyProviderNumber(p.id, providerOrder);
          return n > 0 && n <= RECOMMENDED_PROVIDER_COUNT;
        });
        const moreItems = items.filter((p) => {
          const n = getKittyProviderNumber(p.id, providerOrder);
          return n === 0 || n > RECOMMENDED_PROVIDER_COUNT;
        });

        const renderPill = (p: (typeof items)[number]) => {
          const isActive = provider === p.id && audioMode === mode;
          const rowCaps = resolveProviderBadgeCaps(streamCaps, p.id);
          const badges = providerCapabilityBadges(rowCaps);
          const num = getKittyProviderNumber(p.id, providerOrder);

          return (
            <button
              key={`${mode}-${p.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id, mode)}
              title={p.hint ? `${num}. ${p.label} — ${p.hint}` : `${num}. ${p.label}`}
              aria-pressed={isActive}
              className={cn(providerPillClass(compact, isActive, styles, p.id), "gap-1.5")}
            >
              <ProviderRankIcon rank={num} compact />
              <span className="truncate max-w-[9.5rem] sm:max-w-none font-semibold tracking-wide">
                {p.label}
              </span>
              <ProviderCapabilityBadge caps={badges} compact loading={capsLoading} />
              <ProviderDefaultBadge id={p.id} compact />
            </button>
          );
        };

        const rowExpanded = !!expandedRows[mode];
        const defaultVisibleMore = compact ? 4 : 6;
        const collapsible = moreItems.length > defaultVisibleMore + 1;
        let visibleMore = moreItems;
        if (collapsible && !rowExpanded) {
          visibleMore = moreItems.slice(0, defaultVisibleMore);
          if (activeItem && moreItems.some((p) => p.id === activeItem.id) && !visibleMore.some((p) => p.id === activeItem.id)) {
            visibleMore = [...visibleMore, activeItem];
          }
        }
        const hiddenCount = moreItems.length - visibleMore.length;

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

        const providerPills = (
          <>
            {recommendedItems.length > 0 && (
              <div className={cn("flex flex-col gap-1.5 min-w-0", compact ? "w-max" : "w-full")}>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-teal-300/55 px-0.5">
                  <Sparkles className="w-3 h-3" />
                  {t("watch.providerGroupFeatured")}
                </span>
                <div className="flex flex-wrap gap-1.5">{recommendedItems.map(renderPill)}</div>
              </div>
            )}
            {moreItems.length > 0 && (
              <div className={cn("flex flex-col gap-1.5 min-w-0", compact ? "w-max" : "w-full")}>
                <span className="inline-flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/30 px-0.5">
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-current opacity-60" />
                  {t("watch.providerGroupOther")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {visibleMore.map(renderPill)}
                  {moreToggle}
                </div>
              </div>
            )}
          </>
        );

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
                    <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-md border", styles.active)}>
                      <ProviderRankIcon
                        rank={getKittyProviderNumber(activeItem.id, providerOrder)}
                        compact
                      />
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
                <div className="px-2.5 pb-2.5 pt-0.5 flex flex-col gap-2.5">{providerPills}</div>
              )}
            </div>
          );
        }

        return (
          <div
            key={mode}
            className="flex min-w-0 items-start gap-2.5 px-0.5 py-0.5"
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
                "flex w-[4.25rem] shrink-0 items-center gap-1 pt-1.5 text-[11px] font-bold font-mono uppercase tracking-wide transition-opacity hover:opacity-100 touch-manipulation",
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
            </button>
            {!isHidden ? (
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">{providerPills}</div>
            ) : activeItem ? (
              <div className="flex min-w-0 flex-1 flex-wrap gap-1.5 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold",
                    styles.active,
                  )}
                >
                  <ProviderRankIcon
                    rank={getKittyProviderNumber(activeItem.id, providerOrder)}
                    compact
                  />
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

export { ProviderRankIcon } from "@/components/player/provider-rank-icon";
export { DEFAULT_KITTY_PROVIDER };
