"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Captions,
  ChevronDown,
  Check,
  CircleCheck,
  CircleX,
  Flame,
  Loader2,
  Mic,
  Server,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DEFAULT_KITTY_PROVIDER,
  getKittyProviderLabel,
  getKittyProviderNumber,
  kittyProvidersByGroup,
  kittyProvidersForAudioMode,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { getPreferredDefaultProvider } from "@/lib/kitty/provider-order";
import type { EpisodeStreamCapabilities } from "@/lib/kitty/stream-capabilities-shared";
import {
  buildAvailableProviderSet,
  isProviderAvailableForMode,
  providerCapabilityBadges,
  resolveProviderBadgeCaps,
} from "@/lib/kitty/provider-picker-utils";
import {
  getProviderOutcomeStatus,
  sortProvidersForPicker,
  type ProviderOutcomeStatus,
} from "@/lib/kitty/provider-prefs";
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
        "inline-flex items-center gap-1 font-mono font-bold tracking-tight",
        compact ? "text-[8px]" : "text-[9px]",
      )}
      title={[caps.sub ? "SUB" : null, caps.dub ? "DUB" : null].filter(Boolean).join(" · ")}
    >
      {caps.sub && (
        <span className="rounded px-1 py-px border border-teal-400/30 bg-teal-500/10 text-teal-200/90">
          SUB
        </span>
      )}
      {caps.dub && (
        <span className="rounded px-1 py-px border border-amber-400/30 bg-amber-500/10 text-amber-200/90">
          DUB
        </span>
      )}
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

function ProviderSelectedBadge({ compact }: { compact?: boolean }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 font-mono font-bold uppercase rounded border shrink-0 border-emerald-400/40 bg-emerald-500/15 text-emerald-200/90",
        compact ? "text-[8px] px-1 py-px leading-tight" : "text-[9px] px-1.5 py-0.5",
      )}
    >
      <Check className={cn(compact ? "w-2 h-2" : "w-2.5 h-2.5")} />
      {t("watch.providerSelectedBadge")}
    </span>
  );
}

function OutcomeDot({
  status,
  available,
}: {
  status: ProviderOutcomeStatus | null;
  available: boolean;
}) {
  const t = useT();
  if (!available) {
    return (
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0 bg-zinc-500/50"
        title={t("watch.providerUnavailable")}
      />
    );
  }
  if (!status) {
    return (
      <span
        className="h-1.5 w-1.5 rounded-full shrink-0 bg-teal-400/70"
        title={t("watch.providerAvailable")}
      />
    );
  }
  const meta =
    status === "reliable"
      ? { className: "bg-emerald-400", title: t("watch.providerStatusReliable") }
      : status === "mixed"
        ? { className: "bg-amber-400", title: t("watch.providerStatusMixed") }
        : { className: "bg-rose-400", title: t("watch.providerStatusUnreliable") };
  return <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.className)} title={meta.title} />;
}

