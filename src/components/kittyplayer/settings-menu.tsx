"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Accessibility,
  AudioLines,
  Captions,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Clapperboard,
  Gauge,
  Globe2,
  LayoutList,
  ListVideo,
  Monitor,
  Moon,
  MoveHorizontal,
  Music2,
  ImageIcon,
  PanelTop,
  Palette,
  Shuffle,
  Sparkles,
  Subtitles,
  Sun,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import { PLAYER_THEMES, PLAYER_THEME_LABELS } from "@/lib/player/player-theme";
import SubtitleSettingsPanel from "@/components/subtitles/subtitle-settings-panel";
import SeekStepSetting from "@/components/settings/seek-step-setting";
import {
  VOLUME_BOOST_MAX,
  VOLUME_BOOST_MIN,
  formatVolumeBoost,
  sanitizeVolumeBoost,
} from "@/components/kittyplayer/audio-boost";
import { ANIME4K_MODES, isWebGpuSupported } from "@/lib/player/anime4k";
import { MenuItem, MenuSection } from "@/components/kittyplayer/chrome";
import { KITTY_API_NODES, type KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import {
  flagForKittyLocation,
  formatKittyBandwidthMbps,
  formatKittyPingMs,
} from "@/lib/kitty/kitty-node-display";
import { useKittyNodePing } from "@/hooks/use-kitty-node-ping";

export type PlayerSettingsPanelId =
  | "root"
  | "boost"
  | "playback"
  | "captions"
  | "speed"
  | "quality"
  | "display"
  | "dns";

function formatBoostOffset(boost: number): string {
  const pct = Math.round((sanitizeVolumeBoost(boost) - 1) * 100);
  if (pct === 0) return "0%";
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function NavRow({
  icon,
  label,
  value,
  onClick,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09]",
        compact ? "min-h-9 gap-2.5 px-3 py-1.5" : "min-h-11 gap-3 px-3.5 py-2.5",
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-white/90" aria-hidden>
        {icon}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-medium text-white/95",
          compact ? "text-[12px]" : "text-[13px]",
        )}
      >
        {label}
      </span>
      {value ? (
        <span className="max-w-[42%] shrink-0 truncate text-[12px] text-white/45">
          {value}
        </span>
      ) : null}
      <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
    </button>
  );
}

function SubHeader({
  title,
  onBack,
  backLabel,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
}) {
  return (
    <div className="sticky top-0 z-[1] flex items-center gap-1 border-b border-white/[0.08] bg-zinc-950/95 px-1 py-1 backdrop-blur-md">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <p className="min-w-0 flex-1 truncate pr-2 text-[13px] font-semibold text-white">
        {title}
      </p>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  value,
  onChange,
  compact = false,
}: {
  icon: ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={cn(
        "flex w-full items-center justify-between text-left transition-colors hover:bg-white/[0.06]",
        compact ? "min-h-9 gap-2 px-3 py-1.5" : "min-h-11 gap-2.5 px-3.5 py-2.5",
      )}
      onClick={() => onChange(!value)}
    >
      <div className={cn("flex min-w-0 items-center", compact ? "gap-2" : "gap-2.5")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg",
            compact ? "h-6 w-6" : "h-7 w-7",
            value ? "bg-teal-500/20 text-teal-200" : "bg-white/[0.05] text-white/40",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "font-medium leading-tight text-white/90",
              compact ? "text-[12px]" : "text-[13px]",
            )}
          >
            {label}
          </p>
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
  /** Short value for root Captions row (e.g. English / Off). */
  captionsValue?: string;
  speedLabel?: string;
  qualityLabel?: string;
  volumeBoost?: number;
  onVolumeBoostChange?: (level: number) => void;
  volumeBoostDisabled?: boolean;
  className?: string;
  /** Phone / narrow player denser sheet — same list UX, slightly tighter. */
  compact?: boolean;
};

