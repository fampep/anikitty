"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import SubtitleSettingsPanel from "@/components/subtitles/subtitle-settings-panel";
import KittyProxyChooser from "@/components/watch/kitty-proxy-chooser";
import SeekStepSetting from "@/components/settings/seek-step-setting";
import {
  ChevronDown,
  Captions,
  Mic,
  Monitor,
  MoveHorizontal,
  Play,
  RefreshCw,
  Settings2,
  SkipForward,
  SlidersHorizontal,
  Server,
  List,
  Globe2,
  Sparkles,
} from "lucide-react";
import {
  ANIME4K_MODES,
  isWebGpuSupported,
} from "@/lib/player/anime4k";

type PlayerSettingsTab = "playback" | "network" | "subtitles";
function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className="flex w-full items-center justify-between gap-4 px-3 py-2.5 rounded-xl bg-muted/40 dark:bg-white/[0.03] border border-border dark:border-white/[0.08] hover:border-border dark:hover:border-white/14 transition-colors text-left"
      onClick={() => onChange(!value)}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-muted-foreground dark:text-white/35 shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-foreground/90 dark:text-white/80">{label}</p>
          <p className="text-[10px] text-muted-foreground dark:text-white/30 font-mono mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      <div
        className={cn(
          "relative w-9 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-violet-500/70" : "bg-accent dark:bg-white/12",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

export default function PlayerSettingsBar({
  watchingHardSub = false,
}: {
  watchingHardSub?: boolean;
}) {
  const t = useT();
  const {
    autoPlay,
    setAutoPlay,
    autoSkipIntro,
    setAutoSkipIntro,
    preferDub,
    setPreferDub,
    showPlayerControls,
    setShowPlayerControls,
    playerSettingsOpen,
    setPlayerSettingsOpen,
    theatreMode,
    setTheatreMode,
    providerAutoFallback,
    setProviderAutoFallback,
    simpleProviderPicker,
    setSimpleProviderPicker,
    seekStepSeconds,
    setSeekStepSeconds,
    playerTouchSeekEnabled,
    setPlayerTouchSeekEnabled,
    autoEnableSubtitles,
    setAutoEnableSubtitles,
    hardSubSoftSubs,
    setHardSubSoftSubs,
    anime4kEnabled,
    setAnime4kEnabled,
    anime4kMode,
    setAnime4kMode,
    liteMode,
  } = useSettingsStore();

  const [settingsTab, setSettingsTab] = useState<PlayerSettingsTab>("playback");

  const settingsTabs: { id: PlayerSettingsTab; icon: typeof Play; label: string }[] = [
    { id: "playback", icon: Play, label: t("watch.playerSettings.tabPlayback") },
    { id: "network", icon: Globe2, label: t("watch.playerSettings.tabNetwork") },
    { id: "subtitles", icon: Captions, label: t("watch.playerSettings.tabSubtitles") },
  ];

  const webGpuReady = isWebGpuSupported();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("kitty-watch-mobile-defaults-v4")) return;
    if (!window.matchMedia("(max-width: 1023px)").matches) return;
    setPlayerSettingsOpen(false);
    setShowPlayerControls(false);
    setSimpleProviderPicker(true);
    localStorage.setItem("kitty-watch-mobile-defaults-v4", "1");
  }, [setPlayerSettingsOpen, setShowPlayerControls, setSimpleProviderPicker]);

  return (
    <div className="rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.02] overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 border-b border-border dark:border-white/[0.06]">
        <button
          type="button"
          onClick={() => setPlayerSettingsOpen(!playerSettingsOpen)}
          aria-expanded={playerSettingsOpen}
          className="flex flex-1 items-center gap-2 min-w-0 text-left group"
        >
          <Settings2 className="w-3.5 h-3.5 text-violet-400/70 shrink-0" />
          <span className="text-[12px] font-bold text-foreground/85 dark:text-white/75 truncate">
            {t("watch.playerSettings.title")}
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-muted-foreground dark:text-white/30 shrink-0 transition-transform",
              playerSettingsOpen && "rotate-180",
            )}
          />
        </button>

        <button
          type="button"
          onClick={() => setTheatreMode(!theatreMode)}
          aria-pressed={theatreMode}
          className={cn(
            "inline-flex items-center gap-1.5 shrink-0 h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors",
            theatreMode
              ? "border-violet-400/30 bg-violet-500/15 text-violet-200/90"
              : "border-border dark:border-white/12 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/50 hover:text-foreground/85 dark:hover:text-white/75",
          )}
          title={t("watch.playerSettings.theatre")}
        >
          <Monitor className="w-3 h-3" />
          <span className="hidden sm:inline">{t("watch.playerSettings.theatreShort")}</span>
        </button>

        <button
          type="button"
          onClick={() => setShowPlayerControls(!showPlayerControls)}
          aria-pressed={showPlayerControls}
          className={cn(
            "inline-flex items-center gap-1.5 shrink-0 h-8 sm:h-7 px-2.5 rounded-lg text-[10px] font-bold border transition-colors touch-manipulation",
            showPlayerControls
              ? "border-border dark:border-white/12 bg-muted/50 dark:bg-white/[0.04] text-muted-foreground dark:text-white/50 hover:text-foreground/85 dark:hover:text-white/75"
              : "border-violet-400/30 bg-violet-500/15 text-violet-200/90",
          )}
          title={
            showPlayerControls
              ? t("watch.playerSettings.hideProviders")
              : t("watch.playerSettings.showProviders")
          }
        >
          <Server className="w-3 h-3" />
          <span className="hidden sm:inline">
            {showPlayerControls
              ? t("watch.playerSettings.hideProvidersShort")
              : t("watch.playerSettings.showProvidersShort")}
          </span>
        </button>
      </div>

      {playerSettingsOpen && (
        <div className="px-3 py-3 space-y-3">
          <div className="flex items-center gap-1 rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-1">
            {settingsTabs.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSettingsTab(id)}
                aria-pressed={settingsTab === id}
                className={cn(
                  "flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors",
                  settingsTab === id
                    ? "bg-foreground text-background dark:bg-white dark:text-black"
                    : "text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80",
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {settingsTab === "playback" && (
            <div className="space-y-3">
              <ToggleRow
                icon={<Play className="w-3.5 h-3.5" />}
                label={t("settings.autoPlay")}
                description={t("settings.autoPlayDesc")}
                value={autoPlay}
                onChange={setAutoPlay}
              />
              <ToggleRow
                icon={<SkipForward className="w-3.5 h-3.5" />}
                label={t("settings.autoSkipIntro")}
                description={t("settings.autoSkipIntroDesc")}
                value={autoSkipIntro}
                onChange={setAutoSkipIntro}
              />
              <ToggleRow
                icon={<Mic className="w-3.5 h-3.5" />}
                label={t("settings.preferDub")}
                description={t("settings.preferDubDesc")}
                value={preferDub}
                onChange={setPreferDub}
              />
              <ToggleRow
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                label={t("watch.playerSettings.autoFallback")}
                description={t("watch.playerSettings.autoFallbackDesc")}
                value={providerAutoFallback}
                onChange={setProviderAutoFallback}
              />
              <ToggleRow
                icon={<List className="w-3.5 h-3.5" />}
                label={t("watch.playerSettings.simplePicker")}
                description={t("watch.playerSettings.simplePickerDesc")}
                value={simpleProviderPicker}
                onChange={setSimpleProviderPicker}
              />

              <SeekStepSetting value={seekStepSeconds} onChange={setSeekStepSeconds} compact />

              <ToggleRow
                icon={<MoveHorizontal className="w-3.5 h-3.5" />}
                label={t("watch.playerSettings.touchSeek")}
                description={t("watch.playerSettings.touchSeekDesc")}
                value={playerTouchSeekEnabled}
                onChange={setPlayerTouchSeekEnabled}
              />

              {webGpuReady ? (
                <>
                  <ToggleRow
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    label={t("watch.anime4k")}
                    description={
                      liteMode
                        ? t("watch.anime4kLiteDisabled")
                        : t("watch.anime4kHint")
                    }
                    value={anime4kEnabled && !liteMode}
                    onChange={(enabled) => setAnime4kEnabled(enabled)}
                  />
                  {anime4kEnabled && !liteMode ? (
                    <div className="flex flex-wrap gap-1.5 px-0.5">
                      {ANIME4K_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAnime4kMode(mode)}
                          aria-pressed={anime4kMode === mode}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors",
                            anime4kMode === mode
                              ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                              : "border-border dark:border-white/10 text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/75",
                          )}
                        >
                          {t("watch.anime4kMode", { mode })}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-[10px] text-muted-foreground dark:text-white/35 font-mono px-0.5">
                  {t("watch.anime4kUnsupported")}
                </p>
              )}
            </div>
          )}

          {settingsTab === "network" && <KittyProxyChooser />}

          {settingsTab === "subtitles" && (
            preferDub ? (
              <div className="rounded-xl border border-dashed border-border dark:border-white/10 px-3 py-6 text-center text-[12px] text-muted-foreground dark:text-white/40">
                {t("watch.playerSettings.subtitlesDubHint")}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400/70" />
                  <p className="text-[11px] font-bold text-muted-foreground dark:text-white/70">
                    {t("settings.subtitleAppearance")}
                  </p>
                </div>
                <ToggleRow
                  icon={<Captions className="w-3.5 h-3.5" />}
                  label={t("watch.playerSettings.autoEnableSubtitles")}
                  description={t("watch.playerSettings.autoEnableSubtitlesDesc")}
                  value={autoEnableSubtitles}
                  onChange={setAutoEnableSubtitles}
                />
                {watchingHardSub && (
                  <ToggleRow
                    icon={<Captions className="w-3.5 h-3.5" />}
                    label={t("watch.playerSettings.hardSubSoftSubs")}
                    description={t("watch.playerSettings.hardSubSoftSubsDesc")}
                    value={hardSubSoftSubs}
                    onChange={setHardSubSoftSubs}
                  />
                )}
                <div className="border-t border-border dark:border-white/[0.06] pt-3">
                  <SubtitleSettingsPanel compact />
                </div>
              </div>
            )
          )}
        </div>
      )}

      {!showPlayerControls && (
        <div className="px-3 py-2 border-t border-border dark:border-white/[0.06]">
          <p className="text-[10px] text-muted-foreground dark:text-white/35 font-mono leading-relaxed">
            {t("watch.playerSettings.providersHiddenHint")}
          </p>
        </div>
      )}
    </div>
  );
}
