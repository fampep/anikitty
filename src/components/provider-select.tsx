"use client";

import { type ReactNode } from "react";
import { Captions, ChevronDown, Mic, Server, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ANIMEX_SERVERS, type AnimexServerId } from "@/lib/animex-api";
import { MIRURO_PIPE_PROVIDERS, type MiruroPipeProviderId } from "@/lib/miruro-api";
import {
  DEFAULT_KITTY_PROVIDER,
  KITTY_PROVIDER_META,
  MULTI_ROW_PROVIDERS,
  kittyProvidersByGroup,
  type KittyProviderMeta,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty-providers";
import {
  providerVisibleInAudioMode,
  type EpisodeStreamCapabilities,
  type StreamCapabilities,
} from "@/lib/stream-capabilities";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/i18n-provider";

export type MultiPanelProvider = "Miruro" | "Animex";

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{p.label}</span>
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
  audioMode = "sub",
  multiPanel = null,
  miruroPipe,
  animexServer,
  capabilities,
  capabilitiesLoading,
  onSelect,
  onMultiToggle,
  onMiruroPipeChange,
  onAnimexServerChange,
  className,
}: {
  value: KittyProvider;
  audioMode?: ProviderAudioMode;
  multiPanel?: MultiPanelProvider | null;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  capabilities?: EpisodeStreamCapabilities;
  capabilitiesLoading?: boolean;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  onMultiToggle?: (panel: MultiPanelProvider | null) => void;
  onMiruroPipeChange?: (pipe: MiruroPipeProviderId) => void;
  onAnimexServerChange?: (server: AnimexServerId) => void;
  className?: string;
}) {
  return (
    <ProviderGrid
      provider={value}
      audioMode={audioMode}
      multiPanel={multiPanel}
      miruroPipe={miruroPipe}
      animexServer={animexServer}
      capabilities={capabilities}
      capabilitiesLoading={capabilitiesLoading}
      onSelect={onSelect}
      onMultiToggle={onMultiToggle}
      onMiruroPipeChange={onMiruroPipeChange}
      onAnimexServerChange={onAnimexServerChange}
      className={className}
      rows={["sub", "dub", "multi"]}
    />
  );
}

const BADGE_STYLES = {
  sub: "bg-teal-500/15 border-teal-500/25 text-teal-300/90",
  dub: "bg-amber-500/15 border-amber-500/25 text-amber-300/90",
  multi: "bg-violet-500/15 border-violet-500/25 text-violet-300/90",
  subs: "bg-teal-500/15 border-teal-500/25 text-teal-300/90",
  hsub: "bg-sky-500/15 border-sky-500/25 text-sky-300/90",
  ssub: "bg-cyan-500/15 border-cyan-500/25 text-cyan-300/90",
} as const;

