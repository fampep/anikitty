"use client";

import {
  Captions,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Lightbulb,
  MessageSquare,
  Mic,
  PictureInPicture,
  Play,
  Server,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import { AUDIO_SEGMENT, getProviderAccent, providerChipClass } from "@/lib/kitty/provider-ui-styles";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";

function ToolbarToggle({
  active,
  icon,
  label,
  onClick,
  className,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-all duration-150 shrink-0",
        active
          ? "border-violet-400/35 bg-violet-500/15 text-violet-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 hover:border-border dark:hover:border-white/18",
        className,
      )}
    >
      {active ? <Check className="w-3 h-3 shrink-0" /> : icon}
      <span className="inline max-w-[4.75rem] truncate sm:max-w-none">{label}</span>
    </button>
  );
}

type Props = {
  provider: KittyProvider;
  providerLabel?: string;
  streamAudio?: "sub" | "dub";
  dubEnabled?: boolean;
  onAudioChange?: (audio: "sub" | "dub") => void;
  showProviderControls?: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  prevEpisodeNumber?: number;
  nextEpisodeNumber?: number;
  onPrev: () => void;
  onNext: () => void;
  onShowShortcuts: () => void;
  onShowProviders?: () => void;
  onTogglePip?: () => void;
  pipSupported?: boolean;
  onOpenComments?: () => void;
  onSubmitSkipTimes?: () => void;
};

function ToolbarAudioToggle({
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
    <div
      className="inline-flex shrink-0 rounded-lg border border-border dark:border-white/10 bg-muted/30 dark:bg-black/30 p-0.5"
      role="group"
      aria-label="Audio"
    >
      <button
        type="button"
        aria-pressed={value === "sub"}
        onClick={() => onChange("sub")}
        className={cn(
          "inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide transition-all touch-manipulation",
          value === "sub" ? AUDIO_SEGMENT.subActive : AUDIO_SEGMENT.subIdle,
        )}
      >
        <Captions className="w-3 h-3 shrink-0 opacity-80" />
        <span className="hidden sm:inline">{subLabel}</span>
      </button>
      <button
        type="button"
        aria-pressed={value === "dub"}
        disabled={!dubEnabled}
        onClick={() => dubEnabled && onChange("dub")}
        className={cn(
          "inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[10px] font-mono font-bold uppercase tracking-wide transition-all touch-manipulation",
          value === "dub" ? AUDIO_SEGMENT.dubActive : AUDIO_SEGMENT.dubIdle,
          !dubEnabled && AUDIO_SEGMENT.dubDisabled,
        )}
      >
        <Mic className="w-3 h-3 shrink-0 opacity-80" />
        <span className="hidden sm:inline">{dubLabel}</span>
      </button>
    </div>
  );
}

