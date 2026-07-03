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
import { ANIMEX_SERVERS, type AnimexServerId } from "@/lib/providers/animex-api";
import { ANISNATCH_SERVERS, type AnisnatchServerId } from "@/lib/providers/anisnatch-api";
import { LUNAR_SERVERS, type LunarServerId } from "@/lib/providers/lunar-api";
import {
  ALLANIME_MIRROR_OPTIONS,
  MKISSA_MIRROR_OPTIONS,
  type AllanimeMirrorId,
} from "@/lib/providers/allanime-api";
import { ANIMO_SERVERS, type AnimoServerId } from "@/lib/providers/animo-api";
import { MIRURO_PIPE_PROVIDERS, type MiruroPipeProviderId } from "@/lib/providers/miruro-api";
import {
  DEFAULT_KITTY_PROVIDER,
  kittyProvidersByGroup,
  kittyProvidersForAudioMode,
  MULTI_ROW_PROVIDERS,
  type KittyProvider,
  type ProviderAudioMode,
} from "@/lib/kitty/kitty-providers";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";

export type MultiPanelProvider = "Miruro" | "Animex" | "AniSnatch" | "Lunar" | "AllAnime" | "MKissa";

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
          value === "Animo" && "border-cyan-500/25 bg-cyan-500/[0.06] text-cyan-100/85",
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
  anisnatchServer,
  lunarServer,
  allanimeMirror,
  mkissaMirror,
  animoServer,
  onSelect,
  onMultiToggle,
  onMiruroPipeChange,
  onAnimexServerChange,
  onAnisnatchServerChange,
  onLunarServerChange,
  onAllanimeMirrorChange,
  onMkissaMirrorChange,
  onAnimoServerChange,
  className,
}: {
  value: KittyProvider;
  audioMode?: ProviderAudioMode;
  multiPanel?: MultiPanelProvider | null;
  miruroPipe?: MiruroPipeProviderId;
  animexServer?: AnimexServerId;
  anisnatchServer?: AnisnatchServerId;
  lunarServer?: LunarServerId;
  allanimeMirror?: AllanimeMirrorId;
  mkissaMirror?: AllanimeMirrorId;
  animoServer?: AnimoServerId;
  onSelect: (provider: KittyProvider, mode: ProviderAudioMode) => void;
  onMultiToggle?: (panel: MultiPanelProvider | null) => void;
  onMiruroPipeChange?: (pipe: MiruroPipeProviderId) => void;
  onAnimexServerChange?: (server: AnimexServerId) => void;
  onAnisnatchServerChange?: (server: AnisnatchServerId) => void;
  onLunarServerChange?: (server: LunarServerId) => void;
  onAllanimeMirrorChange?: (mirror: AllanimeMirrorId) => void;
  onMkissaMirrorChange?: (mirror: AllanimeMirrorId) => void;
  onAnimoServerChange?: (server: AnimoServerId) => void;
  className?: string;
}) {
  return (
    <ProviderGrid
      provider={value}
      audioMode={audioMode}
      multiPanel={multiPanel}
      miruroPipe={miruroPipe}
      animexServer={animexServer}
      anisnatchServer={anisnatchServer}
      lunarServer={lunarServer}
      allanimeMirror={allanimeMirror}
      mkissaMirror={mkissaMirror}
      animoServer={animoServer}
      onSelect={onSelect}
      onMultiToggle={onMultiToggle}
      onMiruroPipeChange={onMiruroPipeChange}
      onAnimexServerChange={onAnimexServerChange}
      onAnisnatchServerChange={onAnisnatchServerChange}
      onLunarServerChange={onLunarServerChange}
      onAllanimeMirrorChange={onAllanimeMirrorChange}
      onMkissaMirrorChange={onMkissaMirrorChange}
      onAnimoServerChange={onAnimoServerChange}
      className={className}
    />
  );
}