export default function PlayerSettingsMenu({
  watchingHardSub = false,
  showQualityTab = true,
  qualityPanel,
  speedPanel,
  displayExtras,
  onOpenCaptionsTracks,
  captionsTrackLabel,
  captionsValue,
  speedLabel = "Normal",
  qualityLabel = "Auto",
  volumeBoost = 1,
  onVolumeBoostChange,
  volumeBoostDisabled = false,
  className,
  compact = false,
}: Props) {
  const t = useT();
  const [panel, setPanel] = useState<PlayerSettingsPanelId>("root");

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
  const watchPosterTheme = useSettingsStore((s) => s.watchPosterTheme);
  const setWatchPosterTheme = useSettingsStore((s) => s.setWatchPosterTheme);
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
  const playerTheme = useSettingsStore((s) => s.playerTheme);
  const setPlayerTheme = useSettingsStore((s) => s.setPlayerTheme);
  const ambientModeEnabled = useSettingsStore((s) => s.ambientModeEnabled);
  const setAmbientModeEnabled = useSettingsStore((s) => s.setAmbientModeEnabled);
  const statsOverlayEnabled = useSettingsStore((s) => s.statsOverlayEnabled);
  const setStatsOverlayEnabled = useSettingsStore((s) => s.setStatsOverlayEnabled);
  const kittyProxyNode = useSettingsStore((s) => s.kittyProxyNode);
  const setKittyProxyNode = useSettingsStore((s) => s.setKittyProxyNode);
  const kittyProxyManual = useSettingsStore((s) => s.kittyProxyManual);
  const setKittyProxyManual = useSettingsStore((s) => s.setKittyProxyManual);

  const webGpuReady = isWebGpuSupported();
  const backLabel = t("watch.playerSettings.back");
  const goRoot = () => setPanel("root");

  const dnsOpen = panel === "dns";
  const {
    nodes: dnsPingNodes,
    pingByNode,
    bandwidthByNode,
    fastestId,
    loading: dnsPingLoading,
  } = useKittyNodePing({ enabled: dnsOpen, lightweight: false });

  const pingById = useMemo(() => {
    const map = new Map<KittyApiNodeId, (typeof dnsPingNodes)[number]>();
    for (const row of dnsPingNodes) map.set(row.id, row);
    return map;
  }, [dnsPingNodes]);

  const activeDnsMeta = KITTY_API_NODES.find((n) => n.id === kittyProxyNode);
  const activeDnsFlag = activeDnsMeta
    ? flagForKittyLocation(activeDnsMeta.location)
    : null;
  const activeDnsStats = (() => {
    if (!kittyProxyManual || !activeDnsMeta) return null;
    const ping = formatKittyPingMs(pingByNode[activeDnsMeta.id]);
    const speed = formatKittyBandwidthMbps(bandwidthByNode[activeDnsMeta.id]);
    if (!ping && !speed) return null;
    return [ping, speed].filter(Boolean).join(" · ");
  })();
  const dnsRootValue = kittyProxyManual
    ? [
        activeDnsFlag,
        activeDnsMeta?.label ?? activeDnsMeta?.location ?? kittyProxyNode,
        activeDnsStats,
      ]
        .filter(Boolean)
        .join(" ")
    : t("watch.playerSettings.dnsAuto");

  const selectDnsAuto = () => {
    setKittyProxyManual(false);
  };

  const selectDnsNode = (nodeId: KittyApiNodeId) => {
    setKittyProxyNode(nodeId);
    setKittyProxyManual(true);
  };

  const formatNodeMeta = (nodeId: KittyApiNodeId): string => {
    const row = pingById.get(nodeId);
    if (!row) return dnsPingLoading ? "…" : "—";
    if (!row.ok) return t("watch.playerSettings.dnsOffline");
    const ping = formatKittyPingMs(row.pingMs);
    const speed = formatKittyBandwidthMbps(row.bandwidthMbps);
    const parts = [ping, speed].filter(Boolean);
    return parts.length ? parts.join(" · ") : "—";
  };

  const captionsRootValue =
    captionsValue ??
    (preferDub
      ? t("watch.playerSettings.captionsHidden")
      : captionsTrackLabel?.replace(/^Tracks ·\s*/i, "") ??
        t("watch.playerSettings.captionsOff"));

  const panelTitle: Record<Exclude<PlayerSettingsPanelId, "root">, string> = {
    boost: t("watch.playerSettings.volumeBoost"),
    playback: t("watch.playerSettings.tabPlayback"),
    captions: t("watch.playerSettings.tabCaptions"),
    speed: t("watch.playerSettings.tabSpeed"),
    quality: t("watch.playerSettings.tabQuality"),
    display: t("watch.playerSettings.tabDisplay"),
    dns: t("watch.playerSettings.tabDns"),
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {panel !== "root" ? (
        <SubHeader
          title={panelTitle[panel]}
          onBack={goRoot}
          backLabel={backLabel}
        />
      ) : null}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain",
          !compact && "max-h-[min(52vh,22rem)] sm:max-h-[min(60vh,26rem)] sm:flex-none",
        )}
      >
        {panel === "root" ? (
          <div className="divide-y divide-white/[0.06] py-0.5">
            {!volumeBoostDisabled ? (
              <NavRow
                compact={compact}
                icon={<Music2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                label={t("watch.playerSettings.volumeBoost")}
                value={formatBoostOffset(volumeBoost)}
                onClick={() => setPanel("boost")}
              />
            ) : null}
            <NavRow
              compact={compact}
              icon={<Accessibility className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              label={t("watch.playerSettings.tabPlayback")}
              onClick={() => setPanel("playback")}
            />
            <NavRow
              compact={compact}
              icon={<Captions className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              label={t("watch.playerSettings.tabCaptions")}
              value={captionsRootValue}
              onClick={() => setPanel("captions")}
            />
            <NavRow
              compact={compact}
              icon={<Gauge className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              label={t("watch.playerSettings.tabSpeed")}
              value={speedLabel}
              onClick={() => setPanel("speed")}
            />
            {showQualityTab ? (
              <NavRow
                compact={compact}
                icon={<Clapperboard className="h-[18px] w-[18px]" strokeWidth={1.75} />}
                label={t("watch.playerSettings.tabQuality")}
                value={qualityLabel}
                onClick={() => setPanel("quality")}
              />
            ) : null}
            <NavRow
              compact={compact}
              icon={<Monitor className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              label={t("watch.playerSettings.tabDisplay")}
              onClick={() => setPanel("display")}
            />
            <NavRow
              compact={compact}
              icon={<Globe2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              label={t("watch.playerSettings.tabDns")}
              value={dnsRootValue}
              onClick={() => setPanel("dns")}
            />
          </div>
        ) : null}

        {panel === "boost" ? (
          <div className="space-y-3 px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[12px] text-white/55">
                {t("watch.playerSettings.volumeBoostHint")}
              </p>
              <span className="tabular-nums text-[13px] font-semibold text-white">
                {formatVolumeBoost(volumeBoost)}
              </span>
            </div>
            <input
              type="range"
              min={VOLUME_BOOST_MIN}
              max={VOLUME_BOOST_MAX}
              step={0.05}
              value={volumeBoost}
              aria-label={t("watch.playerSettings.volumeBoost")}
              onChange={(e) =>
                onVolumeBoostChange?.(sanitizeVolumeBoost(Number(e.target.value)))
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
            <div className="flex justify-between text-[10px] tabular-nums text-white/35">
              <span>100%</span>
              <span>300%</span>
            </div>
            <button
              type="button"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-2 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/[0.08]"
              onClick={() => onVolumeBoostChange?.(1)}
            >
              {t("watch.playerSettings.volumeBoostReset")}
            </button>
          </div>
        ) : null}

        {panel === "playback" ? (
          <div className="divide-y divide-white/[0.06] py-0.5">
            <ToggleRow
              compact={compact}
              icon={<ListVideo className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.autoNext")}
              description={compact ? undefined : t("settings.autoPlayDesc")}
              value={autoPlay}
              onChange={setAutoPlay}
            />
            <ToggleRow
              compact={compact}
              icon={<ChevronsRight className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.autoSkip")}
              description={compact ? undefined : t("settings.autoSkipIntroDesc")}
              value={autoSkipIntro}
              onChange={setAutoSkipIntro}
            />
            <ToggleRow
              compact={compact}
              icon={<AudioLines className="h-3.5 w-3.5" />}
              label={t("settings.preferDub")}
              description={compact ? undefined : t("settings.preferDubDesc")}
              value={preferDub}
              onChange={setPreferDub}
            />
            <ToggleRow
              compact={compact}
              icon={<Shuffle className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.autoFallback")}
              description={compact ? undefined : t("watch.playerSettings.autoFallbackDesc")}
              value={providerAutoFallback}
              onChange={setProviderAutoFallback}
            />
            <ToggleRow
              compact={compact}
              icon={<LayoutList className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.simplePicker")}
              description={compact ? undefined : t("watch.playerSettings.simplePickerDesc")}
              value={simpleProviderPicker}
              onChange={setSimpleProviderPicker}
            />
            <div className="px-2 py-2 [&_div]:border-white/10 [&_div]:bg-white/[0.04] [&_p]:text-white/80 [&_span]:text-white/35">
              <SeekStepSetting
                value={seekStepSeconds}
                onChange={setSeekStepSeconds}
                compact
                hideDescription={compact}
              />
            </div>
            <ToggleRow
              compact={compact}
              icon={<MoveHorizontal className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.touchSeek")}
              description={compact ? undefined : t("watch.playerSettings.touchSeekDesc")}
              value={playerTouchSeekEnabled}
              onChange={setPlayerTouchSeekEnabled}
            />
            {webGpuReady ? (
              <>
                <ToggleRow
                  compact={compact}
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label={t("watch.anime4k")}
                  description={compact ? undefined : t("watch.anime4kHint")}
                  value={anime4kEnabled}
                  onChange={setAnime4kEnabled}
                />
                {anime4kEnabled ? (
                  <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
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
              <p className="px-3.5 py-2 text-[10px] text-white/35">
                {t("watch.anime4kUnsupported")}
              </p>
            )}
            <div className="flex items-center gap-2 px-3.5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wide text-white/35">
              <Palette className="h-3 w-3" />
              {t("watch.playerSettings.theme")}
            </div>
            <div className="flex flex-wrap gap-1.5 px-3.5 pb-3">
              {PLAYER_THEMES.map((theme) => (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setPlayerTheme(theme)}
                  aria-pressed={playerTheme === theme}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors",
                    playerTheme === theme
                      ? "border-teal-400/40 bg-teal-500/20 text-teal-50"
                      : "border-white/10 text-white/45 hover:text-white/75",
                  )}
                >
                  {PLAYER_THEME_LABELS[theme]}
                </button>
              ))}
            </div>
            <ToggleRow
              compact={compact}
              icon={<Sun className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.ambientMode")}
              description={compact ? undefined : t("watch.playerSettings.ambientModeDesc")}
              value={ambientModeEnabled}
              onChange={setAmbientModeEnabled}
            />
            <ToggleRow
              compact={compact}
              icon={<Gauge className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.statsOverlay")}
              description={compact ? undefined : t("watch.playerSettings.statsOverlayDesc")}
              value={statsOverlayEnabled}
              onChange={setStatsOverlayEnabled}
            />
          </div>
        ) : null}

        {panel === "captions" ? (
          preferDub ? (
            <div className="px-3.5 py-6 text-center text-[12px] text-white/40">
              {t("watch.playerSettings.subtitlesDubHint")}
            </div>
          ) : (
            <div className="space-y-0.5 py-0.5">
              <ToggleRow
                compact={compact}
                icon={<Captions className="h-3.5 w-3.5" />}
                label={t("watch.playerSettings.autoEnableSubtitles")}
                description={
                  compact ? undefined : t("watch.playerSettings.autoEnableSubtitlesDesc")
                }
                value={autoEnableSubtitles}
                onChange={setAutoEnableSubtitles}
              />
              {watchingHardSub ? (
                <ToggleRow
                  compact={compact}
                  icon={<Subtitles className="h-3.5 w-3.5" />}
                  label={t("watch.playerSettings.hardSubSoftSubs")}
                  description={
                    compact ? undefined : t("watch.playerSettings.hardSubSoftSubsDesc")
                  }
                  value={hardSubSoftSubs}
                  onChange={setHardSubSoftSubs}
                />
              ) : null}
              {onOpenCaptionsTracks ? (
                <MenuSection title={t("watch.playerSettings.captionTracks")} dense={compact}>
                  <MenuItem dense={compact} onClick={onOpenCaptionsTracks}>
                    {captionsTrackLabel ?? t("watch.playerSettings.captionTracks")}
                  </MenuItem>
                </MenuSection>
              ) : null}
              {!compact ? (
                <div className="border-t border-white/[0.06] px-2 py-2 [&_*]:border-white/10">
                  <SubtitleSettingsPanel compact />
                </div>
              ) : null}
            </div>
          )
        ) : null}

        {panel === "speed" ? (speedPanel ?? null) : null}

        {panel === "quality" ? (qualityPanel ?? null) : null}

        {panel === "display" ? (
          <div className="divide-y divide-white/[0.06] py-0.5">
            <ToggleRow
              compact={compact}
              icon={<Moon className="h-3.5 w-3.5" />}
              label={t("watch.toolbar.lightsOff")}
              description={compact ? undefined : t("watch.playerSettings.theatre")}
              value={theatreMode}
              onChange={() => toggleTheatreMode()}
            />
            <ToggleRow
              compact={compact}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.posterTheme")}
              description={compact ? undefined : t("watch.playerSettings.posterThemeDesc")}
              value={watchPosterTheme}
              onChange={setWatchPosterTheme}
            />
            <ToggleRow
              compact={compact}
              icon={<PanelTop className="h-3.5 w-3.5" />}
              label={t("watch.playerSettings.showProvidersShort")}
              description={
                compact ? undefined : t("watch.playerSettings.providersToggleDesc")
              }
              value={showPlayerControls}
              onChange={setShowPlayerControls}
            />
            {displayExtras}
          </div>
        ) : null}

        {panel === "dns" ? (
          <div className="py-0.5">
            {!compact ? (
              <p className="px-3.5 pb-1.5 pt-2 text-[10px] leading-snug text-white/35">
                {t("watch.playerSettings.dnsHint")}
              </p>
            ) : null}
            <MenuSection title={t("watch.playerSettings.dnsRouting")} dense={compact}>
              <MenuItem
                dense={compact}
                active={!kittyProxyManual}
                onClick={selectDnsAuto}
                meta={
                  fastestId
                    ? (() => {
                        const fast = KITTY_API_NODES.find((n) => n.id === fastestId);
                        const flag = fast
                          ? flagForKittyLocation(fast.location)
                          : null;
                        const ping = formatKittyPingMs(pingByNode[fastestId]);
                        return [flag, ping].filter(Boolean).join(" ") || undefined;
                      })()
                    : dnsPingLoading
                      ? "…"
                      : undefined
                }
              >
                <span className="inline-flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                  {t("watch.playerSettings.dnsAuto")}
                </span>
              </MenuItem>
            </MenuSection>
            <MenuSection title={t("watch.playerSettings.dnsLocations")} dense={compact}>
              {KITTY_API_NODES.map((node) => {
                const active = kittyProxyManual && kittyProxyNode === node.id;
                const flag = flagForKittyLocation(node.location);
                const offline = pingById.get(node.id)?.ok === false;
                return (
                  <MenuItem
                    key={node.id}
                    dense={compact}
                    active={active}
                    onClick={() => selectDnsNode(node.id)}
                    meta={formatNodeMeta(node.id)}
                    className={offline ? "opacity-55" : undefined}
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-[13px] leading-none" aria-hidden>
                        {flag ?? "🌐"}
                      </span>
                      <span className="truncate">{node.location}</span>
                      {fastestId === node.id ? (
                        <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-px text-[9px] font-medium uppercase tracking-wide text-emerald-300/90">
                          {t("watch.playerSettings.dnsFastest")}
                        </span>
                      ) : null}
                    </span>
                  </MenuItem>
                );
              })}
            </MenuSection>
          </div>
        ) : null}
      </div>
    </div>
  );
}
