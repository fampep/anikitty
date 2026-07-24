"use client";

import { useState, type ReactNode } from "react";
import {
  Captions,
  Gauge,
  Lightbulb,
  List,
  Mic,
  Monitor,
  MoveHorizontal,
  Play,
  RefreshCw,
  Server,
  SkipForward,
  Sparkles,
  Clapperboard,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import SubtitleSettingsPanel from "@/components/subtitles/subtitle-settings-panel";
import SeekStepSetting from "@/components/settings/seek-step-setting";
import { ANIME4K_MODES, isWebGpuSupported } from "@/lib/player/anime4k";
import { MenuItem, MenuSection } from "@/components/custom-player/player-chrome";

export type PlayerSettingsTabId =
  | "playback"
  | "captions"
  | "quality"
  | "speed"
  | "display";

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.06]"
      onClick={() => onChange(!value)}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-white/40">{icon}</span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white/85">{label}</p>
          {description ? (
            <p className="mt-0.5 text-[10px] leading-snug text-white/35">{description}</p>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200",
          value ? "bg-teal-500/70" : "bg-white/15",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-[18px]" : "translate-x-0.5",
          )}
        />
      </div>
    </button>
  );
}

type Props = {
  watchingHardSub?: boolean;
  showQualityTab?: boolean;
  qualityPanel?: ReactNode;
  speedPanel?: ReactNode;
  displayExtras?: ReactNode;
  onOpenCaptionsTracks?: () => void;
  captionsTrackLabel?: string;
  className?: string;
};