function ProviderAvailabilityIcon({
  provider,
  mode,
  streamCaps,
  capsLoading,
}: {
  provider: KittyProvider;
  mode: ProviderAudioMode;
  streamCaps?: EpisodeStreamCapabilities;
  capsLoading?: boolean;
}) {
  const t = useT();
  const hasCaps = Boolean(streamCaps?.providers && Object.keys(streamCaps.providers).length > 0);
  if (!hasCaps) {
    return capsLoading ? (
      <Loader2
        className="h-3.5 w-3.5 shrink-0 animate-spin text-white/30"
        aria-label={t("watch.episodeSourceChecking", { episode: "" })}
      />
    ) : (
      <span
        className="h-2 w-2 rounded-full bg-white/25"
        title={t("watch.providerStatusMixed")}
      />
    );
  }

  const available = isProviderAvailableForMode(provider, mode, streamCaps);
  return available ? (
    <CircleCheck
      className="h-3.5 w-3.5 shrink-0 text-emerald-300"
      aria-label={t("watch.providerAvailable")}
    />
  ) : (
    <CircleX
      className="h-3.5 w-3.5 shrink-0 text-rose-300/80"
      aria-label={t("watch.providerUnavailable")}
    />
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
  /** When true, render a compact SOURCE button that opens a bottom sheet. */
  sheetTrigger?: boolean;
}) {
  const [audioOpen, setAudioOpen] = useState(false);
  const [serverOpen, setServerOpen] = useState(false);
  const t = useT();
  const label = getKittyProviderLabel(value);
  const { providerOrder, defaultProvider, showAdultContent } = useSettingsStore();
  const selectedAccent = getProviderAccent(value);
  const selectedMode = audioMode === "dub" ? "dub" : audioMode === "hardsub" ? "hardsub" : "sub";
  const selectedModeMeta = TAB_STYLES[selectedMode];
  const modeChoices = useMemo(
    () =>
      (["sub", "hardsub", "dub"] as ProviderAudioMode[]).map((mode) => {
        const providers = kittyProvidersForAudioMode(mode, { includeAdult: showAdultContent });
        return {
          mode,
          count: providers.length,
          label:
            mode === "dub"
              ? t("watch.providerTabDub")
              : mode === "hardsub"
                ? t("watch.providerTabHSubs")
                : t("watch.providerTabSub"),
        };
      }),
    [showAdultContent, t],
  );
  const serverItems = useMemo(() => {
    const providers = kittyProvidersForAudioMode(selectedMode, { includeAdult: showAdultContent });
    return sortProvidersForPicker(providers, {
      priorityOrder: providerOrder,
      defaultProvider,
      availableIds: buildAvailableProviderSet(streamCaps, selectedMode),
    });
  }, [selectedMode, showAdultContent, providerOrder, defaultProvider, streamCaps]);

  return (
    <div
      className={cn(
        "anikitty-source-deck flex w-full flex-wrap items-center gap-2",
        className,
      )}
    >
      <Popover open={audioOpen} onOpenChange={setAudioOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "anikitty-source-trigger anikitty-source-trigger--audio site-focus inline-flex min-w-[8.5rem] flex-1 items-center gap-2 sm:flex-none",
            )}
          >
            <span className={cn("text-white/55", selectedModeMeta.label)}>{selectedModeMeta.icon}</span>
            <span className="truncate">
              {selectedMode === "dub"
                ? t("watch.providerTabDub")
                : selectedMode === "hardsub"
                  ? t("watch.providerTabHSubs")
                  : t("watch.providerTabSub")}
            </span>
            <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-white/35" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={8} className="anikitty-source-menu w-[13.5rem] p-1.5">
          <div className="space-y-1">
            {modeChoices.map(({ mode, label: modeLabel, count }) => {
              const styles = TAB_STYLES[mode];
              const active = mode === selectedMode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    onSelect(value, mode);
                    setAudioOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12px] font-mono font-bold transition-all",
                    active
                      ? styles.active
                      : "border-transparent text-white/65 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white",
                  )}
                >
                  <span className={cn(!active && styles.label)}>{styles.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{modeLabel}</span>
                  <span className="rounded-md bg-white/[0.07] px-1.5 py-0.5 text-[10px] text-white/45">
                    {count}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Popover open={serverOpen} onOpenChange={setServerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "anikitty-source-trigger anikitty-source-trigger--server site-focus inline-flex min-w-[11rem] flex-[2] items-center gap-2 sm:flex-none sm:min-w-[14rem]",
              selectedAccent.chip,
            )}
          >
            <Server className="h-3.5 w-3.5 shrink-0 text-white/50" />
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", selectedAccent.dot)} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="hidden rounded-md bg-black/20 px-1.5 py-0.5 text-[10px] text-white/45 sm:inline">
              {serverItems.length}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/35" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={8}
          className="anikitty-source-menu w-[min(24rem,calc(100vw-1.5rem))] p-0"
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-2.5">
            <div className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.12em] text-white/45">
              <Server className="h-3.5 w-3.5" />
              {t("watch.providerPickTitle")} ({serverItems.length})
            </div>
            {capsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />}
          </div>
          <div className="max-h-[min(24rem,62vh)] overflow-y-auto overscroll-contain p-1.5">
            {serverItems.map((p) => {
              const active = p.id === value;
              const accent = getProviderAccent(p.id);
              const num = getKittyProviderNumber(p.id, providerOrder);
              const rowCaps = resolveProviderBadgeCaps(streamCaps, p.id);
              const badges = providerCapabilityBadges(rowCaps);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelect(p.id, selectedMode);
                    setServerOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-all",
                    active
                      ? cn(providerPillAccentClass(p.id, true), "border-opacity-100")
                      : "border-transparent text-white/70 hover:translate-x-0.5 hover:border-white/[0.08] hover:bg-white/[0.055] hover:text-white",
                  )}
                >
                  <ProviderRankIcon rank={num} compact />
                  <ProviderAvailabilityIcon
                    provider={p.id}
                    mode={selectedMode}
                    streamCaps={streamCaps}
                    capsLoading={capsLoading}
                  />
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-wide">
                    {p.label}
                  </span>
                  <ProviderCapabilityBadge caps={badges} compact loading={capsLoading} />
                  <ProviderDefaultBadge id={p.id} compact />
                  {active && <Check className="h-3.5 w-3.5 shrink-0 text-white/80" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

const PROVIDER_GRID_TABS: ProviderAudioMode[] = ["sub", "hardsub", "dub"];

const TAB_STYLES: Record<
  ProviderAudioMode,
  { active: string; idle: string; label: string; icon: ReactNode }
> = {
  sub: {
    label: "text-teal-300/80",
    active: "bg-teal-500/20 border-teal-400/40 text-teal-50",
    idle: "border-transparent text-muted-foreground dark:text-white/40 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
    icon: <Captions className="w-3.5 h-3.5 shrink-0" />,
  },
  hardsub: {
    label: "text-sky-300/80",
    active: "bg-sky-500/20 border-sky-400/40 text-sky-50",
    idle: "border-transparent text-muted-foreground dark:text-white/40 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
    icon: <Flame className="w-3.5 h-3.5 shrink-0" />,
  },
  dub: {
    label: "text-amber-300/80",
    active: "bg-amber-500/20 border-amber-400/40 text-amber-50",
    idle: "border-transparent text-muted-foreground dark:text-white/40 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
    icon: <Mic className="w-3.5 h-3.5 shrink-0" />,
  },
  multi: {
    label: "text-zinc-300/80",
    active: "bg-primary/20 border-primary/40 text-zinc-50",
    idle: "border-transparent text-muted-foreground dark:text-white/40",
    icon: null,
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

export function ProviderGrid({
  provider,
  audioMode,
  onSelect,
  disabled,
  className,
  rows,
  streamCaps,
  capsLoading,
}: ProviderGridProps) {
  const t = useT();
  const { providerOrder, defaultProvider, showAdultContent } = useSettingsStore();
  const tabs = rows ?? PROVIDER_GRID_TABS;
  const [activeTab, setActiveTab] = useState<ProviderAudioMode>(
    tabs.includes(audioMode) ? audioMode : "sub",
  );

  useEffect(() => {
    if (tabs.includes(audioMode)) setActiveTab(audioMode);
  }, [audioMode, tabs]);

  const tab = activeTab;
  const preferredDefault = getPreferredDefaultProvider(providerOrder, defaultProvider);

  const tabCounts = useMemo(() => {
    const out: Partial<Record<ProviderAudioMode, number>> = {};
    for (const mode of tabs) {
      const base = kittyProvidersForAudioMode(mode, { includeAdult: showAdultContent });
      out[mode] = base.length;
    }
    return out;
  }, [tabs, showAdultContent]);

  const items = useMemo(() => {
    const base = kittyProvidersForAudioMode(tab, { includeAdult: showAdultContent });
    const available = buildAvailableProviderSet(streamCaps, tab);
    return sortProvidersForPicker(base, {
      priorityOrder: providerOrder,
      defaultProvider,
      availableIds: available,
    });
  }, [tab, showAdultContent, streamCaps, providerOrder, defaultProvider]);

  const recommended = useMemo(() => {
    if (items.length === 0) return null;
    const preferred = items.find((p) => p.id === preferredDefault);
    if (preferred) return preferred;
    return items[0] ?? null;
  }, [items, preferredDefault]);

  const roster = useMemo(() => {
    if (!recommended) return items;
    return items.filter((p) => p.id !== recommended.id);
  }, [items, recommended]);

  const tabLabels: Partial<Record<ProviderAudioMode, string>> = {
    sub: t("watch.providerTabSub"),
    hardsub: t("watch.providerTabHSubs"),
    dub: t("watch.providerTabDub"),
  };

  const selectTab = (mode: ProviderAudioMode) => {
    setActiveTab(mode);
  };

  const renderRow = (
    p: (typeof items)[number],
    opts?: { recommendedCard?: boolean },
  ) => {
    const isActive = provider === p.id && audioMode === tab;
    const num = getKittyProviderNumber(p.id, providerOrder);
    const rowCaps = resolveProviderBadgeCaps(streamCaps, p.id);
    const badges = providerCapabilityBadges(rowCaps);
    const available = isProviderAvailableForMode(p.id, tab, streamCaps);
    const outcome = getProviderOutcomeStatus(p.id);
    const accent = getProviderAccent(p.id);

    if (opts?.recommendedCard) {
      return (
        <button
          key={`rec-${tab}-${p.id}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p.id, tab)}
          aria-pressed={isActive}
          className={cn(
            "w-full text-left rounded-xl border px-3.5 py-3 transition-colors touch-manipulation",
            "bg-gradient-to-br from-teal-500/[0.12] via-transparent to-transparent",
            isActive
              ? "border-teal-400/45 shadow-[0_0_0_1px_rgba(45,212,191,0.15)]"
              : "border-border/80 dark:border-white/12 hover:border-teal-400/30",
          )}
        >
          <div className="flex items-start gap-3">
            <ProviderRankIcon rank={num} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-teal-300/70">
                  {t("watch.providerGroupFeatured")}
                </span>
                <ProviderDefaultBadge id={p.id} />
                {isActive && <ProviderSelectedBadge />}
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <OutcomeDot status={outcome} available={available} />
                <span className="text-sm font-semibold tracking-wide text-foreground dark:text-white/90 truncate">
                  {p.label}
                </span>
                <ProviderCapabilityBadge caps={badges} loading={capsLoading} />
              </div>
              {p.hint && (
                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/35 truncate">
                  {p.hint}
                </p>
              )}
            </div>
          </div>
        </button>
      );
    }

    return (
      <button
        key={`${tab}-${p.id}`}
        type="button"
        disabled={disabled}
        onClick={() => onSelect(p.id, tab)}
        aria-pressed={isActive}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors touch-manipulation",
          isActive
            ? cn(providerPillAccentClass(p.id, true), "border-opacity-100")
            : "border-border/60 dark:border-white/[0.08] bg-muted/20 dark:bg-white/[0.02] hover:bg-muted/40 dark:hover:bg-white/[0.05]",
        )}
      >
        <ProviderRankIcon rank={num} compact />
        <OutcomeDot status={outcome} available={available} />
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-wide">
          {p.label}
        </span>
        <ProviderCapabilityBadge caps={badges} compact loading={capsLoading} />
        <ProviderDefaultBadge id={p.id} compact />
        {isActive && <ProviderSelectedBadge compact />}
      </button>
    );
  };

  return (
    <div className={cn("flex flex-col w-full gap-3", className)}>
      <div
        className="inline-flex w-full rounded-xl border border-border/70 dark:border-white/[0.08] bg-muted/25 dark:bg-black/30 p-1 gap-1"
        role="tablist"
        aria-label={t("watch.providerSelect")}
      >
        {tabs.map((mode) => {
          const styles = TAB_STYLES[mode];
          const count = tabCounts[mode] ?? 0;
          const isOn = tab === mode;
          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={isOn}
              onClick={() => selectTab(mode)}
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-1.5 min-h-10 rounded-lg border text-[11px] font-mono font-bold uppercase tracking-wide transition-colors touch-manipulation",
                isOn ? styles.active : styles.idle,
              )}
            >
              <span className={cn(!isOn && styles.label)}>{styles.icon}</span>
              <span>{tabLabels[mode]}</span>
              <span
                className={cn(
                  "tabular-nums text-[10px] font-semibold rounded-md px-1.5 py-0.5",
                  isOn ? "bg-black/20 text-inherit" : "bg-muted/50 dark:bg-white/[0.06] text-muted-foreground dark:text-white/35",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "hardsub" && items.length === 1 && (
        <p className="text-[11px] font-mono text-sky-200/70 px-0.5 leading-relaxed">
          {t("watch.providerHSubsOnlyHint")}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-[12px] font-mono text-muted-foreground dark:text-white/40 px-1 py-6 text-center">
          {capsLoading ? t("watch.episodeSourceChecking", { episode: "…" }) : t("watch.providerNoSourcesForTab")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {recommended && renderRow(recommended, { recommendedCard: true })}
          {roster.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {roster.map((p) => renderRow(p))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ProviderRankIcon } from "@/components/player/provider-rank-icon";
export { DEFAULT_KITTY_PROVIDER };