const PROVIDER_GRID_ROWS: ProviderAudioMode[] = ["sub", "dub", "hardsub", "multi"];

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
  hardsub: {
    label: "text-sky-300/70",
    active: "bg-sky-500/25 border-sky-400/45 text-sky-100",
    idle: "border-white/10 text-white/45 hover:border-sky-500/30 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
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
  anisnatchServer?: AnisnatchServerId;
  onAnisnatchServerChange?: (server: AnisnatchServerId) => void;
  lunarServer?: LunarServerId;
  onLunarServerChange?: (server: LunarServerId) => void;
  allanimeMirror?: AllanimeMirrorId;
  onAllanimeMirrorChange?: (mirror: AllanimeMirrorId) => void;
  mkissaMirror?: AllanimeMirrorId;
  onMkissaMirrorChange?: (mirror: AllanimeMirrorId) => void;
  animoServer?: AnimoServerId;
  onAnimoServerChange?: (server: AnimoServerId) => void;
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
  anisnatchServer,
  onAnisnatchServerChange,
  lunarServer,
  onLunarServerChange,
  allanimeMirror,
  onAllanimeMirrorChange,
  mkissaMirror,
  onMkissaMirrorChange,
  animoServer,
  onAnimoServerChange,
  disabled,
  className,
  rows,
}: ProviderGridProps) {
  const t = useT();
  const visibleRows = rows ?? PROVIDER_GRID_ROWS;

  const rowLabels: Record<ProviderAudioMode, string> = {
    sub: t("card.sub"),
    dub: t("card.dub"),
    hardsub: t("watch.hardSubBadge"),
    multi: t("watch.multi"),
  };

  const rowIcons: Record<ProviderAudioMode, ReactNode> = {
    sub: <Captions className="w-3 h-3 shrink-0" />,
    dub: <Mic className="w-3 h-3 shrink-0" />,
    hardsub: <Captions className="w-3 h-3 shrink-0" />,
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
      {visibleRows.map((mode) => {
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
              {items.map((p) => {
                const isMulti = MULTI_ROW_PROVIDERS.has(p.id);
                const isActive = provider === p.id && audioMode === mode;
                const isExpanded = mode === "multi" && multiPanel === p.id && isActive;

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
                      p.id === "Animex" && isActive && "border-rose-400/40 bg-rose-500/20 text-rose-100",
                      p.id === "AniSnatch" && isActive && "border-fuchsia-400/40 bg-fuchsia-500/20 text-fuchsia-100",
                      p.id === "Lunar" && isActive && "border-sky-400/40 bg-sky-500/20 text-sky-100",
                      p.id === "Animo" && isActive && "border-cyan-400/40 bg-cyan-500/20 text-cyan-100",
                    )}
                  >
                    <span className="truncate">{p.label}</span>
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
            {MIRURO_PIPE_PROVIDERS.map((p) => (
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
                )}
              >
                <span>{p.native ? p.label : `${p.label}*`}</span>
              </button>
            ))}
          </div>
        </MultiServerPanel>
      )}

      {multiPanel === "Animex" && provider === "Animex" && onAnimexServerChange && animexServer != null && (
        <MultiServerPanel accent="rose" label={t("watch.animexServer")}>
          <div className="flex flex-wrap gap-1.5">
            {ANIMEX_SERVERS.map((s) => (
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
                )}
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </MultiServerPanel>
      )}

      {multiPanel === "AniSnatch" &&
        provider === "AniSnatch" &&
        onAnisnatchServerChange &&
        anisnatchServer != null && (
          <MultiServerPanel accent="fuchsia" label={t("watch.anisnatchServer")}>
            <div className="flex flex-wrap gap-1.5">
              {ANISNATCH_SERVERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAnisnatchServerChange(s.id)}
                  title={s.hint}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                    anisnatchServer === s.id
                      ? "bg-fuchsia-500/25 border-fuchsia-400/45 text-fuchsia-100"
                      : "border-white/10 text-white/45 hover:border-fuchsia-500/30 hover:text-fuchsia-200/80 hover:bg-fuchsia-500/[0.06]",
                  )}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </MultiServerPanel>
        )}

      {multiPanel === "Lunar" &&
        provider === "Lunar" &&
        onLunarServerChange &&
        lunarServer != null && (
          <MultiServerPanel accent="sky" label={t("watch.lunarServer")}>
            <div className="flex flex-wrap gap-1.5">
              {LUNAR_SERVERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onLunarServerChange(s.id)}
                  title={s.hint}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                    lunarServer === s.id
                      ? "bg-sky-500/25 border-sky-400/45 text-sky-100"
                      : "border-white/10 text-white/45 hover:border-sky-500/30 hover:text-sky-200/80 hover:bg-sky-500/[0.06]",
                  )}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
          </MultiServerPanel>
        )}

      {multiPanel === "AllAnime" &&
        provider === "AllAnime" &&
        onAllanimeMirrorChange &&
        allanimeMirror != null && (
          <MultiServerPanel accent="teal" label={t("watch.allAnimeMirror")}>
            <div className="flex flex-wrap gap-1.5">
              {ALLANIME_MIRROR_OPTIONS.map((mirror) => (
                <button
                  key={mirror}
                  type="button"
                  disabled={disabled}
                  onClick={() => onAllanimeMirrorChange(mirror)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                    allanimeMirror === mirror
                      ? "bg-teal-500/25 border-teal-400/45 text-teal-100"
                      : "border-white/10 text-white/45 hover:border-teal-500/30 hover:text-teal-200/80 hover:bg-teal-500/[0.06]",
                  )}
                >
                  <span>{mirror}</span>
                </button>
              ))}
            </div>
          </MultiServerPanel>
        )}

      {multiPanel === "MKissa" &&
        provider === "MKissa" &&
        onMkissaMirrorChange &&
        mkissaMirror != null && (
          <MultiServerPanel accent="amber" label={t("watch.mkissaMirror")}>
            <div className="flex flex-wrap gap-1.5">
              {MKISSA_MIRROR_OPTIONS.map((mirror) => (
                <button
                  key={mirror}
                  type="button"
                  disabled={disabled}
                  onClick={() => onMkissaMirrorChange(mirror)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                    mkissaMirror === mirror
                      ? "bg-amber-500/25 border-amber-400/45 text-amber-100"
                      : "border-white/10 text-white/45 hover:border-amber-500/30 hover:text-amber-200/80 hover:bg-amber-500/[0.06]",
                  )}
                >
                  <span>{mirror}</span>
                </button>
              ))}
            </div>
          </MultiServerPanel>
        )}

      {provider === "Animo" && onAnimoServerChange && animoServer != null && (
        <MultiServerPanel accent="cyan" label={t("watch.animoServer")}>
          <div className="flex flex-wrap gap-1.5">
            {ANIMO_SERVERS.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={disabled}
                onClick={() => onAnimoServerChange(s.id)}
                title={s.hint}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors disabled:opacity-40",
                  animoServer === s.id
                    ? "bg-cyan-500/25 border-cyan-400/45 text-cyan-100"
                    : "border-white/10 text-white/45 hover:border-cyan-500/30 hover:text-cyan-200/80 hover:bg-cyan-500/[0.06]",
                )}
              >
                <span>{s.label}</span>
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
  accent: "violet" | "rose" | "cyan" | "fuchsia" | "sky" | "teal" | "amber";
  children: ReactNode;
}) {
  const border =
    accent === "rose"
      ? "border-rose-500/25 bg-rose-500/[0.04]"
      : accent === "cyan"
        ? "border-cyan-500/25 bg-cyan-500/[0.04]"
        : accent === "fuchsia"
          ? "border-fuchsia-500/25 bg-fuchsia-500/[0.04]"
          : accent === "sky"
            ? "border-sky-500/25 bg-sky-500/[0.04]"
            : accent === "teal"
              ? "border-teal-500/25 bg-teal-500/[0.04]"
              : accent === "amber"
                ? "border-amber-500/25 bg-amber-500/[0.04]"
                : "border-violet-500/25 bg-violet-500/[0.04]";
  const text =
    accent === "rose"
      ? "text-rose-300/70"
      : accent === "cyan"
        ? "text-cyan-300/70"
        : accent === "fuchsia"
          ? "text-fuchsia-300/70"
          : accent === "sky"
            ? "text-sky-300/70"
            : accent === "teal"
              ? "text-teal-300/70"
              : accent === "amber"
                ? "text-amber-300/70"
                : "text-violet-300/70";

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