export default function PlayerSettingsMenu({
  watchingHardSub = false,
  showQualityTab = true,
  qualityPanel,
  speedPanel,
  displayExtras,
  onOpenCaptionsTracks,
  captionsTrackLabel,
  className,
}: Props) {
  const t = useT();
  const [tab, setTab] = useState<PlayerSettingsTabId>("playback");

  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const setAutoPlay = useSettingsStore((s) => s.setAutoPlay);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);
  const setAutoSkipIntro = useSettingsStore((s) => s.setAutoSkipIntro);
  const preferDub = useSettingsStore((s) => s.preferDub);
  const setPreferDub = useSettingsStore((s) => s.setPreferDub);
  const showPlayerControls = useSettingsStore((s) => s.showPlayerControls);
  const setShowPlayerControls = useSettingsStore((s) => s.setShowPlayerControls);
  const theatreMode = useSettingsStore((s) => s.theatreMode);
  const toggleTheatreMode = useSettingsStore((s) => s.toggleTheatreMode);
  const providerAutoFallback = useSettingsStore((s) => s.providerAutoFallback);
  const setProviderAutoFallback = useSettingsStore((s) => s.setProviderAutoFallback);
  const simpleProviderPicker = useSettingsStore((s) => s.simpleProviderPicker);
  const setSimpleProviderPicker = useSettingsStore((s) => s.setSimpleProviderPicker);
  const seekStepSeconds = useSettingsStore((s) => s.seekStepSeconds);
  const setSeekStepSeconds = useSettingsStore((s) => s.setSeekStepSeconds);
  const playerTouchSeekEnabled = useSettingsStore((s) => s.playerTouchSeekEnabled);
  const setPlayerTouchSeekEnabled = useSettingsStore((s) => s.setPlayerTouchSeekEnabled);
  const autoEnableSubtitles = useSettingsStore((s) => s.autoEnableSubtitles);
  const setAutoEnableSubtitles = useSettingsStore((s) => s.setAutoEnableSubtitles);
  const hardSubSoftSubs = useSettingsStore((s) => s.hardSubSoftSubs);
  const setHardSubSoftSubs = useSettingsStore((s) => s.setHardSubSoftSubs);
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const setAnime4kEnabled = useSettingsStore((s) => s.setAnime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const setAnime4kMode = useSettingsStore((s) => s.setAnime4kMode);
  const liteMode = useSettingsStore((s) => s.liteMode);

  const webGpuReady = isWebGpuSupported();

  const tabs: { id: PlayerSettingsTabId; label: string; icon: typeof Play; hidden?: boolean }[] = [
    { id: "playback", label: t("watch.playerSettings.tabPlayback"), icon: Play },
    { id: "captions", label: t("watch.playerSettings.tabCaptions"), icon: Captions },
    {
      id: "quality",
      label: t("watch.playerSettings.tabQuality"),
      icon: Clapperboard,
      hidden: !showQualityTab,
    },
    { id: "speed", label: t("watch.playerSettings.tabSpeed"), icon: Gauge },
    { id: "display", label: t("watch.playerSettings.tabDisplay"), icon: Monitor },
  ];

  const visibleTabs = tabs.filter((entry) => !entry.hidden);
  const activeTab =
    visibleTabs.some((entry) => entry.id === tab) ? tab : (visibleTabs[0]?.id ?? "playback");

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="sticky top-0 z-[1] flex gap-0.5 overflow-x-auto border-b border-white/[0.08] bg-zinc-950/95 px-1.5 py-1.5 backdrop-blur-md">
        {visibleTabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={activeTab === id}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold transition-colors",
              activeTab === id
                ? "bg-white text-zinc-950"
                : "text-white/45 hover:bg-white/[0.06] hover:text-white/80",
            )}
          >
            <Icon className="h-3 w-3 shrink-0" aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="max-h-[min(55vh,22rem)] overflow-y-auto overscroll-contain sm:max-h-[min(60vh,26rem)]">
        {activeTab === "playback" && (
          <div className="divide-y divide-white/[0.06] py-1">
            <ToggleRow
              icon={<Play className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.autoNext")}
              description={t("settings.autoPlayDesc")}
              value={autoPlay}
              onChange={setAutoPlay}
            />
            <ToggleRow
              icon={<SkipForward className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.autoSkip")}
              description={t("settings.autoSkipIntroDesc")}
              value={autoSkipIntro}
              onChange={setAutoSkipIntro}
            />
            <ToggleRow
              icon={<Mic className="h-3.5 w-3.5" />}
              label={t("settings.preferDub")}
              description={t("settings.preferDubDesc")}
              value={preferDub}
              onChange={setPreferDub}
            />
            <ToggleRow
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.autoFallback")}
              description={t("watch.playerSettings.autoFallbackDesc")}
              value={providerAutoFallback}
              onChange={setProviderAutoFallback}
            />
            <ToggleRow
              icon={<List className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.simplePicker")}
              description={t("watch.playerSettings.simplePickerDesc")}
              value={simpleProviderPicker}
              onChange={setSimpleProviderPicker}
            />
            <div className="px-2 py-2 [&_div]:border-white/10 [&_div]:bg-white/[0.04] [&_p]:text-white/80 [&_span]:text-white/35">
              <SeekStepSetting value={seekStepSeconds} onChange={setSeekStepSeconds} compact />
            </div>
            <ToggleRow
              icon={<MoveHorizontal className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.touchSeek")}
              description={t("watch.playerSettings.touchSeekDesc")}
              value={playerTouchSeekEnabled}
              onChange={setPlayerTouchSeekEnabled}
            />
            {webGpuReady ? (
              <>
                <ToggleRow
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label={t("watch.anime4k")}
                  description={
                    liteMode ? t("watch.anime4kLiteDisabled") : t("watch.anime4kHint")
                  }
                  value={anime4kEnabled && !liteMode}
                  onChange={setAnime4kEnabled}
                />
                {anime4kEnabled && !liteMode ? (
                  <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
                    {ANIME4K_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setAnime4kMode(mode)}
                        aria-pressed={anime4kMode === mode}
                        className={cn(
                          "rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors",
                          anime4kMode === mode
                            ? "border-teal-400/40 bg-teal-500/20 text-teal-50"
                            : "border-white/10 text-white/45 hover:text-white/75",
                        )}
                      >
                        {t("watch.anime4kMode", { mode })}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="px-3 py-2 text-[10px] text-white/35">{t("watch.anime4kUnsupported")}</p>
            )}
          </div>
        )}

        {activeTab === "captions" &&
          (preferDub ? (
            <div className="px-3 py-6 text-center text-[12px] text-white/40">
              {t("watch.playerSettings.subtitlesDubHint")}
            </div>
          ) : (
            <div className="space-y-1 py-1">
              <ToggleRow
                icon={<Captions className="h-3.5 w-3.5" />}
                label={t("watch.playerSettings.autoEnableSubtitles")}
                description={t("watch.playerSettings.autoEnableSubtitlesDesc")}
                value={autoEnableSubtitles}
                onChange={setAutoEnableSubtitles}
              />
              {watchingHardSub ? (
                <ToggleRow
                  icon={<Captions className="h-3.5 w-3.5" />}
                  label={t("watch.playerSettings.hardSubSoftSubs")}
                  description={t("watch.playerSettings.hardSubSoftSubsDesc")}
                  value={hardSubSoftSubs}
                  onChange={setHardSubSoftSubs}
                />
              ) : null}
              {onOpenCaptionsTracks ? (
                <MenuSection title={t("watch.playerSettings.captionTracks")}>
                  <MenuItem onClick={onOpenCaptionsTracks}>
                    {captionsTrackLabel ?? t("watch.playerSettings.captionTracks")}
                  </MenuItem>
                </MenuSection>
              ) : null}
              <div className="border-t border-white/[0.06] px-2 py-2 [&_*]:border-white/10">
                <SubtitleSettingsPanel compact />
              </div>
            </div>
          ))}

        {activeTab === "quality" && (qualityPanel ?? null)}

        {activeTab === "speed" && (speedPanel ?? null)}

        {activeTab === "display" && (
          <div className="divide-y divide-white/[0.06] py-1">
            <ToggleRow
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.lightsOff")}
              description={t("watch.playerSettings.theatre")}
              value={theatreMode}
              onChange={() => toggleTheatreMode()}
            />
            <ToggleRow
              icon={<Server className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.showProvidersShort")}
              description={t("watch.playerSettings.providersToggleDesc")}
              value={showPlayerControls}
              onChange={setShowPlayerControls}
            />
            {displayExtras}
          </div>
        )}
      </div>
    </div>
  );
}