export default function WatchPlayerToolbar({
  provider,
  providerLabel,
  streamAudio,
  dubEnabled = false,
  onAudioChange,
  showProviderControls = true,
  hasPrev,
  hasNext,
  prevEpisodeNumber,
  nextEpisodeNumber,
  onPrev,
  onNext,
  onShowShortcuts,
  onShowProviders,
  onTogglePip,
  pipSupported = false,
  onOpenComments,
  onSubmitSkipTimes,
}: Props) {
  const t = useT();
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);
  const setAutoSkipIntro = useSettingsStore((s) => s.setAutoSkipIntro);
  const toggleTheatreMode = useSettingsStore((s) => s.toggleTheatreMode);
  const theatreMode = useSettingsStore((s) => s.theatreMode);

  const displayProvider = providerLabel ?? provider;
  const accent = getProviderAccent(provider);
  const audioLabel = streamAudio === "dub" ? t("card.dub") : t("card.sub");

  return (
    <div className="flex items-center gap-2 px-3 py-2 sm:px-3 border-b border-border dark:border-white/8 bg-gradient-to-b from-[#0c0c0c] to-[#0a0a0a] overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <ToolbarToggle
          active={autoPlay}
          icon={<Play className="w-3 h-3 shrink-0" />}
          label={t("watch.toolbar.autoNext")}
          onClick={() => setAutoPlay(!autoPlay)}
        />
        <ToolbarToggle
          active={autoSkipIntro}
          icon={<SkipForward className="w-3 h-3 shrink-0" />}
          label={t("watch.toolbar.autoSkip")}
          onClick={() => setAutoSkipIntro(!autoSkipIntro)}
        />
        <button
          type="button"
          onClick={onShowShortcuts}
          aria-label={t("watch.toolbar.shortcuts")}
          className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors shrink-0"
        >
          <Command className="w-3 h-3 shrink-0" />
          <span className="hidden sm:inline">{t("watch.toolbar.shortcuts")}</span>
        </button>
        <ToolbarToggle
          active={theatreMode}
          icon={<Lightbulb className="w-3 h-3 shrink-0" />}
          label={t("watch.toolbar.lightsOff")}
          onClick={toggleTheatreMode}
          className="min-w-0"
        />
        {pipSupported && onTogglePip && (
          <button
            type="button"
            onClick={onTogglePip}
            aria-label={t("watch.toolbar.pip")}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 transition-colors shrink-0 lg:hidden"
          >
            <PictureInPicture className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{t("watch.toolbar.pip")}</span>
          </button>
        )}
        {onSubmitSkipTimes && (
          <button
            type="button"
            onClick={onSubmitSkipTimes}
            className="hidden md:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75 hover:border-violet-400/25 transition-colors shrink-0"
          >
            <SkipForward className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{t("watch.toolbar.submitSkip")}</span>
          </button>
        )}
        {onOpenComments && (
          <button
            type="button"
            onClick={onOpenComments}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-violet-400/25 bg-violet-500/10 text-violet-200/90 hover:bg-violet-500/18 transition-colors shrink-0"
          >
            <MessageSquare className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">{t("watch.toolbar.comments")}</span>
          </button>
        )}
        {onShowProviders && !showProviderControls ? (
          <button
            type="button"
            onClick={onShowProviders}
            className={cn(
              providerChipClass(provider),
              "h-8 px-2.5 hover:brightness-110 transition-all touch-manipulation",
            )}
            title={t("watch.playerSettings.showProviders")}
          >
            <Server className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate max-w-[7rem]">{displayProvider}</span>
            {streamAudio && (
              <>
                <span className="opacity-40">·</span>
                <span>{audioLabel}</span>
              </>
            )}
          </button>
        ) : showProviderControls ? null : (
          <span className={cn("hidden md:inline-flex h-8 items-center", providerChipClass(provider))}>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", accent.dot)} />
            {displayProvider}
            {streamAudio && (
              <>
                <span className="opacity-40">·</span>
                <span>{audioLabel}</span>
              </>
            )}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
        {streamAudio && onAudioChange && (
          <ToolbarAudioToggle
            value={streamAudio}
            dubEnabled={dubEnabled}
            onChange={onAudioChange}
            subLabel={t("card.sub")}
            dubLabel={t("card.dub")}
          />
        )}
        <button
          type="button"
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label={
            prevEpisodeNumber != null
              ? t("watch.toolbar.episodeNav", { n: prevEpisodeNumber })
              : t("watch.prevEpisode")
          }
          className={cn(
            "inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[11px] font-semibold border transition-colors touch-manipulation",
            hasPrev
              ? "border-border dark:border-white/12 text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white hover:bg-muted/40 dark:hover:bg-white/[0.04]"
              : "border-transparent text-muted-foreground/30 dark:text-white/15 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {prevEpisodeNumber != null && (
            <span>{t("watch.toolbar.episodeNav", { n: prevEpisodeNumber })}</span>
          )}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          aria-label={
            nextEpisodeNumber != null
              ? t("watch.toolbar.episodeNav", { n: nextEpisodeNumber })
              : t("watch.nextEpisode")
          }
          className={cn(
            "inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[11px] font-semibold border transition-colors touch-manipulation",
            hasNext
              ? "border-border dark:border-white/12 text-muted-foreground dark:text-white/55 hover:text-foreground dark:hover:text-white hover:bg-muted/40 dark:hover:bg-white/[0.04]"
              : "border-transparent text-muted-foreground/30 dark:text-white/15 cursor-not-allowed",
          )}
        >
          {nextEpisodeNumber != null && (
            <span>{t("watch.toolbar.episodeNav", { n: nextEpisodeNumber })}</span>
          )}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