function CapabilityBadge({
  label,
  variant,
  icon,
}: {
  label: string;
  variant: keyof typeof BADGE_STYLES;
  icon?: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded px-1 py-px text-[8px] font-mono uppercase leading-none border",
        BADGE_STYLES[variant],
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function StreamCapabilityBadges({
  caps,
  rowMode,
}: {
  caps: StreamCapabilities | null | undefined;
  rowMode?: ProviderAudioMode;
}) {
  const t = useT();
  if (!caps) return null;

  const badges: ReactNode[] = [];

  if (rowMode === "multi" && caps.multi) {
    badges.push(
      <CapabilityBadge key="sub" label={t("card.sub")} variant="sub" />,
      <CapabilityBadge key="dub" label={t("card.dub")} variant="dub" />,
      <CapabilityBadge key="multi" label={t("watch.multi")} variant="multi" />,
    );
  } else if (rowMode === "sub" && caps.sub) {
    badges.push(<CapabilityBadge key="sub" label={t("card.sub")} variant="sub" />);
    if (caps.dub) {
      badges.push(<CapabilityBadge key="dub" label={t("card.dub")} variant="dub" />);
    }
  } else if (rowMode === "dub" && caps.dub) {
    badges.push(<CapabilityBadge key="dub" label={t("card.dub")} variant="dub" />);
    if (caps.sub) {
      badges.push(<CapabilityBadge key="sub" label={t("card.sub")} variant="sub" />);
    }
  } else {
    if (caps.sub) badges.push(<CapabilityBadge key="sub" label={t("card.sub")} variant="sub" />);
    if (caps.dub) badges.push(<CapabilityBadge key="dub" label={t("card.dub")} variant="dub" />);
    if (caps.multi) {
      badges.push(<CapabilityBadge key="multi" label={t("watch.multi")} variant="multi" />);
    }
  }

  if (caps.softSub) {
    badges.push(
      <CapabilityBadge
        key="ssub"
        label={t("watch.softSubBadge")}
        variant="ssub"
        icon={<Captions className="w-2 h-2" />}
      />,
    );
  } else if (caps.hardSub) {
    badges.push(<CapabilityBadge key="hsub" label={t("watch.hardSubBadge")} variant="hsub" />);
  }

  if (badges.length === 0) return null;

  return <span className="inline-flex items-center gap-0.5 shrink-0 flex-wrap">{badges}</span>;
}

function pipeHasEpisode(caps: StreamCapabilities | undefined): boolean {
  return Boolean(caps && (caps.sub || caps.dub || caps.softSub || caps.hardSub));
}

function serverHasEpisode(caps: StreamCapabilities | undefined): boolean {
  return Boolean(caps && (caps.sub || caps.dub));
}

function providersForRow(
  mode: ProviderAudioMode,
  capabilities: EpisodeStreamCapabilities | undefined,
  loading: boolean,
): KittyProviderMeta[] {
  if (loading) {
    return KITTY_PROVIDER_META.filter((p) => {
      if (mode === "multi") return MULTI_ROW_PROVIDERS.has(p.id);
      return !MULTI_ROW_PROVIDERS.has(p.id);
    });
  }

  return KITTY_PROVIDER_META.filter((p) =>
    providerVisibleInAudioMode(p.id, mode, capabilities?.providers[p.id]),
  );
}

const PROVIDER_ROW_STYLES: Record<
  ProviderAudioMode,
  { active: string; idle: string; label: string; expanded: string }
> = {
  sub: {
    label: "text-teal-300/70",
    active: "bg-teal-500/25 border-teal-400/45 text-teal-100",
    idle: "border-white/10 text-white/45 hover:border-teal-500/30 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
    expanded: "",
  },
  dub: {
    label: "text-amber-300/70",
    active: "bg-amber-500/25 border-amber-400/45 text-amber-100",
    idle: "border-white/10 text-white/45 hover:border-amber-500/30 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
    expanded: "",
  },
  multi: {
    label: "text-violet-300/70",
    active: "bg-violet-500/25 border-violet-400/45 text-violet-100",
    idle: "border-white/10 text-white/45 hover:border-violet-500/30 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
    expanded: "ring-1 ring-violet-400/35",
  },
};

type ProviderGridProps = {
  provider: KittyProvider;
  audioMode: ProviderAudioMode;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  multiPanel?: MultiPanelProvider | null;
  onMultiToggle?: (panel: MultiPanelProvider | null) => void;
  miruroPipe?: MiruroPipeProviderId;
  onMiruroPipeChange?: (pipe: MiruroPipeProviderId) => void;
  animexServer?: AnimexServerId;
  onAnimexServerChange?: (server: AnimexServerId) => void;
  capabilities?: EpisodeStreamCapabilities;
  capabilitiesLoading?: boolean;
  disabled?: boolean;
  className?: string;
  rows?: ProviderAudioMode[];
};

export function ProviderGrid({
  provider,
  audioMode,
  onSelect,
  multiPanel = null,
  onMultiToggle,
  miruroPipe,
  onMiruroPipeChange,
  animexServer,
  onAnimexServerChange,
  capabilities,
  capabilitiesLoading = false,
  disabled,
  className,
  rows = ["sub", "dub", "multi"],
}: ProviderGridProps) {
  const t = useT();
  const capsReady = !capabilitiesLoading && !!capabilities;

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

  const handleMultiClick = (p: MultiPanelProvider) => {
    if (provider === p && audioMode === "multi" && multiPanel === p) {
      onMultiToggle?.(null);
      return;
    }
    onSelect(p, "multi");
    onMultiToggle?.(p);
  };

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
      {rows.map((mode) => {
        const items = providersForRow(mode, capabilities, capabilitiesLoading);
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
              {items.map((p) => {
                const isMulti = p.id === "Miruro" || p.id === "Animex";
                const isActive = provider === p.id && audioMode === mode;
                const isExpanded = mode === "multi" && multiPanel === p.id && isActive;
                const providerCaps = capabilities?.providers[p.id];

                return (
                  <button
                    key={`${mode}-${p.id}`}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      isMulti && mode === "multi"
                        ? handleMultiClick(p.id as MultiPanelProvider)
                        : onSelect(p.id, mode)
                    }
                    title={p.hint}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40 disabled:pointer-events-none",
                      isActive ? styles.active : styles.idle,
                      isExpanded && styles.expanded,
                      capabilitiesLoading && "opacity-60 animate-pulse",
                      p.id === "Animex" && isActive && "border-rose-400/40 bg-rose-500/20 text-rose-100",
                    )}
                  >
                    <span className="truncate">{p.label}</span>
                    {capsReady && (
                      <StreamCapabilityBadges caps={providerCaps} rowMode={mode} />
                    )}
                    {isMulti && mode === "multi" && (
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 opacity-60 transition-transform",
                          isExpanded && "rotate-180",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {multiPanel === "Miruro" && provider === "Miruro" && onMiruroPipeChange && miruroPipe != null && (
        <MultiServerPanel accent="violet" label={t("watch.miruroPipe")}>
          <div className="flex flex-wrap gap-1.5">
            {MIRURO_PIPE_PROVIDERS.filter((p) =>
              capabilitiesLoading || pipeHasEpisode(capabilities?.miruroPipes[p.id]),
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => onMiruroPipeChange(p.id)}
                title={p.native ? undefined : "embed"}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                  miruroPipe === p.id
                    ? "bg-violet-500/25 border-violet-400/45 text-violet-100"
                    : "border-white/10 text-white/45 hover:border-violet-500/30 hover:text-violet-200/80 hover:bg-violet-500/[0.06]",
                  capabilitiesLoading && "opacity-60 animate-pulse",
                )}
              >
                <span>{p.native ? p.label : `${p.label}*`}</span>
                {capsReady && (
                  <StreamCapabilityBadges caps={capabilities?.miruroPipes[p.id]} />
                )}
              </button>
            ))}
          </div>
        </MultiServerPanel>
      )}

      {multiPanel === "Animex" && provider === "Animex" && onAnimexServerChange && animexServer != null && (
        <MultiServerPanel accent="rose" label={t("watch.animexServer")}>
          <div className="flex flex-wrap gap-1.5">
            {ANIMEX_SERVERS.filter((s) =>
              capabilitiesLoading || serverHasEpisode(capabilities?.animexServers[s.id]),
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => onAnimexServerChange(s.id)}
                title={s.hint}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                  animexServer === s.id
                    ? "bg-rose-500/25 border-rose-400/45 text-rose-100"
                    : "border-white/10 text-white/45 hover:border-rose-500/30 hover:text-rose-200/80 hover:bg-rose-500/[0.06]",
                  capabilitiesLoading && "opacity-60 animate-pulse",
                )}
              >
                <span>{s.label}</span>
                {capsReady && (
                  <StreamCapabilityBadges caps={capabilities?.animexServers[s.id]} />
                )}
              </button>
            ))}
          </div>
        </MultiServerPanel>
      )}
    </div>
  );
}

function MultiServerPanel({
  label,
  accent,
  children,
}: {
  label: string;
  accent: "violet" | "rose";
  children: ReactNode;
}) {
  const border =
    accent === "rose" ? "border-rose-500/25 bg-rose-500/[0.04]" : "border-violet-500/25 bg-violet-500/[0.04]";
  const text = accent === "rose" ? "text-rose-300/70" : "text-violet-300/70";

  return (
    <div className={cn("ml-14 rounded-lg border px-2.5 py-2", border)}>
      <p className={cn("text-[10px] font-mono uppercase tracking-wide mb-2", text)}>{label}</p>
      {children}
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
