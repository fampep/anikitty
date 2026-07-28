"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import Hls from "hls.js";

import {
  formatHlsAudioTrackLabel,
  pickHlsAudioTrack,
} from "@/lib/kitty/hls-audio";
import { createHlsConfig } from "@/lib/kitty/hls-config";
import { trackEvent } from "@/lib/analytics";
import {
  exitElementFullscreen,
  elementSupportsFullscreenRequest,
  getFullscreenElement,
  isElementFullscreen,
  onFullscreenChange,
  requestElementFullscreen,
} from "@/lib/kitty/fullscreen";
import {
  consumePersistCssFullscreen,
  isCssFullscreenActive,
  markPersistCssFullscreen,
  peekPersistCssFullscreen,
} from "@/lib/kitty/fullscreen-persist";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import { buildKittyHlsUrl } from "@/lib/kitty/kitty-hls-url";
import {
  onPlayerOrientationChange,
  resolvePlayerOrientClass,
  tryLockLandscapeOrientation,
  tryUnlockScreenOrientation,
  type PlayerOrientClass,
} from "@/lib/kitty/player-orientation";
import {
  dedupeStreamQualities,
  formatStreamQualityLabel,
  type KittyStreamQuality,
} from "@/lib/kitty/stream-quality";
import { isHlsStreamUrl, isMp4StreamUrl } from "@/lib/kitty/stream-format";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import {
  createHtmlVideoPlayerController,
  type PlayerController,
} from "@/lib/player/player-controller";
import {
  getTrackFile,
  isSubtitleTrack,
  labelToLanguage,
  type StreamTrack,
} from "@/lib/subtitles/subtitle-track-utils";
import { useStoryboardCues } from "@/hooks/use-storyboard-cues";
import {
  findStoryboardCue,
  pickStoryboardUrl,
  type StoryboardCue,
} from "@/lib/player/storyboard-vtt";

import {
  AirPlayConnectedIcon,
  AirPlayIcon,
  AudioIcon,
  CastConnectedIcon,
  CastIcon,
  EpisodeNextIcon,
  EpisodePrevIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  SeekBackIcon,
  SeekForwardIcon,
  SettingsIcon,
  CaptionsIcon,
  VolumeIcon,
  VolumeLowIcon,
  VolumeMuteIcon,
} from "./icons";
import type { SkipTimes } from "@/hooks/use-aniskip";
import type { W2gSyncState } from "@/lib/kitty/video-player-types";
import {
  attachAnime4k,
  isWebGpuSupported,
} from "@/lib/player/anime4k";
import { useSettingsStore } from "@/store/settings-store";
import { useEffectiveLiteMode } from "@/hooks/use-effective-lite-mode";
import {
  IconButton,
  MenuItem,
  MenuSection,
  NextEpisodeChip,
  PLAYER_POPOVER_CLASS,
  PLAYER_POPOVER_MOTION_CLASS,
  PLAYER_SHEET_CLASS,
  PLAYER_SHEET_LAYER_CLASS,
  PlayerOverlayPortal,
  SeekPreviewCard,
  SegmentedChoice,
  ShortcutsPanel,
  UpNextCountdown,
  VerticalSliderPopover,
} from "./chrome";
import { PlayerSubtitleOverlay } from "./subtitle-overlay";
import PlayerSettingsMenu from "./settings-menu";
import { useAirPlay } from "./hooks/use-airplay";
import { useChromeIdle } from "./hooks/use-chrome-idle";
import { usePlayerFullscreen } from "./hooks/use-fullscreen";
import { isLikelyCastWebVttUrl, prepareCastMediaUrl } from "./cast/google-cast";
import {
  buildCastMediaRequest,
  useGoogleCast,
} from "./hooks/use-google-cast";
import { useSurfaceGestures } from "./hooks/use-surface-gestures";
import { QualityMenuContent } from "./menus/quality-menu";
import { SpeedMenuContent } from "./menus/speed-menu";
import {
  AudioBoostController,
  formatVolumeBoost,
  sanitizeVolumeBoost,
  VOLUME_BOOST_MAX,
  VOLUME_BOOST_MIN,
} from "./audio-boost";
import {
  BUFFER_SPINNER_MS,
  CLICK_DELAY_MS,
  EMPTY_HEADERS,
  EMPTY_QUALITIES,
  EMPTY_TRACKS,
  FINE_SCRUB_WINDOW_SECS,
  GESTURE_HINT_MS,
  HOLD_SPEED_RATE,
  IDLE_AFTER_PLAY_MS,
  IDLE_MS,
  LONG_PRESS_MS,
  PREFS_SAVE_MS,
  SEEK_FLASH_MS,
  SEEK_STEP,
  SEEK_STEP_FINE,
  TOUCH_DOUBLE_TAP_MS,
  TOUCH_DOUBLE_TAP_PX,
} from "./constants";
import {
  buildSkipSegments,
  segmentAtTime,
  skipKindLabel,
  type SkipSegment,
  type SkipSegmentKind,
} from "./skip-segments";
import {
  isResolutionQualityLadder,
  parseHeight,
  resolveTrackSrc,
} from "./quality";
import type {
  AniKittyPlayerProps,
  BufferedRange,
  CaptionOption,
  CustomVideoPlayerProps,
  GestureHint,
  HlsAudioOption,
  HlsLevelOption,
  KittyPlayerProps,
  WebkitVideo,
} from "./types";
import {
  bufferedRangesEqual,
  CAPTION_OFFSET_OPTIONS,
  captionPositionCss,
  captionSizeCss,
  clamp,
  KITTY_PLAYER_SPEEDS,
  formatPlayerTime,
  isAppleTouchDevice,
  loadKittyPlayerPrefs,
  nextKittyPlayerSpeed,
  prefersCoarsePointer,
  prefersCssFullscreen,
  pulsePlayerHaptic,
  resolveStreamAttachMode,
  saveKittyPlayerPrefs,
  sniffIsHlsPlaylist,
  type CaptionPositionPref,
  type CaptionSizePref,
} from "./utils";

export type {
  AniKittyPlayerProps,
  CustomVideoPlayerProps,
  KittyPlayerProps,
} from "./types";

function exitPictureInPictureSafe(video: HTMLVideoElement | null) {
  if (typeof document === "undefined" || !video) return;
  try {
    if (document.pictureInPictureElement === video) {
      void document.exitPictureInPicture();
      return;
    }
  } catch {
    /* ignore */
  }
  const wk = video as WebkitVideo;
  if (wk.webkitPresentationMode === "picture-in-picture") {
    try {
      wk.webkitSetPresentationMode?.("inline");
    } catch {
      /* ignore */
    }
  }
}

export function KittyPlayer({
  src,
  poster,
  title,
  seriesTitle,
  episodeNumber,
  className,
  tracks = EMPTY_TRACKS,
  qualities = EMPTY_QUALITIES,
  headers = EMPTY_HEADERS,
  kittyNodeId,
  startTime = 0,
  skipTimes,
  thumbnails,
  preferSubtitles = true,
  preferDubAudio = false,
  autoFullscreen = false,
  fullscreenContainerRef,
  nextEpisode,
  prevEpisode,
  onSelectQuality,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onPrevEpisode,
  onOutroStart,
  onEnded,
  onFatalError,
  onPlayerReady,
  w2g,
  playbackIssueHint,
  watchingHardSub = false,
}: KittyPlayerProps) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const captionsMenuRef = useRef<HTMLDivElement>(null);
  const qualityMenuRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const captionsTriggerRef = useRef<HTMLButtonElement>(null);
  const qualityTriggerRef = useRef<HTMLButtonElement>(null);
  const speedTriggerRef = useRef<HTMLButtonElement>(null);
  const audioTriggerRef = useRef<HTMLButtonElement>(null);
  const popoverOpenRef = useRef(false);
  /** Pointer is over the bottom chrome — keep controls pinned. */
  const chromePinnedRef = useRef(false);
  const hlsRef = useRef<Hls | null>(null);
  /** Kick HLS when `waiting` sticks after resume / buffer stall. */
  const stallWatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekingRef = useRef(false);
  const startAppliedRef = useRef(false);
  const startedRef = useRef(false);
  const lastProgressTsRef = useRef(0);
  const volumeBeforeMuteRef = useRef(1);
  const audioBoostRef = useRef<AudioBoostController | null>(null);
  if (audioBoostRef.current == null) {
    audioBoostRef.current = new AudioBoostController();
  }
  const audioUserPickedRef = useRef(false);
  const qualityResumeRef = useRef<number | null>(null);
  const mediaRetryRef = useRef(false);
  const scrubRafRef = useRef<number | null>(null);
  const scrubTargetRef = useRef<number | null>(null);
  const scrubOriginRef = useRef<{
    time: number;
    clientX: number;
    fine: boolean;
  } | null>(null);
  const seekAccumRef = useRef<{
    side: "left" | "right";
    total: number;
    resetAt: number;
  } | null>(null);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPrefsPatchRef = useRef<Parameters<typeof saveKittyPlayerPrefs>[0] | null>(null);
  const holdSpeedActiveRef = useRef(false);
  const rateBeforeHoldRef = useRef(1);
  const initialPrefsRef = useRef(
    typeof window !== "undefined" ? loadKittyPlayerPrefs() : null,
  );
  const playbackRateRef = useRef(initialPrefsRef.current?.playbackRate ?? 1);
  const onLiveTimeRef = useRef(onLiveTime);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onOutroStartRef = useRef(onOutroStart);
  const onStartRef = useRef(onStart);
  const onFatalErrorRef = useRef(onFatalError);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onPrevEpisodeRef = useRef(onPrevEpisode);
  const startTimeRef = useRef(startTime);
  const preferDubAudioRef = useRef(preferDubAudio);
  const skipTimesRef = useRef(skipTimes);
  const qualitiesRef = useRef(qualities);
  const w2gRef = useRef(w2g);
  const nextEpisodeRef = useRef(nextEpisode);
  const prevEpisodeRef = useRef(prevEpisode);
  const introAutoSkippedRef = useRef(false);
  const recapAutoSkippedRef = useRef(false);
  const outroAutoSkippedRef = useRef(false);
  const outroFiredRef = useRef(false);
  const endHandledRef = useRef(false);
  const autoNextStartedRef = useRef(false);
  const nextNavLockRef = useRef(false);
  const applyingW2gRef = useRef(false);
  const lastW2gReportRef = useRef(0);
  const autoFsRef = useRef(false);
  const anime4kDetachRef = useRef<(() => void) | null>(null);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const liteMode = useEffectiveLiteMode();
  const seekStepSeconds = useSettingsStore((s) => s.seekStepSeconds);
  const playerTouchSeekEnabled = useSettingsStore((s) => s.playerTouchSeekEnabled);
  const autoSkipRef = useRef(autoSkipIntro);
  const autoNextRef = useRef(autoPlay);
  const seekStepRef = useRef(seekStepSeconds);

  onLiveTimeRef.current = onLiveTime;
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onOutroStartRef.current = onOutroStart;
  onStartRef.current = onStart;
  onFatalErrorRef.current = onFatalError;
  onPlayerReadyRef.current = onPlayerReady;
  onNextEpisodeRef.current = onNextEpisode;
  onPrevEpisodeRef.current = onPrevEpisode;
  startTimeRef.current = startTime;
  preferDubAudioRef.current = preferDubAudio;
  skipTimesRef.current = skipTimes;
  qualitiesRef.current = qualities;
  w2gRef.current = w2g;
  nextEpisodeRef.current = nextEpisode;
  prevEpisodeRef.current = prevEpisode;
  autoSkipRef.current = autoSkipIntro;
  autoNextRef.current = autoPlay;
  seekStepRef.current = seekStepSeconds;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedRanges, setBufferedRanges] = useState<BufferedRange[]>([]);
  const [volume, setVolume] = useState(
    () => initialPrefsRef.current?.volume ?? 1,
  );
  const [muted, setMuted] = useState(
    () => initialPrefsRef.current?.muted ?? false,
  );
  const [volumeBoost, setVolumeBoostState] = useState(
    () => initialPrefsRef.current?.volumeBoost ?? 1,
  );
  const volumeBoostRef = useRef(volumeBoost);
  volumeBoostRef.current = volumeBoost;
  const [brightness, setBrightness] = useState(
    () => initialPrefsRef.current?.brightness ?? 1,
  );
  const brightnessRef = useRef(brightness);
  const [captionSize, setCaptionSize] = useState<CaptionSizePref>(
    () => initialPrefsRef.current?.captionSize ?? "md",
  );
  const [captionPosition, setCaptionPosition] = useState<CaptionPositionPref>(
    () => initialPrefsRef.current?.captionPosition ?? "low",
  );
  const [captionOffset, setCaptionOffset] = useState(
    () => initialPrefsRef.current?.captionOffset ?? 0,
  );
  /** Avoid reclaim loops when the UA keeps promoting bare <video> fullscreen. */
  const reclaimHostFsRef = useRef(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipBlocked, setPipBlocked] = useState(false);
  const [inPip, setInPip] = useState(false);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [castErrorDismissed, setCastErrorDismissed] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [mediaSeeking, setMediaSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    time: number;
    ratio: number;
  } | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [spinnerArmed, setSpinnerArmed] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"left" | "right" | null>(null);
  const [seekFlashSecs, setSeekFlashSecs] = useState(0);
  const [gestureHint, setGestureHint] = useState<GestureHint | null>(null);
  const [playbackIssue, setPlaybackIssue] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [liveRegionAnnouncement, setLiveRegionAnnouncement] = useState("");
  const [playbackRate, setPlaybackRateState] = useState(
    () => initialPrefsRef.current?.playbackRate ?? 1,
  );
  const [srcOverride, setSrcOverride] = useState<string | null>(null);
  const [hlsLevels, setHlsLevels] = useState<HlsLevelOption[]>([]);
  const [hlsLevelIndex, setHlsLevelIndex] = useState(-1);
  const [hlsAudioOptions, setHlsAudioOptions] = useState<HlsAudioOption[]>([]);
  const [hlsAudioIndex, setHlsAudioIndex] = useState(0);
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null);
  const lastCaptionIdRef = useRef<string | null>(null);
  /** User toggled CC in this session — ignore preferSubtitles auto-gate. */
  const captionUserPickedRef = useRef(false);
  const volumeLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeLongPressFiredRef = useRef(false);
  const [holdSpeedActive, setHoldSpeedActive] = useState(false);
  const [castPosterReady, setCastPosterReady] = useState(false);
  const playLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playLongPressFiredRef = useRef(false);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");
  /** Narrow player chrome (minimized / side column) — hide non-essential bar icons. */
  const [compactChrome, setCompactChrome] = useState(false);
  const [iosVolumeLocked] = useState(() => isAppleTouchDevice());
  const [attachNonce, setAttachNonce] = useState(0);
  /** Cookie-free absolute URL for AirPlay native HLS (MSE cannot be AirPlayed). */
  const [airPlayNativeUrl, setAirPlayNativeUrl] = useState<string | null>(null);
  const airPlayNativeUrlRef = useRef<string | null>(null);
  const airPlayRemintCacheRef = useRef<{ src: string; url: string } | null>(null);
  const [activeSkip, setActiveSkip] = useState<SkipSegmentKind | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [anime4kActive, setAnime4kActive] = useState(false);

  const skipSegments = useMemo(() => buildSkipSegments(skipTimes), [skipTimes]);

  const storyboardUrl = useMemo(
    () =>
      pickStoryboardUrl({
        thumbnails,
        tracks,
      }),
    [thumbnails, tracks],
  );
  const { cues: storyboardCues } = useStoryboardCues(storyboardUrl);
  const hoverStoryboardCue = useMemo(() => {
    const t = hoverPreview?.time;
    if (t == null || !storyboardCues.length) return null;
    return findStoryboardCue(storyboardCues, t);
  }, [hoverPreview?.time, storyboardCues]);

  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  /**
   * Fullscreen the player root (video + chrome). Preferring the outer watch
   * host broke the control bar in FS — chrome must live on the FS element.
   * Episode transitions keep this root mounted (stable shell key), so FS stays.
   * Fall back to the persistent host only when the root is unavailable.
   */
  const getFullscreenTarget = useCallback((): HTMLElement | null => {
    return rootRef.current ?? fullscreenContainerRef?.current ?? null;
  }, [fullscreenContainerRef]);

  useEffect(() => {
    introAutoSkippedRef.current = false;
    recapAutoSkippedRef.current = false;
    outroAutoSkippedRef.current = false;
    outroFiredRef.current = false;
    endHandledRef.current = false;
    autoNextStartedRef.current = false;
    nextNavLockRef.current = false;
    setActiveSkip(null);
    setCountdown(null);
  }, [src, skipTimes?.intro?.start, skipTimes?.intro?.end, skipTimes?.outro?.start, skipTimes?.outro?.end, skipTimes?.recap?.start, skipTimes?.recap?.end]);

  const resolvedSrc = useMemo(() => {
    const raw = (srcOverride ?? src).trim();
    if (!raw) return "";
    // Prefer same-origin Kitty proxy when the parent still has an upstream URL.
    return buildKittyHlsUrl(raw, headers, kittyNodeId) || raw;
  }, [src, srcOverride, headers, kittyNodeId]);

  const activeSrc = resolvedSrc;

  const castingRef = useRef(false);
  const castRemotePlayingRef = useRef(false);
  /** True while Chromecast session is connecting or connected (not AirPlay). */
  const castOwnsSurfaceRef = useRef(false);
  const bumpControlsRef = useRef<(opts?: { hideAfterMs?: number }) => void>(
    () => {},
  );
  const showGestureHintRef = useRef<(hint: GestureHint) => void>(() => {});

  const captionOptions = useMemo<CaptionOption[]>(() => {
    return tracks
      .filter(isSubtitleTrack)
      .map((track, index) => {
        const file = getTrackFile(track) ?? "";
        const resolved = resolveTrackSrc(file);
        const label = track.label?.trim() || `Subtitle ${index + 1}`;
        return {
          id: `${resolved}::${label}`,
          label,
          src: resolved,
          language: labelToLanguage(label),
          isDefault: Boolean(track.default),
        };
      })
      .filter((track) => Boolean(track.src));
  }, [tracks]);

  /** Chromecast DMR only renders WebVTT — keep Cast trackIds aligned with this list. */
  const castCaptionOptions = useMemo(
    () =>
      captionOptions.filter((track) =>
        isLikelyCastWebVttUrl(track.src, track.label),
      ),
    [captionOptions],
  );

  const serverQualities = useMemo(() => {
    const deduped = dedupeStreamQualities(qualities);
    // Prefer resolution ladders, but still expose named allServers mirrors
    // (Default / Mp4 / Ok, etc.) when multiple distinct URLs exist.
    if (deduped.length > 1 && isResolutionQualityLadder(deduped)) return deduped;
    if (deduped.length > 1) return deduped;
    return [];
  }, [qualities]);

  const showHlsQualityMenu = serverQualities.length === 0 && hlsLevels.length > 1;
  const showQualityPicker =
    serverQualities.length > 1 || showHlsQualityMenu;
  const showAudioMenu = hlsAudioOptions.length > 1;
  const showCaptionsMenu = captionOptions.length > 0;

  const displayTime = seekPreview ?? currentTime;

  const closePopovers = useCallback(() => {
    setVolumeOpen(false);
    setMoreOpen(false);
    setCaptionsOpen(false);
    setQualityOpen(false);
    setSpeedOpen(false);
    setAudioOpen(false);
    setHelpOpen(false);
  }, []);

  const {
    controlsVisible,
    setControlsVisible,
    controlsVisibleRef,
    idleTimerRef,
    revealGuardUntilRef,
    clearIdleTimer,
    bumpControls,
    revealControlsFromTouch,
    hideControls,
  } = useChromeIdle({
    videoRef,
    seekingRef,
    chromePinnedRef,
    popoverOpenRef,
    castingRef,
    castRemotePlayingRef,
    closePopovers,
  });

  const {
    fullscreen,
    setFullscreen,
    cssFullscreen,
    setCssFullscreen,
    cssFullscreenRef,
    enterCssFullscreen,
    toggleFullscreen,
  } = usePlayerFullscreen({
    rootRef,
    videoRef,
    getFullscreenTarget,
    autoFullscreen,
    bumpControls,
    setControlsVisible,
  });

  useEffect(() => {
    cssFullscreenRef.current = cssFullscreen;
  }, [cssFullscreen, cssFullscreenRef]);

  // CSS fullscreen: cover the real viewport (escape .site-page z-1 under nav).
  useEffect(() => {
    const host = getFullscreenTarget();
    if (!host) return;

    const root = document.documentElement;
    const body = document.body;
    const persistentHost = fullscreenContainerRef?.current === host;

    if (!cssFullscreen) {
      if (persistentHost && peekPersistCssFullscreen()) {
        return;
      }
      host.classList.remove("anikitty-fs-host--active");
      root.classList.remove("anikitty-css-fs");
      body.classList.remove("anikitty-css-fs");
      return;
    }

    host.classList.add("anikitty-fs-host--active");
    root.classList.add("anikitty-css-fs");
    body.classList.add("anikitty-css-fs");
    markPersistCssFullscreen(false);

    let marker: Comment | null = null;
    const homeParent = host.parentNode;
    if (homeParent && homeParent !== body) {
      marker = document.createComment("anikitty-fs-home");
      homeParent.insertBefore(marker, host);
      body.appendChild(host);
    }

    return () => {
      if (persistentHost && peekPersistCssFullscreen()) {
        return;
      }
      host.classList.remove("anikitty-fs-host--active");
      root.classList.remove("anikitty-css-fs");
      body.classList.remove("anikitty-css-fs");
      if (marker?.parentNode) {
        marker.parentNode.insertBefore(host, marker);
        marker.parentNode.removeChild(marker);
      }
    };
  }, [cssFullscreen, getFullscreenTarget, fullscreenContainerRef]);

  const showSeekFlash = useCallback((side: "left" | "right", secs?: number) => {
    const fromAccum =
      seekAccumRef.current?.side === side ? seekAccumRef.current.total : 0;
    const step = secs ?? (fromAccum > 0 ? fromAccum : seekStepRef.current || SEEK_STEP);
    setSeekFlashSecs(step);
    setSeekFlash(side);
    if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
    seekFlashTimerRef.current = setTimeout(() => {
      setSeekFlash(null);
      seekFlashTimerRef.current = null;
    }, SEEK_FLASH_MS);
  }, []);

  const showGestureHint = useCallback((hint: GestureHint) => {
    setGestureHint(hint);
    setLiveRegionAnnouncement(
      hint.detail ? `${hint.label}, ${hint.detail}` : hint.label,
    );
    if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    gestureHintTimerRef.current = setTimeout(() => {
      setGestureHint(null);
      gestureHintTimerRef.current = null;
    }, GESTURE_HINT_MS);
  }, []);

  // Debounce the buffering spinner so quick seeks don't flash; skip while scrubbing.
  useEffect(() => {
    if (sourceLoading) {
      setSpinnerArmed(true);
      return;
    }
    if (mediaSeeking && !seeking) {
      setSpinnerArmed(true);
      return;
    }
    if (!buffering || seeking) {
      setSpinnerArmed(false);
      return;
    }
    const timer = setTimeout(() => setSpinnerArmed(true), BUFFER_SPINNER_MS);
    return () => clearTimeout(timer);
  }, [buffering, sourceLoading, seeking, mediaSeeking]);

  // Soft-retry the stream when connectivity returns after a fatal error.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncOffline = () => setIsOffline(!window.navigator.onLine);
    const onOnline = () => {
      setIsOffline(false);
      if (!playbackIssue) return;
      mediaRetryRef.current = false;
      setPlaybackIssue(null);
      setAttachNonce((n) => n + 1);
      showGestureHint({
        label: t("watch.offlineBackOnline"),
        detail: t("watch.offlineRetrying"),
      });
    };
    const onOffline = () => setIsOffline(true);
    syncOffline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [playbackIssue, showGestureHint, t]);

  bumpControlsRef.current = bumpControls;
  showGestureHintRef.current = showGestureHint;
  popoverOpenRef.current =
    volumeOpen ||
    moreOpen ||
    captionsOpen ||
    qualityOpen ||
    speedOpen ||
    audioOpen ||
    helpOpen;

  const schedulePrefsSave = useCallback((patch: Parameters<typeof saveKittyPlayerPrefs>[0]) => {
    pendingPrefsPatchRef.current = {
      ...(pendingPrefsPatchRef.current ?? {}),
      ...patch,
    };
    if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    prefsSaveTimerRef.current = setTimeout(() => {
      prefsSaveTimerRef.current = null;
      const pending = pendingPrefsPatchRef.current;
      pendingPrefsPatchRef.current = null;
      if (pending) saveKittyPlayerPrefs(pending);
    }, PREFS_SAVE_MS);
  }, []);

  // Flush volume/mute (and any pending prefs) before unmount so episode swaps keep them.
  useEffect(() => {
    return () => {
      if (prefsSaveTimerRef.current) {
        clearTimeout(prefsSaveTimerRef.current);
        prefsSaveTimerRef.current = null;
      }
      const pending = pendingPrefsPatchRef.current;
      pendingPrefsPatchRef.current = null;
      if (pending) saveKittyPlayerPrefs(pending);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Apply remembered volume / mute / boost once the video element mounts.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const prefs = initialPrefsRef.current;
    if (!prefs) return;
    video.volume = prefs.volume;
    video.muted = prefs.muted;
    if (prefs.volume > 0 && !prefs.muted) {
      volumeBeforeMuteRef.current = prefs.volume;
    }
    audioBoostRef.current?.ensure(video, prefs.volumeBoost ?? 1);
  }, []);

  // Dispose Web Audio graph only when the player unmounts (not on src swaps).
  useEffect(() => {
    const boost = audioBoostRef.current;
    return () => {
      boost?.dispose();
    };
  }, []);

  /** Shared local / Cast end → up-next countdown (guards double-fire). */
  const beginEndedFlow = useCallback(() => {
    if (endHandledRef.current) return;
    endHandledRef.current = true;
    onEndedRef.current?.();
    if (
      nextEpisodeRef.current &&
      autoNextRef.current &&
      !autoNextStartedRef.current
    ) {
      autoNextStartedRef.current = true;
      setCountdown(5);
    }
  }, []);
  const beginEndedFlowRef = useRef(beginEndedFlow);
  beginEndedFlowRef.current = beginEndedFlow;

  const goToNextEpisode = useCallback(() => {
    if (!nextEpisodeRef.current) return;
    if (nextNavLockRef.current) return;
    nextNavLockRef.current = true;
    autoNextStartedRef.current = true;
    setCountdown(null);
    onNextEpisodeRef.current?.();
  }, []);
  const goToNextEpisodeRef = useRef(goToNextEpisode);
  goToNextEpisodeRef.current = goToNextEpisode;

  const goToPrevEpisode = useCallback(() => {
    if (!prevEpisodeRef.current) return;
    if (nextNavLockRef.current) return;
    nextNavLockRef.current = true;
    setCountdown(null);
    onPrevEpisodeRef.current?.();
  }, []);
  const goToPrevEpisodeRef = useRef(goToPrevEpisode);
  goToPrevEpisodeRef.current = goToPrevEpisode;

  const getCastMedia = useCallback(() => {
    const video = videoRef.current;
    const resume = qualityResumeRef.current;
    let seek =
      resume != null && resume > 0
        ? resume
        : castingRef.current
          ? currentTime
          : (video?.currentTime ?? currentTime);
    // Fresh episode / remount: prefer startTime over a stale near-end clock.
    if (
      (resume == null || resume <= 0) &&
      seek > 1 &&
      currentTime < 1 &&
      startTimeRef.current < 1
    ) {
      seek = startTimeRef.current > 0 ? startTimeRef.current : 0;
    } else if (
      (resume == null || resume <= 0) &&
      seek < 1 &&
      startTimeRef.current > 0
    ) {
      seek = startTimeRef.current;
    }
    const activeCastCaptionId =
      selectedCaptionId == null
        ? null
        : castCaptionOptions.some((t) => t.id === selectedCaptionId)
          ? selectedCaptionId
          : (castCaptionOptions[0]?.id ?? null);

    return buildCastMediaRequest({
      url: activeSrc,
      qualities,
      title,
      seriesTitle,
      episode: episodeNumber,
      posterUrl: poster,
      subtitle: seriesTitle
        ? `${seriesTitle} · AniKitty`
        : "AniKitty",
      currentTime: seek,
      autoplay: true,
      volume: muted ? 0 : volume,
      muted,
      textTracks: castCaptionOptions.map((track) => ({
        url: track.src,
        label: track.label,
        language: track.language,
        active: Boolean(
          activeCastCaptionId && track.id === activeCastCaptionId,
        ),
      })),
    });
  }, [
    activeSrc,
    qualities,
    title,
    seriesTitle,
    episodeNumber,
    poster,
    currentTime,
    volume,
    muted,
    castCaptionOptions,
    selectedCaptionId,
  ]);

  const onCastSessionEnd = useCallback(
    (info: { resumeAt: number | null; wasPlaying: boolean }) => {
      const video = videoRef.current;
      castingRef.current = false;
      if (!video) return;
      if (info.resumeAt != null && Number.isFinite(info.resumeAt)) {
        try {
          video.currentTime = info.resumeAt;
          setCurrentTime(info.resumeAt);
        } catch {
          /* ignore seek failures during handoff */
        }
      }
      try {
        video.muted = muted;
        video.volume = volume;
      } catch {
        /* ignore */
      }
      if (info.wasPlaying) {
        void video.play().catch(() => {});
      }
      bumpControlsRef.current();
      showGestureHintRef.current({
        label: "Cast ended",
        detail: "Resumed here",
      });
    },
    [muted, volume],
  );

  const castStartedThisMountRef = useRef(false);

  const onCastStarted = useCallback(() => {
    castStartedThisMountRef.current = true;
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
    try {
      if (video) video.muted = true;
    } catch {
      /* ignore */
    }
    exitPictureInPictureSafe(video);
    bumpControlsRef.current();
    showGestureHintRef.current({ label: "Casting…", detail: "Chromecast" });
  }, []);

  const onCastError = useCallback((message: string) => {
    bumpControlsRef.current();
    showGestureHintRef.current({
      label: "Cast failed",
      detail: message.length > 72 ? `${message.slice(0, 72)}…` : message,
    });
  }, []);

  const onCastMediaEnded = useCallback(() => {
    beginEndedFlowRef.current();
  }, []);

  const cast = useGoogleCast({
    enabled: Boolean(activeSrc),
    getMedia: getCastMedia,
    onSessionEnd: onCastSessionEnd,
    onCastStarted,
    onCastError,
    onMediaEnded: onCastMediaEnded,
  });
  castingRef.current = cast.casting;
  castRemotePlayingRef.current = cast.remotePlaying;
  castOwnsSurfaceRef.current = cast.casting || cast.connecting;

  const {
    available: castAvailable,
    casting,
    connecting: castConnecting,
    deviceName: castDeviceName,
    remotePlaying: castRemotePlaying,
    remoteTime: castRemoteTime,
    remoteDuration: castRemoteDuration,
    remoteVolume: castRemoteVolume,
    remoteMuted: castRemoteMuted,
    lastError: castLastError,
    toggleCast,
    playOrPause: castPlayOrPause,
    seekTo: castSeekTo,
    setVolumeLevel: castSetVolume,
    syncMedia: castSyncMedia,
    setActiveTextTrackIds: castSetActiveTextTrackIds,
    attachedTextTrackIds: castAttachedTextTrackIds,
  } = cast;

  useEffect(() => {
    setCastErrorDismissed(false);
  }, [castLastError]);

  const {
    available: airPlayAvailable,
    connected: airPlayConnected,
    preparing: airPlayPreparing,
    showPicker: showAirPlayPicker,
  } = useAirPlay({
    videoRef,
    enabled: Boolean(activeSrc),
    beforeShowPicker: async () => {
      const video = videoRef.current;
      const src = activeSrc;
      if (!video || !src) return false;

      let reminted = airPlayRemintCacheRef.current?.src === src
        ? airPlayRemintCacheRef.current.url
        : null;
      if (!reminted) {
        const prepared = await prepareCastMediaUrl(src);
        if (!prepared.ok || !prepared.url) {
          showGestureHintRef.current({
            label: "AirPlay failed",
            detail: prepared.error ?? "Could not prepare stream",
          });
          return false;
        }
        reminted = prepared.url;
        airPlayRemintCacheRef.current = { src, url: reminted };
      }

      const resume = video.currentTime > 0.5 ? video.currentTime : 0;
      qualityResumeRef.current = resume > 0 ? resume : qualityResumeRef.current;
      airPlayNativeUrlRef.current = reminted;
      setAirPlayNativeUrl(reminted);

      // Tear down MSE immediately so WebKit has a real networkable src.
      try {
        hlsRef.current?.destroy();
      } catch {
        /* ignore */
      }
      hlsRef.current = null;
      setHlsLevels([]);
      setHlsAudioOptions([]);
      video.src = reminted;

      const ready = await new Promise<boolean>((resolve) => {
        if (video.readyState >= 2) {
          resolve(true);
          return;
        }
        const timeout = window.setTimeout(() => {
          cleanup();
          resolve(video.readyState >= 1);
        }, 10_000);
        const onReady = () => {
          cleanup();
          resolve(true);
        };
        const onErr = () => {
          cleanup();
          resolve(false);
        };
        const cleanup = () => {
          window.clearTimeout(timeout);
          video.removeEventListener("loadeddata", onReady);
          video.removeEventListener("canplay", onReady);
          video.removeEventListener("error", onErr);
        };
        video.addEventListener("loadeddata", onReady);
        video.addEventListener("canplay", onReady);
        video.addEventListener("error", onErr);
      });

      if (!ready) {
        showGestureHintRef.current({
          label: "AirPlay failed",
          detail: "Stream not ready for Apple TV",
        });
        airPlayNativeUrlRef.current = null;
        setAirPlayNativeUrl(null);
        setAttachNonce((n) => n + 1);
        return false;
      }

      if (resume > 0.5) {
        try {
          video.currentTime = resume;
        } catch {
          /* ignore */
        }
      }

      // If the user dismisses the picker without connecting, restore MSE later.
      window.setTimeout(() => {
        const el = videoRef.current as
          | (HTMLVideoElement & { webkitCurrentPlaybackTargetIsWireless?: boolean })
          | null;
        if (!airPlayNativeUrlRef.current) return;
        if (el?.webkitCurrentPlaybackTargetIsWireless) return;
        airPlayNativeUrlRef.current = null;
        setAirPlayNativeUrl(null);
        if (el && el.currentTime > 0.5) {
          qualityResumeRef.current = el.currentTime;
        }
        setAttachNonce((n) => n + 1);
      }, 25_000);

      return true;
    },
    onWirelessChange: (connected) => {
      if (connected) return;
      if (!airPlayNativeUrlRef.current) return;
      // Restore credentialed hls.js / progressive after AirPlay ends.
      airPlayNativeUrlRef.current = null;
      setAirPlayNativeUrl(null);
      const video = videoRef.current;
      if (video && video.currentTime > 0.5) {
        qualityResumeRef.current = video.currentTime;
      }
      setAttachNonce((n) => n + 1);
    },
  });

  // Prefetch a cast-style remint while AirPlay is available so the picker stays snappy.
  useEffect(() => {
    if (!airPlayAvailable || !activeSrc) return;
    if (airPlayRemintCacheRef.current?.src === activeSrc) return;
    let cancelled = false;
    void prepareCastMediaUrl(activeSrc).then((prepared) => {
      if (cancelled || !prepared.ok || !prepared.url) return;
      airPlayRemintCacheRef.current = { src: activeSrc, url: prepared.url };
    });
    return () => {
      cancelled = true;
    };
  }, [airPlayAvailable, activeSrc]);

  useEffect(() => {
    airPlayRemintCacheRef.current = null;
  }, [activeSrc]);

  const effectivePlaying = casting ? castRemotePlaying : playing;
  const effectiveDuration =
    casting && castRemoteDuration > 0 ? castRemoteDuration : duration;
  const effectiveMuted = casting
    ? castRemoteMuted || castRemoteVolume === 0
    : muted || volume === 0;
  const effectiveVolume = casting
    ? castRemoteMuted
      ? 0
      : castRemoteVolume
    : muted
      ? 0
      : volume;
  const chromeVisible = controlsVisible || seeking || !effectivePlaying;

  // Cast resume doesn't fire the local <video> "play" event — hide chrome promptly.
  useEffect(() => {
    if (!casting || !castRemotePlaying) return;
    bumpControls({ hideAfterMs: IDLE_AFTER_PLAY_MS });
  }, [casting, castRemotePlaying, bumpControls]);


  // Keep local <video> quiet + frozen while Chromecast owns playback (incl. remount).
  useEffect(() => {
    if (!casting && !castConnecting) return;
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) video.pause();
    try {
      video.muted = true;
    } catch {
      /* ignore */
    }
    exitPictureInPictureSafe(video);
    // Soft-stop decode so frames don't paint under the poster between pauses.
    const onPlayWhileCasting = () => {
      if (!castOwnsSurfaceRef.current) return;
      video.pause();
      try {
        video.muted = true;
      } catch {
        /* ignore */
      }
    };
    video.addEventListener("play", onPlayWhileCasting);
    return () => video.removeEventListener("play", onPlayWhileCasting);
  }, [casting, castConnecting, activeSrc]);

  // Reload Cast media when the stream URL changes mid-session (quality switch),
  // or when this player remounts into an already-open Cast session (next episode).
  const wasCastingForSyncRef = useRef(false);
  useEffect(() => {
    if (!casting || !activeSrc) {
      wasCastingForSyncRef.current = casting;
      return;
    }
    if (!wasCastingForSyncRef.current) {
      wasCastingForSyncRef.current = true;
      // Remount / session resume: toggleCast already loaded on fresh cast.
      if (!castStartedThisMountRef.current) {
        void castSyncMedia();
      }
      return;
    }
    void castSyncMedia();
  }, [activeSrc, casting, castSyncMedia]);

  // Mirror remote progress + skip/outro while casting (local timeupdate is frozen).
  useEffect(() => {
    if (!casting) return;
    const t = castRemoteTime;
    const d = castRemoteDuration || duration;
    setCurrentTime(t);
    if (d > 0) {
      setDuration(d);
    }
    onLiveTimeRef.current?.(t, d);
    const now = Date.now();
    if (d > 0 && now - lastProgressTsRef.current >= 10_000) {
      lastProgressTsRef.current = now;
      onProgressRef.current?.(t, d);
    }

    const st = skipTimesRef.current;
    let nextSkip: SkipSegmentKind | null = null;
    if (st?.recap && t >= st.recap.start && t < st.recap.end) {
      nextSkip = "recap";
      if (autoSkipRef.current && !recapAutoSkippedRef.current) {
        recapAutoSkippedRef.current = true;
        castSeekTo(st.recap.end);
        setCurrentTime(st.recap.end);
        nextSkip = null;
      }
    } else if (st?.intro && t >= st.intro.start && t < st.intro.end) {
      nextSkip = "intro";
      if (autoSkipRef.current && !introAutoSkippedRef.current) {
        introAutoSkippedRef.current = true;
        castSeekTo(st.intro.end);
        setCurrentTime(st.intro.end);
        nextSkip = null;
      }
    } else if (st?.outro && t >= st.outro.start && t < st.outro.end) {
      nextSkip = "outro";
      if (autoSkipRef.current && !outroAutoSkippedRef.current) {
        outroAutoSkippedRef.current = true;
        castSeekTo(st.outro.end);
        setCurrentTime(st.outro.end);
        nextSkip = null;
      }
      if (!outroFiredRef.current && d > 0) {
        outroFiredRef.current = true;
        onOutroStartRef.current?.(d);
      }
    }
    setActiveSkip(nextSkip);
  }, [
    casting,
    castRemoteTime,
    castRemoteDuration,
    duration,
    castSeekTo,
  ]);

  // Reset local quality override when parent src changes (episode / provider).
  // Keep qualityResumeRef so in-player quality switches can restore time.
  useEffect(() => {
    setSrcOverride(null);
    audioUserPickedRef.current = false;
    mediaRetryRef.current = false;
  }, [src]);

  // Avoid cast-poster flash when the episode image URL changes mid-session.
  useEffect(() => {
    setCastPosterReady(false);
  }, [poster]);

  // Prefer-subtitles + remembered caption on/off + last track label.
  useEffect(() => {
    if (captionOptions.length === 0) {
      setSelectedCaptionId(null);
      return;
    }
    const prefs = loadKittyPlayerPrefs();
    // Explicit Off always wins.
    if (prefs.captionsOn === false) {
      setSelectedCaptionId(null);
      return;
    }
    // Auto-enable gate. Manual CC picks set captionUserPickedRef so a later
    // preferSubtitles=false (e.g. settings) does not wipe an intentional On.
    if (!preferSubtitles && !captionUserPickedRef.current) {
      setSelectedCaptionId(null);
      return;
    }
    if (prefs.captionLabel) {
      const byLabel = captionOptions.find((c) => c.label === prefs.captionLabel);
      if (byLabel) {
        setSelectedCaptionId(byLabel.id);
        lastCaptionIdRef.current = byLabel.id;
        return;
      }
    }
    const preferred =
      captionOptions.find((c) => c.isDefault) ?? captionOptions[0] ?? null;
    const id = preferred?.id ?? null;
    setSelectedCaptionId(id);
    if (id) lastCaptionIdRef.current = id;
  }, [captionOptions, preferSubtitles]);

  // Keep last-on track for CC toggle restore.
  useEffect(() => {
    if (selectedCaptionId) lastCaptionIdRef.current = selectedCaptionId;
  }, [selectedCaptionId]);

  // Softsubs are painted by PlayerSubtitleOverlay (fetch + parse VTT). Keep any
  // native / HLS-injected TextTracks disabled so the UA never paints ::cue.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const disableNative = () => {
      const list = video.textTracks;
      for (let i = 0; i < list.length; i++) {
        const tt = list[i];
        if (!tt) continue;
        if (tt.kind !== "subtitles" && tt.kind !== "captions") continue;
        if (tt.mode !== "disabled") tt.mode = "disabled";
      }
    };

    disableNative();
    video.textTracks.addEventListener("addtrack", disableNative);
    return () => {
      video.textTracks.removeEventListener("addtrack", disableNative);
    };
  }, [activeSrc, captionOptions.length]);

  // Re-apply preferDub when the watch page toggles SUB/DUB.
  useEffect(() => {
    audioUserPickedRef.current = false;
    const hls = hlsRef.current;
    if (!hls) return;
    pickHlsAudioTrack(hls, preferDubAudio);
    setHlsAudioIndex(hls.audioTrack);
  }, [preferDubAudio]);

  // Rotation-lock landscape CSS.
  useEffect(() => {
    const syncOrient = () => {
      setOrientClass(
        resolvePlayerOrientClass({
          isFullscreen:
            fullscreen ||
            cssFullscreen ||
            isElementFullscreen(getFullscreenTarget()) ||
            isElementFullscreen(rootRef.current),
          cssFullscreen,
        }),
      );
    };
    syncOrient();
    return onPlayerOrientationChange(syncOrient);
  }, [fullscreen, cssFullscreen, getFullscreenTarget]);

  const reportW2g = useCallback((isPlaying: boolean, time: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime: time });
    lastW2gReportRef.current = time;
  }, []);

  // Guest sync from host playback state.
  useEffect(() => {
    const video = videoRef.current;
    const cfg = w2g;
    if (!video || !cfg?.syncState || cfg.isHost) return;
    applyingW2gRef.current = true;
    video.currentTime = cfg.syncState.currentTime;
    if (cfg.syncState.isPlaying) void video.play().catch(() => {});
    else video.pause();
    applyingW2gRef.current = false;
  }, [w2g?.syncState?.version, w2g?.isHost, w2g?.syncState]);

  // Autoplay next-episode countdown tick.
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        goToNextEpisodeRef.current();
        return;
      }
      setCountdown(countdown - 1);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  // Anime4K WebGPU upscale overlay (player-only; must detach RVFC loop on cleanup).
  useEffect(() => {
    const video = videoRef.current;
    const layer =
      rootRef.current?.querySelector<HTMLElement>("[data-ak-video-layer]") ??
      null;
    const effective =
      anime4kEnabled &&
      !liteMode &&
      !casting &&
      !castConnecting &&
      isWebGpuSupported();
    let cancelled = false;

    anime4kDetachRef.current?.();
    anime4kDetachRef.current = null;
    setAnime4kActive(false);

    if (!effective || !video || !layer) return;

    void attachAnime4k({
      video,
      videoContainer: layer,
      mode: anime4kMode,
    })
      .then((attachment) => {
        if (cancelled) {
          attachment.detach();
          return;
        }
        anime4kDetachRef.current = attachment.detach;
        setAnime4kActive(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[anime4k] attach failed:", err);
        setAnime4kActive(false);
      });

    return () => {
      cancelled = true;
      anime4kDetachRef.current?.();
      anime4kDetachRef.current = null;
      setAnime4kActive(false);
    };
  }, [
    anime4kEnabled,
    anime4kMode,
    liteMode,
    casting,
    castConnecting,
    src,
    attachNonce,
  ]);

  useEffect(() => {
    if (fullscreen || cssFullscreen) {
      void tryLockLandscapeOrientation();
      return () => {
        void tryUnlockScreenOrientation();
      };
    }
    void tryUnlockScreenOrientation();
  }, [fullscreen, cssFullscreen]);

  /** Match embed players: slim the bar by player width, not viewport. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;
    const COMPACT_MAX_PX = 580;
    const update = (width: number) => {
      setCompactChrome(width > 0 && width < COMPACT_MAX_PX);
    };
    update(root.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      update(w);
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Older iOS Safari still looks for the webkit attribute.
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
    video.playsInline = true;

    const refreshPipSupport = () => {
      const docEnabled =
        typeof document !== "undefined" &&
        "pictureInPictureEnabled" in document &&
        Boolean(document.pictureInPictureEnabled);
      const canRequest = typeof video.requestPictureInPicture === "function";
      const wk = video as WebkitVideo;
      const webkitPip = typeof wk.webkitSetPresentationMode === "function";
      const blocked = Boolean(video.disablePictureInPicture);
      setPipBlocked(blocked);
      setPipSupported((docEnabled && canRequest) || webkitPip);
    };
    refreshPipSupport();

    onPlayerReadyRef.current?.(
      createHtmlVideoPlayerController(video, rootRef.current),
    );

    const applyStartTime = () => {
      if (startAppliedRef.current) return;
      const resume = qualityResumeRef.current;
      const t =
        resume != null && resume > 0 ? resume : startTimeRef.current;
      if (t > 0.5 && Number.isFinite(t)) {
        video.currentTime = t;
        startAppliedRef.current = true;
        qualityResumeRef.current = null;
      }
    };

    const onPlay = () => {
      setPlaying(true);
      setHasStarted(true);
      setBuffering(false);
      setSourceLoading(false);
      bumpControls({ hideAfterMs: IDLE_AFTER_PLAY_MS });
      void audioBoostRef.current?.resume();
      // After pause, some CDNs stop feeding until load resumes.
      try {
        hlsRef.current?.startLoad(-1);
      } catch {
        try {
          hlsRef.current?.startLoad();
        } catch {
          /* ignore */
        }
      }
      if (!startedRef.current) {
        startedRef.current = true;
        onStartRef.current?.();
      }
      reportW2g(true, video.currentTime);
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    };
    const onPause = () => {
      setPlaying(false);
      setControlsVisible(true);
      clearIdleTimer();
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      if (video.currentTime > 0 && dur > 0) {
        onProgressRef.current?.(video.currentTime, dur);
      }
      if (video.currentTime > 0) reportW2g(false, video.currentTime);
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    };
    const onTimeUpdate = () => {
      if (!seekingRef.current) setCurrentTime(video.currentTime);
      const dur = Number.isFinite(video.duration) ? video.duration : 0;
      onLiveTimeRef.current?.(video.currentTime, dur);
      const now = Date.now();
      if (dur > 0 && now - lastProgressTsRef.current >= 10_000) {
        lastProgressTsRef.current = now;
        onProgressRef.current?.(video.currentTime, dur);
      }

      const st = skipTimesRef.current;
      let nextSkip: SkipSegmentKind | null = null;
      if (
        st?.recap &&
        video.currentTime >= st.recap.start &&
        video.currentTime < st.recap.end
      ) {
        nextSkip = "recap";
        if (autoSkipRef.current && !recapAutoSkippedRef.current) {
          recapAutoSkippedRef.current = true;
          video.currentTime = st.recap.end;
          setCurrentTime(st.recap.end);
          nextSkip = null;
        }
      } else if (
        st?.intro &&
        video.currentTime >= st.intro.start &&
        video.currentTime < st.intro.end
      ) {
        nextSkip = "intro";
        if (autoSkipRef.current && !introAutoSkippedRef.current) {
          introAutoSkippedRef.current = true;
          video.currentTime = st.intro.end;
          setCurrentTime(st.intro.end);
          nextSkip = null;
        }
      } else if (
        st?.outro &&
        video.currentTime >= st.outro.start &&
        video.currentTime < st.outro.end
      ) {
        nextSkip = "outro";
        if (autoSkipRef.current && !outroAutoSkippedRef.current) {
          outroAutoSkippedRef.current = true;
          video.currentTime = st.outro.end;
          setCurrentTime(st.outro.end);
          nextSkip = null;
        }
        if (!outroFiredRef.current && dur > 0) {
          outroFiredRef.current = true;
          onOutroStartRef.current?.(dur);
        }
      }
      setActiveSkip(nextSkip);

      const cfg = w2gRef.current;
      if (
        cfg?.isHost &&
        !applyingW2gRef.current &&
        Math.abs(video.currentTime - lastW2gReportRef.current) > 2.5
      ) {
        reportW2g(!video.paused, video.currentTime);
      }
    };
    const onDuration = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
      applyStartTime();
    };
    const onBufProgress = () => {
      const len = video.buffered.length;
      if (len <= 0) {
        setBufferedRanges((prev) => (prev.length === 0 ? prev : []));
        return;
      }
      const ranges: BufferedRange[] = [];
      for (let i = 0; i < len; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBufferedRanges((prev) =>
        bufferedRangesEqual(prev, ranges) ? prev : ranges,
      );
    };
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      if (video.volume > 0 && !video.muted) {
        volumeBeforeMuteRef.current = video.volume;
      }
    };
    const clearStallWatch = () => {
      if (stallWatchRef.current) {
        clearTimeout(stallWatchRef.current);
        stallWatchRef.current = null;
      }
    };
    const kickHlsLoad = () => {
      const hls = hlsRef.current;
      if (!hls) return;
      try {
        // -1 = resume from current position (hls.js)
        hls.startLoad(-1);
      } catch {
        try {
          hls.startLoad();
        } catch {
          /* ignore */
        }
      }
    };
    const armStallWatch = () => {
      clearStallWatch();
      stallWatchRef.current = setTimeout(() => {
        stallWatchRef.current = null;
        const v = videoRef.current;
        if (!v || v.paused || v.readyState >= 3) return;
        trackEvent("buffer_stall", {
          ready_state: v.readyState,
          current_time: Math.round(v.currentTime),
        });
        kickHlsLoad();
        try {
          hlsRef.current?.recoverMediaError();
        } catch {
          /* ignore */
        }
        void v.play().catch(() => {});
      }, 2500);
    };
    const onWaiting = () => {
      setBuffering(true);
      armStallWatch();
    };
    const onPlaying = () => {
      clearStallWatch();
      setBuffering(false);
      setSourceLoading(false);
    };
    const onCanPlay = () => {
      clearStallWatch();
      setBuffering(false);
      setSourceLoading(false);
      if (autoFsRef.current) {
        autoFsRef.current = false;
        const target = getFullscreenTarget();
        if (!target) return;
        // iOS: CSS FS. Android: document FS (hides browser chrome).
        if (prefersCssFullscreen() || !elementSupportsFullscreenRequest(target)) {
          enterCssFullscreen();
          return;
        }
        void requestElementFullscreen(target)
          .then(async () => {
            await tryLockLandscapeOrientation();
          })
          .catch(() => {
            enterCssFullscreen();
          });
      }
    };
    const onSeeking = () => {
      // Intentional scrub already shows preview — avoid spinner flash.
      if (seekingRef.current) return;
      setBuffering(true);
      setMediaSeeking(true);
    };
    const onSeeked = () => {
      setMediaSeeking(false);
      if (!video.paused && video.readyState >= 3) setBuffering(false);
    };
    const onEnterPip = () => setInPip(true);
    const onLeavePip = () => setInPip(false);
    const syncFs = () => {
      const target = getFullscreenTarget();
      const video = videoRef.current as WebkitVideo | null;
      const fsEl = getFullscreenElement();
      // Browser promoted bare <video> (drops our chrome). Reclaim host FS on
      // Android so the address bar stays hidden; iOS falls back to CSS FS.
      if (video && (fsEl === video || Boolean(video.webkitDisplayingFullscreen))) {
        if (reclaimHostFsRef.current) return;
        reclaimHostFsRef.current = true;
        void (async () => {
          try {
            if (fsEl === video) await exitElementFullscreen();
            else if (video.webkitExitFullscreen) video.webkitExitFullscreen();
          } catch {
            /* ignore */
          }
          const host = getFullscreenTarget();
          if (
            host &&
            !prefersCssFullscreen() &&
            elementSupportsFullscreenRequest(host)
          ) {
            try {
              await requestElementFullscreen(host);
              await tryLockLandscapeOrientation();
              setFullscreen(true);
              setControlsVisible(true);
              return;
            } catch {
              /* fall through */
            }
          }
          enterCssFullscreen();
        })().finally(() => {
          window.setTimeout(() => {
            reclaimHostFsRef.current = false;
          }, 800);
        });
        return;
      }
      const hostFs = isElementFullscreen(target) || isElementFullscreen(rootRef.current);
      setFullscreen(
        hostFs || Boolean(video?.webkitDisplayingFullscreen) || cssFullscreenRef.current,
      );
    };
    const onVideoEnded = () => {
      beginEndedFlowRef.current();
    };
    const onNativeError = () => {
      // HLS path reports via hls.js; ignore empty-src teardown noise.
      if (!video.src && !video.currentSrc) return;
      if (hlsRef.current) return;
      if (isHlsStreamUrl(activeSrc) && Hls.isSupported()) return;

      if (!mediaRetryRef.current) {
        mediaRetryRef.current = true;
        setBuffering(true);
        setSourceLoading(true);
        const t = video.currentTime;
        if (t > 1) qualityResumeRef.current = t;
        video.load();
        void video.play().catch(() => {});
        return;
      }

      setPlaybackIssue(
        playbackIssueHint ??
          (typeof navigator !== "undefined" && navigator.onLine === false
            ? t("watch.offlineErrorBody")
            : "Can't play this stream. Retry, or pick another source."),
      );
      setSourceLoading(false);
      setBuffering(false);
      onFatalErrorRef.current?.({
        type: "media",
        details: video.error?.message ?? "media-error",
        status: video.error?.code,
      });
    };
    const onWebkitPresentation = () => {
      const wk = video as WebkitVideo;
      setInPip(wk.webkitPresentationMode === "picture-in-picture");
      if (wk.webkitDisplayingFullscreen != null) {
        setFullscreen(Boolean(wk.webkitDisplayingFullscreen));
      }
    };
    const onWebkitBeginFs = () => {
      // iOS native video FS hides our chrome — swap to CSS FS immediately.
      if (prefersCssFullscreen()) {
        try {
          video.webkitExitFullscreen?.();
        } catch {
          /* ignore */
        }
        enterCssFullscreen();
        return;
      }
      setFullscreen(true);
    };
    const onWebkitEndFs = () => {
      setFullscreen(false);
      // Native iOS video FS hides our chrome — restore it on exit.
      setControlsVisible(true);
      bumpControlsRef.current();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDuration);
    video.addEventListener("loadedmetadata", onDuration);
    video.addEventListener("progress", onBufProgress);
    video.addEventListener("volumechange", onVolume);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("enterpictureinpicture", onEnterPip);
    video.addEventListener("leavepictureinpicture", onLeavePip);
    video.addEventListener("ended", onVideoEnded);
    video.addEventListener("error", onNativeError);
    video.addEventListener(
      "webkitpresentationmodechanged",
      onWebkitPresentation as EventListener,
    );
    video.addEventListener(
      "webkitbeginfullscreen",
      onWebkitBeginFs as EventListener,
    );
    video.addEventListener(
      "webkitendfullscreen",
      onWebkitEndFs as EventListener,
    );
    const offFs = onFullscreenChange(syncFs);
    syncFs();

    const onPageHide = () => exitPictureInPictureSafe(video);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      exitPictureInPictureSafe(video);
      if (stallWatchRef.current) {
        clearTimeout(stallWatchRef.current);
        stallWatchRef.current = null;
      }
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDuration);
      video.removeEventListener("loadedmetadata", onDuration);
      video.removeEventListener("progress", onBufProgress);
      video.removeEventListener("volumechange", onVolume);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("enterpictureinpicture", onEnterPip);
      video.removeEventListener("leavepictureinpicture", onLeavePip);
      video.removeEventListener("ended", onVideoEnded);
      video.removeEventListener("error", onNativeError);
      video.removeEventListener(
        "webkitpresentationmodechanged",
        onWebkitPresentation as EventListener,
      );
      video.removeEventListener(
        "webkitbeginfullscreen",
        onWebkitBeginFs as EventListener,
      );
      video.removeEventListener(
        "webkitendfullscreen",
        onWebkitEndFs as EventListener,
      );
      offFs();
      window.removeEventListener("pagehide", onPageHide);
      clearIdleTimer();
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
      if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    };
  }, [bumpControls, clearIdleTimer, activeSrc, enterCssFullscreen, playbackIssueHint, reportW2g, getFullscreenTarget, t]);

  // Attach progressive / HLS source (prefer hls.js when MSE works).
  // AirPlay uses a reminted native URL — MSE object URLs black-screen on Apple TV.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    const airPlayUrl = airPlayNativeUrl;
    let hls: Hls | null = null;
    let cancelled = false;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    let progressiveFallbackTried = false;
    const abortSniff = new AbortController();
    const savedRate = playbackRateRef.current || video.playbackRate || 1;
    const savedVolume = video.volume;
    const savedMuted = video.muted;

    startAppliedRef.current = false;
    startedRef.current = false;
    setPlaybackIssue(null);
    // Keep timeline when swapping into/out of AirPlay native handoff.
    if (!airPlayUrl) {
      setCurrentTime(0);
      setDuration(0);
      setBufferedRanges([]);
      setHasStarted(false);
    }
    setBuffering(true);
    setSourceLoading(true);
    setHlsLevels([]);
    setHlsLevelIndex(-1);
    setHlsAudioOptions([]);
    setHlsAudioIndex(0);
    hlsRef.current = null;

    const fail = (type: string, details?: string, status?: number) => {
      if (cancelled) return;
      const offline =
        typeof navigator !== "undefined" && navigator.onLine === false;
      setPlaybackIssue(
        playbackIssueHint ??
          (offline
            ? t("watch.offlineErrorBody")
            : type === "network" || status === 0
              ? "Network error loading this stream. Retry, or try another source."
              : "Can't play this stream. Retry, or pick another source."),
      );
      setSourceLoading(false);
      setBuffering(false);
      onFatalErrorRef.current?.({ type, details, status });
    };

    const restorePlaybackPrefs = () => {
      video.playbackRate = savedRate;
      video.volume = savedVolume;
      video.muted = savedMuted;
      setPlaybackRateState(savedRate);
      // Re-apply boost after src attach — same <video>, so MediaElementSource is reused.
      audioBoostRef.current?.ensure(video, volumeBoostRef.current);
    };

    const applyResumeTime = () => {
      const resume = qualityResumeRef.current;
      const t =
        resume != null && resume > 0 ? resume : startTimeRef.current;
      if (t > 0.5) {
        video.currentTime = t;
        startAppliedRef.current = true;
        qualityResumeRef.current = null;
      }
    };

    const tryAutoplay = () => {
      // Chromecast owns A/V — never start local silent playback.
      if (castOwnsSurfaceRef.current) {
        if (!video.paused) video.pause();
        try {
          video.muted = true;
        } catch {
          /* ignore */
        }
        setBuffering(false);
        setSourceLoading(false);
        return;
      }
      void video.play().catch(() => {
        // Autoplay blocked — user must tap play (expected on mobile).
      });
    };

    const attachProgressive = () => {
      if (cancelled) return;
      hls?.destroy();
      hls = null;
      hlsRef.current = null;
      setHlsLevels([]);
      setHlsAudioOptions([]);
      video.src = activeSrc;
      restorePlaybackPrefs();
      const onLoaded = () => {
        if (cancelled) return;
        setBuffering(false);
        setSourceLoading(false);
        applyResumeTime();
        tryAutoplay();
      };
      video.addEventListener("loadeddata", onLoaded, { once: true });
    };

    const syncHlsMenus = (instance: Hls) => {
      if (cancelled) return;
      const levels: HlsLevelOption[] = instance.levels.map((level, index) => {
        const height = level.height || undefined;
        const label = height
          ? formatStreamQualityLabel(`${height}p`)
          : level.name || `Level ${index + 1}`;
        return { index, label, height };
      });
      setHlsLevels(levels);
      setHlsLevelIndex(instance.autoLevelEnabled ? -1 : instance.currentLevel);

      const audioOpts: HlsAudioOption[] = instance.audioTracks.map(
        (track, index) => ({
          index,
          label: formatHlsAudioTrackLabel(track, index),
        }),
      );
      setHlsAudioOptions(audioOpts);
      setHlsAudioIndex(instance.audioTrack);
    };

    const attachHlsJs = () => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        fail("hls-unsupported", "Browser cannot play HLS");
        return;
      }
      hls = new Hls(createHlsConfig({ lite: liteMode }));
      // Softsubs are rendered by PlayerSubtitleOverlay — never let hls.js force
      // TextTrack.mode = "showing" (that is what made captions stick on).
      hls.subtitleDisplay = false;
      hls.subtitleTrack = -1;
      hlsRef.current = hls;
      hls.loadSource(activeSrc);
      hls.attachMedia(video);
      restorePlaybackPrefs();
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled || !hls) return;
        setBuffering(false);
        setSourceLoading(false);
        syncHlsMenus(hls);
        if (!audioUserPickedRef.current) {
          pickHlsAudioTrack(hls, preferDubAudioRef.current);
          setHlsAudioIndex(hls.audioTrack);
        }
        applyResumeTime();
        tryAutoplay();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (cancelled || !hls) return;
        setHlsLevelIndex(hls.autoLevelEnabled ? -1 : data.level);
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (cancelled || !hls) return;
        syncHlsMenus(hls);
        if (!audioUserPickedRef.current) {
          pickHlsAudioTrack(hls, preferDubAudioRef.current);
          setHlsAudioIndex(hls.audioTrack);
        }
      });
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        if (cancelled) return;
        setHlsAudioIndex(data.id);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (cancelled) return;
        // Non-fatal stalls are common on proxied anime CDNs after pause/seek.
        if (!data.fatal) {
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_SEEK_OVER_HOLE ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
          ) {
            try {
              // Drop to a safer ladder step, then resume loading from live edge of buffer.
              if (hls && hls.levels.length > 1 && hls.currentLevel > 0) {
                const safer = Math.max(0, hls.currentLevel - 1);
                if (hls.autoLevelEnabled) {
                  hls.nextLevel = safer;
                } else {
                  hls.currentLevel = safer;
                }
              }
              hls?.startLoad(-1);
            } catch {
              try {
                hls?.startLoad();
              } catch {
                /* ignore */
              }
            }
          } else if (
            data.details === Hls.ErrorDetails.FRAG_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.LEVEL_LOAD_TIMEOUT
          ) {
            try {
              hls?.startLoad(-1);
            } catch {
              /* ignore */
            }
          }
          return;
        }
        const status = (data.response as { code?: number } | undefined)?.code;
        if (status === 401 || status === 403) {
          fail("hls-auth", data.details, status);
          hls?.destroy();
          hls = null;
          hlsRef.current = null;
          return;
        }

        // Mis-detected progressive (often Echo MP4 behind `/api/kitty/hls?t=`): soft-fall back once.
        // Still try when `f=m3u8` was minted incorrectly — Ok/clock links are frequently mis-tagged.
        const looksManifestFail =
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR;
        if (looksManifestFail && !progressiveFallbackTried) {
          progressiveFallbackTried = true;
          hls?.destroy();
          hls = null;
          hlsRef.current = null;
          attachProgressive();
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 5) {
          networkRecoveries += 1;
          try {
            if (hls && hls.levels.length > 1 && hls.currentLevel > 0) {
              hls.nextLevel = Math.max(0, hls.currentLevel - 1);
            }
            hls?.startLoad(-1);
          } catch {
            hls?.startLoad();
          }
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 5) {
          mediaRecoveries += 1;
          hls?.recoverMediaError();
          return;
        }

        // One full reload retry before soft-fail banner.
        if (!mediaRetryRef.current) {
          mediaRetryRef.current = true;
          networkRecoveries = 0;
          mediaRecoveries = 0;
          const t = video.currentTime;
          if (t > 1) qualityResumeRef.current = t;
          hls?.destroy();
          hls = null;
          hlsRef.current = null;
          attachHlsJs();
          return;
        }

        fail("hls", data.details, status);
        hls?.destroy();
        hls = null;
        hlsRef.current = null;
      });
    };

    const attachNativeHls = (url: string = activeSrc) => {
      if (cancelled) return;
      video.src = url;
      restorePlaybackPrefs();
      const onLoaded = () => {
        if (cancelled) return;
        setBuffering(false);
        setSourceLoading(false);
        applyResumeTime();
        tryAutoplay();
      };
      video.addEventListener("loadeddata", onLoaded, { once: true });
    };

    const run = async () => {
      // AirPlay handoff: force native HTTP(S) media — never MSE.
      if (airPlayUrl) {
        const already =
          video.currentSrc === airPlayUrl ||
          video.src === airPlayUrl ||
          video.getAttribute("src") === airPlayUrl;
        if (already && video.readyState >= 2) {
          setBuffering(false);
          setSourceLoading(false);
          applyResumeTime();
          return;
        }
        attachNativeHls(airPlayUrl);
        return;
      }

      // Opaque kitty tokens without `f=` hide mp4 vs m3u8 — always sniff those.
      const hasFormatHint = /[?&]f=(mp4|m4v|m3u8|hls)\b/i.test(activeSrc);
      const opaqueKitty =
        activeSrc.includes("/api/kitty/hls") &&
        /[?&]t=/.test(activeSrc) &&
        !hasFormatHint;
      const clearlyTyped =
        !opaqueKitty && (isHlsStreamUrl(activeSrc) || isMp4StreamUrl(activeSrc));

      let sniffed: boolean | null = null;
      if (!clearlyTyped || opaqueKitty) {
        sniffed = await sniffIsHlsPlaylist(activeSrc, abortSniff.signal);
        if (cancelled) return;
      }

      const mode = resolveStreamAttachMode({
        url: activeSrc,
        video,
        hlsJsSupported: Hls.isSupported(),
        qualities: qualitiesRef.current,
        sniffedHls: sniffed,
      });

      if (cancelled) return;

      if (mode === "hls-js") {
        attachHlsJs();
        return;
      }
      if (mode === "native-hls") {
        attachNativeHls();
        return;
      }
      if (mode === "progressive") {
        attachProgressive();
        return;
      }
      fail("unsupported", "No compatible playback engine for this stream");
    };

    void run();

    return () => {
      cancelled = true;
      abortSniff.abort();
      exitPictureInPictureSafe(video);
      hls?.destroy();
      hls = null;
      hlsRef.current = null;
      // Don't wipe AirPlay native src on transient cleanups while handoff is active.
      if (!airPlayNativeUrlRef.current) {
        video.removeAttribute("src");
        video.load();
      }
    };
    // qualities intentionally omitted — unstable [] / ladder updates must not tear down HLS mid-play.
  }, [activeSrc, playbackIssueHint, attachNonce, airPlayNativeUrl, t]);

  const togglePlay = useCallback(() => {
    if (castingRef.current) {
      castPlayOrPause();
      bumpControls({ hideAfterMs: IDLE_AFTER_PLAY_MS });
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      // Resume AudioContext first — a suspended Web Audio graph can freeze frames.
      void (async () => {
        try {
          await audioBoostRef.current?.resume();
        } catch {
          /* ignore */
        }
        const hls = hlsRef.current;
        if (hls) {
          try {
            hls.startLoad(-1);
          } catch {
            try {
              hls.startLoad();
            } catch {
              /* ignore */
            }
          }
        }
        try {
          await video.play();
        } catch {
          /* autoplay / gesture policies */
        }
      })();
      // Show chrome now; onPlay schedules the short post-resume hide.
      setControlsVisible(true);
      return;
    }
    video.pause();
    bumpControls();
  }, [bumpControls, castPlayOrPause]);

  const seekBy = useCallback(
    (delta: number, opts?: { hint?: boolean }) => {
      const applyLocal = () => {
        if (castingRef.current) {
          const base = currentTime;
          const max = effectiveDuration || base + Math.abs(delta);
          const next = clamp(base + delta, 0, max);
          castSeekTo(next);
          setCurrentTime(next);
          return;
        }
        const video = videoRef.current;
        if (!video) return;
        const next = clamp(
          video.currentTime + delta,
          0,
          Number.isFinite(video.duration)
            ? video.duration
            : video.currentTime + delta,
        );
        video.currentTime = next;
        setCurrentTime(next);
      };
      applyLocal();
      if (opts?.hint !== false) {
        const side: "left" | "right" = delta >= 0 ? "right" : "left";
        const stepAbs = Math.abs(Math.round(delta));
        const now = Date.now();
        const prev = seekAccumRef.current;
        const total =
          prev && prev.side === side && now < prev.resetAt
            ? prev.total + stepAbs
            : stepAbs;
        seekAccumRef.current = {
          side,
          total,
          resetAt: now + SEEK_FLASH_MS + 120,
        };
        showSeekFlash(side, total);
      }
      bumpControls();
    },
    [
      bumpControls,
      castSeekTo,
      currentTime,
      effectiveDuration,
      showSeekFlash,
    ],
  );

  const seekToImmediate = useCallback(
    (time: number) => {
      if (castingRef.current) {
        const next = clamp(time, 0, effectiveDuration || 0);
        castSeekTo(next);
        setCurrentTime(next);
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(time, 0, duration || video.duration || 0);
      video.currentTime = next;
      setCurrentTime(next);
    },
    [castSeekTo, duration, effectiveDuration],
  );

  const seekTo = useCallback(
    (time: number, opts?: { smooth?: boolean }) => {
      if (!opts?.smooth) {
        if (scrubRafRef.current != null) {
          cancelAnimationFrame(scrubRafRef.current);
          scrubRafRef.current = null;
        }
        scrubTargetRef.current = null;
        seekToImmediate(time);
        bumpControls();
        return;
      }
      scrubTargetRef.current = time;
      if (scrubRafRef.current != null) return;
      scrubRafRef.current = requestAnimationFrame(() => {
        scrubRafRef.current = null;
        const target = scrubTargetRef.current;
        scrubTargetRef.current = null;
        if (target != null) seekToImmediate(target);
      });
      bumpControls();
    },
    [bumpControls, seekToImmediate],
  );

  const toggleMute = useCallback(
    (opts?: { hint?: boolean }) => {
      if (castingRef.current) {
        const next = effectiveMuted ? volumeBeforeMuteRef.current || 0.8 : 0;
        if (!effectiveMuted) volumeBeforeMuteRef.current = castRemoteVolume || 1;
        castSetVolume(next);
        schedulePrefsSave({ muted: next === 0, volume: next === 0 ? volumeBeforeMuteRef.current : next });
        if (opts?.hint) {
          showGestureHint({
            label: next === 0 ? "Muted" : "Unmuted",
            meter: next === 0 ? 0 : next,
          });
        }
        bumpControls();
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      if (video.muted || video.volume === 0) {
        video.muted = false;
        video.volume = volumeBeforeMuteRef.current || 1;
        schedulePrefsSave({ muted: false, volume: video.volume });
        if (opts?.hint) {
          showGestureHint({
            label: "Unmuted",
            meter: video.volume,
          });
        }
      } else {
        volumeBeforeMuteRef.current = video.volume || 1;
        video.muted = true;
        schedulePrefsSave({ muted: true, volume: volumeBeforeMuteRef.current });
        if (opts?.hint) {
          showGestureHint({ label: "Muted", meter: 0 });
        }
      }
      bumpControls();
    },
    [
      bumpControls,
      castRemoteVolume,
      castSetVolume,
      effectiveMuted,
      schedulePrefsSave,
      showGestureHint,
    ],
  );

  const setVolumeLevel = useCallback(
    (level: number, opts?: { hint?: boolean }) => {
      const next = clamp(level, 0, 1);
      if (castingRef.current) {
        castSetVolume(next);
        if (next > 0) volumeBeforeMuteRef.current = next;
        schedulePrefsSave({ volume: next, muted: next === 0 });
        if (opts?.hint) {
          showGestureHint({
            label: "Volume",
            detail: `${Math.round(next * 100)}%`,
            meter: next,
          });
        }
        bumpControls();
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.volume = next;
      video.muted = next === 0;
      if (next > 0) volumeBeforeMuteRef.current = next;
      schedulePrefsSave({ volume: next, muted: next === 0 });
      if (opts?.hint) {
        showGestureHint({
          label: "Volume",
          detail: `${Math.round(next * 100)}%`,
          meter: next,
        });
      }
      bumpControls();
    },
    [bumpControls, castSetVolume, schedulePrefsSave, showGestureHint],
  );

  const setVolumeBoostLevel = useCallback(
    (level: number, opts?: { hint?: boolean }) => {
      // Cast volume is remote-only — boost stays local and is ignored while casting.
      if (castingRef.current) return;
      const next = sanitizeVolumeBoost(level);
      setVolumeBoostState(next);
      volumeBoostRef.current = next;
      const video = videoRef.current;
      if (video) {
        audioBoostRef.current?.ensure(video, next);
      } else {
        audioBoostRef.current?.setBoost(next);
      }
      schedulePrefsSave({ volumeBoost: next });
      if (opts?.hint) {
        showGestureHint({
          label: "Sound boost",
          detail: formatVolumeBoost(next),
          meter: (next - VOLUME_BOOST_MIN) / (VOLUME_BOOST_MAX - VOLUME_BOOST_MIN),
        });
      }
      bumpControls();
    },
    [bumpControls, schedulePrefsSave, showGestureHint],
  );

  const setBrightnessLevel = useCallback(
    (level: number, opts?: { hint?: boolean }) => {
      const next = clamp(level, 0.4, 1.6);
      brightnessRef.current = next;
      setBrightness(next);
      schedulePrefsSave({ brightness: next });
      if (opts?.hint) {
        showGestureHint({
          label: "Brightness",
          detail: `${Math.round(next * 100)}%`,
          meter: clamp((next - 0.4) / 1.2, 0, 1),
        });
      }
      bumpControls();
    },
    [bumpControls, schedulePrefsSave, showGestureHint],
  );

  const exitFullscreen = useCallback(async () => {
    const video = videoRef.current as WebkitVideo | null;
    try {
      markPersistCssFullscreen(false);
      if (cssFullscreenRef.current) {
        setCssFullscreen(false);
        setFullscreen(false);
      }
      if (getFullscreenElement()) {
        await exitElementFullscreen();
      } else if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
        video.webkitExitFullscreen();
      }
    } catch {
      /* ignore */
    }
    bumpControls();
  }, [bumpControls]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current as WebkitVideo | null;
    if (!video || !pipSupported || pipBlocked) return;
    try {
      if (document.pictureInPictureElement === video) {
        await document.exitPictureInPicture();
        showGestureHint({ label: "PiP off" });
        bumpControls();
        return;
      }
      if (video.webkitPresentationMode === "picture-in-picture") {
        video.webkitSetPresentationMode?.("inline");
        showGestureHint({ label: "PiP off" });
        bumpControls();
        return;
      }

      // Some mobile browsers only allow PiP while the media is playing.
      if (video.paused) {
        try {
          await video.play();
        } catch {
          /* user gesture may still allow PiP without play */
        }
      }

      const wk = video as WebkitVideo;
      const preferWebkit =
        isAppleTouchDevice() && typeof wk.webkitSetPresentationMode === "function";

      if (preferWebkit) {
        wk.webkitSetPresentationMode?.("picture-in-picture");
      } else if (typeof video.requestPictureInPicture === "function") {
        await video.requestPictureInPicture();
      } else if (typeof wk.webkitSetPresentationMode === "function") {
        wk.webkitSetPresentationMode("picture-in-picture");
      }
      showGestureHint({ label: "PiP on" });
    } catch {
      // Soft-fail: keep the control available for a later gesture.
      try {
        const wk = video as WebkitVideo;
        if (typeof wk.webkitSetPresentationMode === "function") {
          wk.webkitSetPresentationMode("picture-in-picture");
          showGestureHint({ label: "PiP on" });
          bumpControls();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    bumpControls();
  }, [bumpControls, pipSupported, pipBlocked, showGestureHint]);

  const applyPlaybackRate = useCallback(
    (rate: number, opts?: { hint?: boolean; persist?: boolean }) => {
      const video = videoRef.current;
      if (video) video.playbackRate = rate;
      playbackRateRef.current = rate;
      setPlaybackRateState(rate);
      if (opts?.persist !== false) {
        saveKittyPlayerPrefs({ playbackRate: rate });
      }
      if (opts?.hint) {
        showGestureHint({
          label: rate === 1 ? "Normal" : `${rate}×`,
          detail: "Speed",
        });
      }
      bumpControls();
    },
    [bumpControls, showGestureHint],
  );

  const nudgePlaybackRate = useCallback(
    (direction: 1 | -1) => {
      const speeds = KITTY_PLAYER_SPEEDS;
      const current = playbackRateRef.current;
      let idx = speeds.findIndex((r) => Math.abs(r - current) < 0.001);
      if (idx < 0) idx = speeds.indexOf(1);
      const nextIdx = clamp(idx + direction, 0, speeds.length - 1);
      const next = speeds[nextIdx] ?? 1;
      applyPlaybackRate(next, { hint: true });
    },
    [applyPlaybackRate],
  );

  const seekToPercent = useCallback(
    (percent: number) => {
      const dur = effectiveDuration || duration;
      if (!(dur > 0)) return;
      seekTo((percent / 100) * dur);
      showGestureHint({
        label: `${percent}%`,
        detail: formatPlayerTime((percent / 100) * dur),
      });
    },
    [duration, effectiveDuration, seekTo, showGestureHint],
  );

  const applyCaptionSize = useCallback(
    (size: CaptionSizePref) => {
      setCaptionSize(size);
      saveKittyPlayerPrefs({ captionSize: size });
      bumpControls();
    },
    [bumpControls],
  );

  const applyCaptionPosition = useCallback(
    (position: CaptionPositionPref) => {
      setCaptionPosition(position);
      saveKittyPlayerPrefs({ captionPosition: position });
      bumpControls();
    },
    [bumpControls],
  );

  const applyCaptionOffset = useCallback(
    (offset: number) => {
      const next = clamp(Math.round(offset * 2) / 2, -5, 5);
      setCaptionOffset(next);
      saveKittyPlayerPrefs({ captionOffset: next });
      showGestureHint({
        label: "Caption timing",
        detail:
          next === 0
            ? "On time"
            : next > 0
              ? `+${next}s`
              : `${next}s`,
      });
      bumpControls();
    },
    [bumpControls, showGestureHint],
  );

  const startHoldSpeed = useCallback(() => {
    if (holdSpeedActiveRef.current) return;
    const video = videoRef.current;
    if (!video || video.paused) return;
    holdSpeedActiveRef.current = true;
    rateBeforeHoldRef.current = playbackRateRef.current || 1;
    video.playbackRate = HOLD_SPEED_RATE;
    setHoldSpeedActive(true);
    // Keep a sticky chip while held — don't use the timed gesture hint.
    if (gestureHintTimerRef.current) {
      clearTimeout(gestureHintTimerRef.current);
      gestureHintTimerRef.current = null;
    }
    setGestureHint(null);
    setLiveRegionAnnouncement(`${HOLD_SPEED_RATE}× hold`);
  }, []);

  const endHoldSpeed = useCallback(() => {
    if (!holdSpeedActiveRef.current) return;
    holdSpeedActiveRef.current = false;
    setHoldSpeedActive(false);
    const restore = rateBeforeHoldRef.current || 1;
    const video = videoRef.current;
    if (video) video.playbackRate = restore;
    playbackRateRef.current = restore;
    setPlaybackRateState(restore);
    setLiveRegionAnnouncement(
      restore === 1 ? "Normal speed" : `${restore}× speed`,
    );
  }, []);

  const selectServerQuality = useCallback(
    (entry: KittyStreamQuality) => {
      const video = videoRef.current;
      if (video && video.currentTime > 0.5) {
        qualityResumeRef.current = video.currentTime;
      }
      mediaRetryRef.current = false;
      if (onSelectQuality) {
        onSelectQuality(entry);
      } else {
        setSrcOverride(entry.file);
      }
      setQualityOpen(false);
      bumpControls();
    },
    [bumpControls, onSelectQuality],
  );

  const selectHlsLevel = useCallback(
    (index: number) => {
      const hls = hlsRef.current;
      const video = videoRef.current;
      if (!hls) return;
      // Keep playhead across ABR ladder switches.
      const t = video?.currentTime ?? 0;
      hls.currentLevel = index;
      if (video && t > 0.5 && Math.abs(video.currentTime - t) > 0.75) {
        video.currentTime = t;
      }
      setHlsLevelIndex(index);
      setQualityOpen(false);
      bumpControls();
    },
    [bumpControls],
  );

  const selectHlsAudio = useCallback(
    (index: number) => {
      const hls = hlsRef.current;
      if (!hls) return;
      audioUserPickedRef.current = true;
      hls.audioTrack = index;
      setHlsAudioIndex(index);
      const label =
        hlsAudioOptions.find((t) => t.index === index)?.label ?? "Audio";
      showGestureHint({ label: "Audio", detail: label });
      setMoreOpen(false);
      setAudioOpen(false);
      bumpControls();
    },
    [bumpControls, hlsAudioOptions, showGestureHint],
  );

  const onAudioClick = useCallback(() => {
    if (hlsAudioOptions.length < 2) return;
    setAudioOpen((v) => !v);
    setMoreOpen(false);
    setVolumeOpen(false);
    setCaptionsOpen(false);
    setQualityOpen(false);
    setSpeedOpen(false);
    bumpControls();
  }, [bumpControls, hlsAudioOptions.length]);

  const selectCaption = useCallback(
    (id: string | null) => {
      captionUserPickedRef.current = true;
      if (id) lastCaptionIdRef.current = id;
      setSelectedCaptionId(id);
      const label =
        id == null
          ? null
          : captionOptions.find((c) => c.id === id)?.label ?? null;
      saveKittyPlayerPrefs({
        captionsOn: id != null,
        captionLabel: label ?? loadKittyPlayerPrefs().captionLabel,
      });
      setMoreOpen(false);
      setCaptionsOpen(false);
      bumpControls();
      // Mirror caption choice onto Chromecast via editTracksInfo only — never
      // reload media just to toggle subs (that greys out Default Media Receiver).
      if (castingRef.current) {
        const castIdx = id
          ? castCaptionOptions.findIndex((c) => c.id === id)
          : -1;
        void (async () => {
          if (id == null) {
            await castSetActiveTextTrackIds([]);
            return;
          }
          if (castIdx < 0) {
            showGestureHint({
              label: "Captions unavailable on Cast",
            });
            await castSetActiveTextTrackIds([]);
            return;
          }
          // Prefer IDs from the last successful with-tracks load; fall back to
          // 1-based order (hook refuses when loadMedia was video-only).
          const trackId =
            castAttachedTextTrackIds[castIdx] ?? castIdx + 1;
          const ok = await castSetActiveTextTrackIds([trackId]);
          if (!ok) {
            showGestureHint({
              label: "Captions unavailable on Cast",
            });
          }
        })();
      }
    },
    [
      bumpControls,
      captionOptions,
      castAttachedTextTrackIds,
      castCaptionOptions,
      castSetActiveTextTrackIds,
      showGestureHint,
    ],
  );

  const toggleCaptions = useCallback(() => {
    if (captionOptions.length === 0) return;
    if (selectedCaptionId) {
      selectCaption(null);
      showGestureHint({ label: "Captions off" });
      return;
    }
    const preferred =
      (lastCaptionIdRef.current &&
        captionOptions.find((c) => c.id === lastCaptionIdRef.current)?.id) ||
      captionOptions.find((c) => c.isDefault)?.id ||
      captionOptions[0]?.id ||
      null;
    selectCaption(preferred);
    const label =
      captionOptions.find((c) => c.id === preferred)?.label ?? "On";
    showGestureHint({ label: "Captions", detail: label });
  }, [captionOptions, selectCaption, selectedCaptionId, showGestureHint]);

  const openCaptionsPicker = useCallback(() => {
    if (captionOptions.length === 0) return;
    setCaptionsOpen(true);
    setMoreOpen(false);
    setVolumeOpen(false);
    setQualityOpen(false);
    setSpeedOpen(false);
    setAudioOpen(false);
    bumpControls();
  }, [bumpControls, captionOptions.length]);

  const onCaptionsClick = useCallback(() => {
    if (captionsOpen) {
      setCaptionsOpen(false);
      bumpControls();
      return;
    }
    // Multiple tracks → open picker (Off + tracks + style). Single track → toggle.
    if (captionOptions.length > 1) {
      openCaptionsPicker();
      return;
    }
    toggleCaptions();
  }, [
    bumpControls,
    captionOptions.length,
    captionsOpen,
    openCaptionsPicker,
    toggleCaptions,
  ]);

  const clearVolumeLongPress = useCallback(() => {
    if (volumeLongPressRef.current) {
      clearTimeout(volumeLongPressRef.current);
      volumeLongPressRef.current = null;
    }
  }, []);

  const onVolumePointerDown = useCallback(() => {
    if (!prefersCoarsePointer()) return;
    volumeLongPressFiredRef.current = false;
    clearVolumeLongPress();
    volumeLongPressRef.current = setTimeout(() => {
      volumeLongPressFiredRef.current = true;
      volumeLongPressRef.current = null;
      setVolumeOpen(true);
      setMoreOpen(false);
      setCaptionsOpen(false);
      setQualityOpen(false);
      setSpeedOpen(false);
      setAudioOpen(false);
      bumpControls();
      pulsePlayerHaptic(8);
    }, LONG_PRESS_MS);
  }, [bumpControls, clearVolumeLongPress]);

  const onVolumePointerUp = useCallback(() => {
    clearVolumeLongPress();
  }, [clearVolumeLongPress]);

  const clearPlayLongPress = useCallback(() => {
    if (playLongPressRef.current) {
      clearTimeout(playLongPressRef.current);
      playLongPressRef.current = null;
    }
  }, []);

  const onPlayPointerDown = useCallback(() => {
    playLongPressFiredRef.current = false;
    clearPlayLongPress();
    playLongPressRef.current = setTimeout(() => {
      playLongPressFiredRef.current = true;
      playLongPressRef.current = null;
      const next = nextKittyPlayerSpeed(playbackRateRef.current);
      applyPlaybackRate(next, { hint: true });
    }, LONG_PRESS_MS);
  }, [applyPlaybackRate, clearPlayLongPress]);

  const onPlayPointerUp = useCallback(() => {
    clearPlayLongPress();
  }, [clearPlayLongPress]);

  const onPlayClick = useCallback(() => {
    if (playLongPressFiredRef.current) {
      playLongPressFiredRef.current = false;
      return;
    }
    togglePlay();
  }, [togglePlay]);

  // Focus trap for opaque menus (Tab cycles; Escape closes via keyboard handler).
  useEffect(() => {
    if (!moreOpen && !captionsOpen && !qualityOpen && !speedOpen && !audioOpen) {
      return;
    }
    const menu = moreOpen
      ? moreMenuRef.current
      : qualityOpen
        ? qualityMenuRef.current
        : speedOpen
          ? speedMenuRef.current
          : audioOpen
            ? audioMenuRef.current
            : captionsMenuRef.current;
    if (!menu) return;
    const focusables = Array.from(
      menu.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    );
    const previouslyFocused = document.activeElement as HTMLElement | null;
    focusables[0]?.focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    menu.addEventListener("keydown", onKeyDown);
    return () => {
      menu.removeEventListener("keydown", onKeyDown);
      const restore = moreOpen
        ? moreTriggerRef.current
        : qualityOpen
          ? qualityTriggerRef.current
          : speedOpen
            ? speedTriggerRef.current
            : audioOpen
              ? audioTriggerRef.current
              : captionsTriggerRef.current;
      (restore ?? previouslyFocused)?.focus?.({ preventScroll: true });
    };
  }, [moreOpen, captionsOpen, qualityOpen, speedOpen, audioOpen]);

  const handleVideoClick = useCallback(() => {
    // Coarse pointers use touch double-tap handler instead.
    if (prefersCoarsePointer()) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickTimerRef.current = null;
      togglePlay();
    }, CLICK_DELAY_MS);
  }, [togglePlay]);

  const handleVideoDoubleClick = useCallback(
    (e: ReactMouseEvent<HTMLVideoElement>) => {
      e.preventDefault();
      if (prefersCoarsePointer()) return;
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      const step = seekStepRef.current || SEEK_STEP;
      if (x < third) {
        seekBy(-step);
      } else if (x > third * 2) {
        seekBy(step);
      } else {
        void toggleFullscreen();
      }
    },
    [seekBy, toggleFullscreen],
  );

  const surfaceGestures = useSurfaceGestures({
    // seekBy already drives the zone flash + accumulated seconds.
    onSeekFlash: () => {},
    onSeekBy: (delta) => seekBy(delta),
    onToggleFullscreen: () => {
      void toggleFullscreen();
    },
    onSingleTap: () => {
      // Playing + chrome up: hide chrome (don't accidental-pause).
      // Playing + chrome down: reveal. Paused: play.
      if (castingRef.current) {
        if (!controlsVisibleRef.current && castRemotePlayingRef.current) {
          bumpControls();
          return;
        }
        if (castRemotePlayingRef.current && controlsVisibleRef.current) {
          if (Date.now() < revealGuardUntilRef.current) return;
          hideControls();
          return;
        }
        togglePlay();
        return;
      }
      const video = videoRef.current;
      const isPlaying = video ? !video.paused : playing;
      if (isPlaying && !controlsVisibleRef.current) {
        bumpControls();
        return;
      }
      if (isPlaying && controlsVisibleRef.current) {
        // Same gesture that revealed chrome via touchstart — keep it up.
        if (Date.now() < revealGuardUntilRef.current) return;
        hideControls();
        return;
      }
      togglePlay();
    },
    onVolumeDelta: (delta) => {
      // iOS ignores HTMLMediaElement.volume — don't fake a working slider gesture.
      if (iosVolumeLocked && !castingRef.current) {
        showGestureHint({
          label: "System volume",
          detail: "Use side buttons",
        });
        return;
      }
      const video = videoRef.current;
      const base = video ? (video.muted ? 0 : video.volume) : volume;
      setVolumeLevel(base + delta, { hint: true });
    },
    onBrightnessDelta: (delta) => {
      setBrightnessLevel(brightnessRef.current + delta, { hint: true });
    },
    onHoldSpeedStart: startHoldSpeed,
    onHoldSpeedEnd: endHoldSpeed,
    onHaptic: (kind) => {
      pulsePlayerHaptic(kind === "hold" ? 12 : kind === "seek" ? 10 : 6);
    },
    seekingActive: () => seekingRef.current,
    seekStep: seekStepSeconds || SEEK_STEP,
    swipeSeekEnabled: playerTouchSeekEnabled,
    doubleTapMs: TOUCH_DOUBLE_TAP_MS,
    doubleTapPx: TOUCH_DOUBLE_TAP_PX,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      const focusedInPlayer = root.contains(active) || active === root;
      const hovered = root.matches(":hover");
      const isFs = isElementFullscreen(root);
      if (!focusedInPlayer && !hovered && !isFs && active !== document.body) {
        return;
      }

      const step = seekStepRef.current || SEEK_STEP;

      if (helpOpen && e.key !== "Escape" && e.key !== "?") {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        seekToPercent(Number(e.key) * 10);
        return;
      }

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
        case "j":
        case "J":
          e.preventDefault();
          seekBy(e.shiftKey ? -SEEK_STEP_FINE : -step);
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          seekBy(e.shiftKey ? SEEK_STEP_FINE : step);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeOpen(true);
          setVolumeLevel((videoRef.current?.muted ? 0 : volume) + 0.05, {
            hint: true,
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeOpen(true);
          setVolumeLevel((videoRef.current?.muted ? 0 : volume) - 0.05, {
            hint: true,
          });
          break;
        case "[":
          e.preventDefault();
          nudgePlaybackRate(-1);
          break;
        case "]":
          e.preventDefault();
          nudgePlaybackRate(1);
          break;
        case "f":
        case "F":
          e.preventDefault();
          void toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute({ hint: true });
          break;
        case "c":
        case "C":
          if (captionOptions.length > 0) {
            e.preventDefault();
            toggleCaptions();
          }
          break;
        case "i":
        case "I":
          if (pipSupported && !pipBlocked) {
            e.preventDefault();
            void togglePip();
          }
          break;
        case "s":
        case "S": {
          if (!activeSkip) break;
          const interval =
            activeSkip === "intro"
              ? skipTimesRef.current?.intro
              : activeSkip === "recap"
                ? skipTimesRef.current?.recap
                : skipTimesRef.current?.outro;
          if (!interval || !(interval.end > interval.start)) break;
          e.preventDefault();
          seekTo(interval.end);
          setActiveSkip(null);
          showGestureHint({
            label: `${skipKindLabel(activeSkip)} skipped`,
          });
          break;
        }
        case "n":
        case "N":
          if (nextEpisode && onNextEpisode) {
            e.preventDefault();
            goToNextEpisode();
          }
          break;
        case "p":
        case "P":
          if (prevEpisode && onPrevEpisode) {
            e.preventDefault();
            goToPrevEpisode();
          }
          break;
        case "?":
          e.preventDefault();
          setHelpOpen((v) => {
            const next = !v;
            if (next) popoverOpenRef.current = true;
            return next;
          });
          setVolumeOpen(false);
          setMoreOpen(false);
          setCaptionsOpen(false);
          setQualityOpen(false);
          setSpeedOpen(false);
          setAudioOpen(false);
          bumpControls();
          break;
        case "Escape":
          if (
            helpOpen ||
            volumeOpen ||
            moreOpen ||
            captionsOpen ||
            qualityOpen ||
            speedOpen ||
            audioOpen
          ) {
            e.preventDefault();
            closePopovers();
            bumpControls();
          } else if (
            isElementFullscreen(root) ||
            isElementFullscreen(getFullscreenTarget()) ||
            cssFullscreenRef.current
          ) {
            e.preventDefault();
            void exitFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    seekBy,
    toggleFullscreen,
    toggleMute,
    togglePlay,
    setVolumeLevel,
    volume,
    volumeOpen,
    moreOpen,
    captionsOpen,
    qualityOpen,
    speedOpen,
    audioOpen,
    helpOpen,
    closePopovers,
    bumpControls,
    exitFullscreen,
    captionOptions,
    toggleCaptions,
    nudgePlaybackRate,
    seekToPercent,
    pipSupported,
    pipBlocked,
    togglePip,
    activeSkip,
    seekTo,
    showGestureHint,
    nextEpisode,
    prevEpisode,
    onNextEpisode,
    onPrevEpisode,
    goToNextEpisode,
    goToPrevEpisode,
    getFullscreenTarget,
  ]);

  const showMiniProgress =
    !chromeVisible &&
    effectivePlaying &&
    !playbackIssue &&
    effectiveDuration > 0;
  const bufferedAheadRatio = (() => {
    if (casting || effectiveDuration <= 0 || bufferedRanges.length === 0) {
      return null;
    }
    const t = displayTime;
    const ahead = bufferedRanges.find((r) => t >= r.start && t <= r.end);
    if (!ahead) return null;
    return clamp(ahead.end / effectiveDuration, 0, 1);
  })();
  const nearEndSecs =
    effectiveDuration > 0
      ? Math.max(0, Math.ceil(effectiveDuration - currentTime))
      : 0;
  const cueStyle = {
    ["--ak-cue-size" as string]: captionSizeCss(captionSize),
    ["--ak-cue-bottom" as string]: captionPositionCss(captionPosition),
  };

  const progressRatio =
    effectiveDuration > 0 ? clamp(displayTime / effectiveDuration, 0, 1) : 0;
  const knobRatio = hoverPreview?.ratio ?? progressRatio;
  const hoverSkip = hoverPreview
    ? segmentAtTime(skipSegments, hoverPreview.time)
    : undefined;
  const activeSkipInterval =
    activeSkip === "intro"
      ? skipTimes?.intro
      : activeSkip === "recap"
        ? skipTimes?.recap
        : activeSkip === "outro"
          ? skipTimes?.outro
          : undefined;
  const skipRemainingSecs =
    activeSkipInterval && Number.isFinite(activeSkipInterval.end)
      ? Math.max(0, Math.ceil(activeSkipInterval.end - displayTime))
      : 0;
  const nearEnd =
    effectiveDuration > 60 && currentTime >= effectiveDuration - 90;
  const showNextEpisode =
    !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipStackClass = showNextEpisode
    ? "kitty-overlay--stacked"
    : "kitty-overlay--base";
  const showSpinner =
    !casting &&
    spinnerArmed &&
    (playing || hasStarted || sourceLoading || mediaSeeking) &&
    !playbackIssue &&
    !seeking &&
    // Poster covers cold start — avoid spinner-on-poster race before first play.
    !(Boolean(poster) && !hasStarted && !playing && sourceLoading);
  const showCenterPlay =
    !casting &&
    !effectivePlaying &&
    !buffering &&
    !sourceLoading &&
    !playbackIssue;
  const activeServerQuality =
    serverQualities.find((q) => q.file === activeSrc || q.file === src) ?? null;

  const qualityButtonLabel = (() => {
    if (activeServerQuality) {
      const height = parseHeight(activeServerQuality.quality);
      return height
        ? `${height}p`
        : formatStreamQualityLabel(activeServerQuality.quality);
    }
    if (showHlsQualityMenu) {
      if (hlsLevelIndex < 0) return "Auto";
      const level = hlsLevels.find((l) => l.index === hlsLevelIndex);
      if (level?.height) return `${level.height}p`;
      return level?.label ?? "Auto";
    }
    return "Quality";
  })();

  const timeFromPointer = (
    e: ReactPointerEvent<HTMLDivElement>,
    opts?: { fine?: boolean },
  ) => {
    const el = progressRef.current ?? e.currentTarget;
    const rect = el.getBoundingClientRect();
    const fine = opts?.fine ?? scrubOriginRef.current?.fine ?? false;
    const origin = scrubOriginRef.current;
    if (fine && origin && effectiveDuration > 0) {
      const dx = e.clientX - origin.clientX;
      const delta =
        (dx / Math.max(rect.width, 1)) * (FINE_SCRUB_WINDOW_SECS * 2);
      const time = clamp(origin.time + delta, 0, effectiveDuration);
      return {
        time,
        ratio: clamp(time / effectiveDuration, 0, 1),
      };
    }
    const ratio = clamp((e.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return { time: ratio * effectiveDuration, ratio };
  };

  const onVolumeButtonClick = () => {
    bumpControls();
    setMoreOpen(false);
    setCaptionsOpen(false);
    setQualityOpen(false);
    setSpeedOpen(false);
    setAudioOpen(false);
    if (volumeLongPressFiredRef.current) {
      volumeLongPressFiredRef.current = false;
      return;
    }
    if (volumeOpen) {
      setVolumeOpen(false);
      return;
    }
    // Coarse: tap mutes; long-press opens the slider (surface swipe also adjusts).
    toggleMute();
  };

  const retryPlayback = useCallback(() => {
    const video = videoRef.current;
    const t = video?.currentTime ?? 0;
    if (t > 1) qualityResumeRef.current = t;
    mediaRetryRef.current = false;
    setPlaybackIssue(null);
    setAttachNonce((n) => n + 1);
    bumpControls();
  }, [bumpControls]);

  const speedButtonLabel =
    Math.abs(playbackRate - 1) < 0.001 ? "1×" : `${playbackRate}×`;

  const activeAudioLabel =
    hlsAudioOptions.find((t) => t.index === hlsAudioIndex)?.label ?? "Audio";

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={title ? `KittyPlayer: ${title}` : "KittyPlayer"}
      className={cn(
        "anikitty-player group/player relative aspect-video w-full overflow-hidden rounded-lg bg-black outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/40",
        chromeVisible ? "cursor-auto" : "cursor-none",
        seeking && "touch-none overscroll-none",
        anime4kActive && "anime4k-active",
        reduceMotion && "anikitty-player--reduce-motion",
        orientClass,
        className,
      )}
      style={cueStyle}
      onMouseMove={() => bumpControls()}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          revealControlsFromTouch();
        }
        rootRef.current?.focus({ preventScroll: true });
      }}
      onMouseLeave={() => {
        if (!seekingRef.current) setHoverPreview(null);
        if (popoverOpenRef.current || chromePinnedRef.current) return;
        if (effectivePlaying && !seekingRef.current) {
          clearIdleTimer();
          idleTimerRef.current = setTimeout(() => {
            if (popoverOpenRef.current || chromePinnedRef.current) return;
            setControlsVisible(false);
            closePopovers();
          }, 900);
        }
      }}
      onTouchStart={revealControlsFromTouch}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveRegionAnnouncement ||
          (casting
            ? `Casting${castDeviceName ? ` to ${castDeviceName}` : ""}`
            : effectivePlaying
              ? "Playing"
              : "Paused")}
        {!liveRegionAnnouncement
          ? selectedCaptionId
            ? `, captions ${captionOptions.find((c) => c.id === selectedCaptionId)?.label ?? "on"}`
            : ", captions off"
          : ""}
      </div>

      {/* Video in its own stacking layer so shadow media-controls can't cover chrome. */}
      <div data-ak-video-layer="" className="absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          poster={poster}
          playsInline
          preload="metadata"
          controlsList="nodownload noplaybackrate noremoteplayback"
          className={cn(
            "h-full w-full object-contain anikitty-player-video",
            // Hide local frames while Chromecast is active (AirPlay keeps the video).
            (casting || castConnecting) && "opacity-0",
          )}
          style={{
            filter:
              casting || castConnecting
                ? undefined
                : `brightness(${brightness})`,
          }}
          aria-hidden={casting || castConnecting || undefined}
          onClick={handleVideoClick}
          onDoubleClick={handleVideoDoubleClick}
          onPointerDown={(e) => {
            if (e.pointerType === "touch" || e.pointerType === "pen") {
              revealControlsFromTouch();
            }
            surfaceGestures.onPointerDown(e);
          }}
          onPointerMove={surfaceGestures.onPointerMove}
          onPointerUp={surfaceGestures.onPointerUp}
          onPointerCancel={surfaceGestures.onPointerCancel}
        />
      </div>

      <PlayerSubtitleOverlay
        videoRef={videoRef}
        selectedCaptionId={selectedCaptionId}
        captionOptions={captionOptions}
        captionSize={captionSize}
        captionPosition={captionPosition}
        captionOffset={captionOffset}
        immersive={fullscreen || cssFullscreen}
        chromeVisible={chromeVisible}
      />

      {/* Chromecast surface — poster + live remote status; local video stays mounted but invisible */}
      {casting || castConnecting ? (
        <div
          className="pointer-events-none absolute inset-0 z-[15] overflow-hidden bg-zinc-950"
          aria-hidden
        >
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element -- cast overlay; arbitrary CDN URLs
            <img
              key={poster}
              src={poster}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full scale-[1.02] object-cover transition-opacity duration-500",
                castPosterReady ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
              onLoad={() => setCastPosterReady(true)}
              onError={() => setCastPosterReady(false)}
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/40" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.45)_100%)]" />
          <div className="relative flex h-full flex-col items-center justify-center gap-3 px-4">
            <div
              className={cn(
                "flex w-full max-w-[17rem] flex-col items-center gap-2.5 px-5 py-4",
                PLAYER_POPOVER_CLASS,
              )}
            >
              <CastConnectedIcon
                className={cn(
                  "h-8 w-8 text-white/90",
                  castConnecting && !reduceMotion && "animate-pulse",
                )}
              />
              <p className="text-[13px] font-medium tracking-wide text-white">
                {castConnecting
                  ? "Connecting…"
                  : castRemotePlaying
                    ? "Playing on Cast"
                    : "Paused on Cast"}
              </p>
              {castDeviceName ? (
                <p className="text-[11px] tracking-wide text-white/55">
                  {castDeviceName}
                </p>
              ) : null}
              {casting && effectiveDuration > 0 ? (
                <div className="mt-0.5 w-full space-y-1.5">
                  <p className="text-center text-[11px] tabular-nums tracking-wide text-white/70">
                    {formatPlayerTime(displayTime)}
                    <span className="text-white/35">
                      {" "}
                      / {formatPlayerTime(effectiveDuration)}
                    </span>
                  </p>
                  <div
                    className="h-[2.5px] w-full overflow-hidden rounded-full bg-white/15"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-white/85 transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.round(progressRatio * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            {title ? (
              <p className="max-w-md truncate text-center text-[12px] tracking-wide text-white/45">
                {title}
              </p>
            ) : null}
          </div>
        </div>
      ) : castLastError && !castErrorDismissed ? (
        <div
          className="absolute inset-x-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[15] flex justify-center"
          role="status"
        >
          <div
            className={cn(
              "pointer-events-auto flex max-w-md items-start gap-2 px-3 py-2",
              PLAYER_POPOVER_CLASS,
            )}
          >
            <p className="min-w-0 flex-1 text-[11px] leading-snug text-white/70">
              {castLastError}
            </p>
            <button
              type="button"
              onClick={() => setCastErrorDismissed(true)}
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white/45 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {isOffline ? (
        <div
          role="status"
          className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-lg border border-amber-400/20 bg-zinc-950/92 px-3.5 py-2.5 text-left backdrop-blur-xl sm:inset-x-auto sm:left-3 sm:max-w-xs"
        >
          <p className="text-[12px] font-semibold tracking-wide text-white">
            {t("watch.offlineErrorTitle")}
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            {t("network.offlineBanner")}
          </p>
        </div>
      ) : null}

      {playbackIssue ? (
        <div
          role="alert"
          className={cn(
            "absolute z-40 flex flex-col gap-2.5 border border-white/[0.12] bg-zinc-950/92 px-3.5 py-3 text-left backdrop-blur-xl",
            hasStarted
              ? "inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] rounded-lg sm:inset-x-auto sm:right-3 sm:max-w-sm"
              : "inset-0 items-center justify-center rounded-lg border-0 bg-black/70 px-6 backdrop-blur-[2px]",
          )}
        >
          <div
            className={cn(
              "space-y-1",
              !hasStarted && "max-w-sm text-center",
            )}
          >
            <p className="text-[12px] font-semibold tracking-wide text-white">
              Can&apos;t play this stream
            </p>
            <p className="text-[11px] leading-snug text-white/65">{playbackIssue}</p>
          </div>
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              !hasStarted && "justify-center",
            )}
          >
            <button
              type="button"
              onClick={retryPlayback}
              className="rounded-md border border-white/25 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-950 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Retry stream
            </button>
            {hasStarted ? (
              <button
                type="button"
                onClick={() => setPlaybackIssue(null)}
                className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white/55 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Double-click / double-tap seek flash — zone wash + accumulated seconds */}
      <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-20 w-[42%] transition-[opacity,transform] duration-300 ease-out sm:w-1/3",
            seekFlash === "left" ? "opacity-100" : "opacity-0",
            reduceMotion && "transition-none",
          )}
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.22] via-white/[0.08] to-transparent" />
        <div
          className={cn(
            "absolute left-[12%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 transition-transform duration-300",
            seekFlash === "left" ? "scale-100" : "scale-90",
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-zinc-950/80 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <SeekBackIcon className="h-7 w-7" />
          </div>
          {seekFlashSecs > 0 ? (
            <span className="rounded-full border border-white/15 bg-zinc-950/90 px-2.5 py-1 text-[13px] font-semibold tabular-nums tracking-wide text-white shadow-lg">
              −{seekFlashSecs}s
            </span>
          ) : null}
        </div>
      </div>
      <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-20 w-[42%] transition-[opacity,transform] duration-300 ease-out sm:w-1/3",
            seekFlash === "right" ? "opacity-100" : "opacity-0",
            reduceMotion && "transition-none",
          )}
        aria-hidden
      >
        <div className="absolute inset-0 bg-gradient-to-l from-white/[0.22] via-white/[0.08] to-transparent" />
        <div
          className={cn(
            "absolute right-[12%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-2 transition-transform duration-300",
            seekFlash === "right" ? "scale-100" : "scale-90",
          )}
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-zinc-950/80 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <SeekForwardIcon className="h-7 w-7" />
          </div>
          {seekFlashSecs > 0 ? (
            <span className="rounded-full border border-white/15 bg-zinc-950/90 px-2.5 py-1 text-[13px] font-semibold tabular-nums tracking-wide text-white shadow-lg">
              +{seekFlashSecs}s
            </span>
          ) : null}
        </div>
      </div>

      {/* Center gesture hint (seek / volume / brightness / speed) */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-[42%] z-30 -translate-x-1/2 -translate-y-1/2 transition-[opacity,transform] duration-200",
          holdSpeedActive || gestureHint
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "min-w-[4.75rem] px-3.5 py-2 text-center",
            PLAYER_POPOVER_CLASS,
          )}
        >
          <p className="text-[13px] font-semibold tabular-nums tracking-wide text-white">
            {holdSpeedActive ? `${HOLD_SPEED_RATE}×` : gestureHint?.label}
          </p>
          {holdSpeedActive ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-white/40">
              Hold
            </p>
          ) : gestureHint?.detail ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-white/40">
              {gestureHint.detail}
            </p>
          ) : null}
          {!holdSpeedActive && gestureHint?.meter != null ? (
            <div
              className="mt-2 h-[2.5px] w-full overflow-hidden rounded-full bg-white/15"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-white transition-[width] duration-75"
                style={{
                  width: `${Math.round(clamp(gestureHint.meter, 0, 1) * 100)}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Buffering / source-loading spinner */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200",
          showSpinner ? "opacity-100" : "opacity-0",
        )}
        aria-hidden={!showSpinner}
        role={showSpinner ? "status" : undefined}
        aria-label={
          showSpinner
            ? sourceLoading && !hasStarted
              ? "Loading stream"
              : mediaSeeking
                ? "Seeking"
                : "Buffering"
            : undefined
        }
      >
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/[0.1] bg-black/50 px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="relative h-10 w-10">
            <div
              className="absolute inset-0 rounded-full border-2 border-white/15"
              aria-hidden
            />
            <div
              className={cn(
                "absolute inset-0 rounded-full border-2 border-transparent border-t-white",
                !reduceMotion && "animate-spin",
              )}
            />
          </div>
          {sourceLoading && !hasStarted && !playbackIssue ? (
            <span className="text-[11px] font-medium tracking-wide text-white/70">
              Loading stream…
            </span>
          ) : mediaSeeking && hasStarted ? (
            <span className="text-[11px] font-medium tracking-wide text-white/55">
              Seeking…
            </span>
          ) : buffering && hasStarted ? (
            <span className="text-[11px] font-medium tracking-wide text-white/55">
              Buffering…
            </span>
          ) : null}
        </div>
      </div>

      {/* Center play overlay — optically centered over the video */}
      <button
        type="button"
        aria-label="Play"
        onClick={togglePlay}
        className={cn(
          "absolute left-1/2 top-1/2 z-20 flex h-[4.75rem] w-[4.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
          "border border-white/30 bg-white/[0.12] text-white shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl",
          "transition-[opacity,transform,border-color,background-color,box-shadow] duration-300 ease-out",
          "hover:border-white/45 hover:bg-white/[0.18] hover:shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.22)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45",
          "active:scale-95",
          showCenterPlay
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <span className="absolute inset-[3px] rounded-full bg-gradient-to-b from-white/[0.12] to-transparent" aria-hidden />
        <PlayIcon className="relative h-7 w-7 translate-x-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]" />
      </button>

      {/* Next episode + skip intro/outro overlays */}
      {showNextEpisode && nextEpisode ? (
        <NextEpisodeChip
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          stacked={false}
          detail={
            casting
              ? nearEndSecs > 0
                ? `Cast · ${formatPlayerTime(nearEndSecs)} left`
                : "Cast"
              : nearEndSecs > 0 && nearEndSecs <= 90
                ? `${formatPlayerTime(nearEndSecs)} left`
                : null
          }
          onClick={() => goToNextEpisode()}
        />
      ) : null}
      {activeSkip && activeSkipInterval && countdown === null ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            pulsePlayerHaptic(10);
            seekTo(activeSkipInterval.end);
            setActiveSkip(null);
            showGestureHint({
              label: `${skipKindLabel(activeSkip)} skipped`,
            });
          }}
          className={cn(
            "absolute z-40 inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-zinc-950/80 px-3.5 py-2 backdrop-blur-xl",
            "text-[12px] font-semibold tracking-wide text-white shadow-[0_10px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]",
            "transition-[transform,opacity,background-color,border-color] duration-200",
            "hover:border-white/35 hover:bg-zinc-950/90 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            "right-[max(0.75rem,env(safe-area-inset-right))]",
            // Sit well above the control bar + TV overscan so remotes can focus it.
            skipStackClass === "kitty-overlay--stacked"
              ? "bottom-[max(10.75rem,calc(env(safe-area-inset-bottom)+9.5rem))] sm:bottom-[max(10.25rem,calc(env(safe-area-inset-bottom)+9rem))]"
              : "bottom-[max(8.25rem,calc(env(safe-area-inset-bottom)+7rem))] sm:bottom-[max(7.75rem,calc(env(safe-area-inset-bottom)+6.5rem))]",
            !reduceMotion &&
              "animate-in fade-in zoom-in-95 slide-in-from-right-2 duration-200",
          )}
        >
          <SeekForwardIcon className="h-3.5 w-3.5 opacity-80" aria-hidden />
          <span>Skip {skipKindLabel(activeSkip)}</span>
          {skipRemainingSecs > 0 ? (
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 tabular-nums text-[11px] font-medium text-white/70">
              {formatPlayerTime(skipRemainingSecs)}
            </span>
          ) : null}
        </button>
      ) : null}
      {countdown !== null && nextEpisode ? (
        <UpNextCountdown
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          countdown={countdown}
          casting={casting}
          onPlayNow={() => goToNextEpisode()}
          onCancel={() => {
            autoNextStartedRef.current = false;
            nextNavLockRef.current = false;
            setCountdown(null);
          }}
        />
      ) : null}

      {helpOpen ? (
        <ShortcutsPanel onClose={() => setHelpOpen(false)} />
      ) : null}

      {/* Netflix-style mini progress while chrome is hidden */}
      {showMiniProgress ? (
        <div
          className="pointer-events-none absolute inset-x-0 z-20 h-[3px] bg-white/[0.1] bottom-[max(0px,env(safe-area-inset-bottom))]"
          aria-hidden
        >
          {bufferedAheadRatio != null ? (
            <div
              className="absolute inset-y-0 left-0 origin-left bg-white/25"
              style={{
                width: "100%",
                transform: `scaleX(${bufferedAheadRatio})`,
              }}
            />
          ) : null}
          <div
            className="absolute inset-y-0 left-0 origin-left shadow-[0_0_8px_var(--ak-player-accent-soft)]"
            style={{
              transform: `scaleX(${progressRatio})`,
              background: "var(--ak-player-played)",
            }}
          />
        </div>
      ) : null}

      {/* Top title strip — fades with chrome */}
      {(title || seriesTitle) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 via-black/25 to-transparent pt-[max(0.65rem,env(safe-area-inset-top))] transition-[opacity,transform] duration-300 ease-out",
            chromeVisible
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0",
            reduceMotion && "transition-none",
          )}
          aria-hidden={!chromeVisible}
        >
          <div className="px-3.5 pb-10 sm:px-5">
            {seriesTitle ? (
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                {seriesTitle}
              </p>
            ) : null}
            {title ? (
              <p className="mt-1 truncate text-[13px] font-semibold tracking-wide text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.7)] sm:text-[15px]">
                {title}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {/* Bottom chrome — sparse ArtPlayer-like bar */}
      <div
        data-ak-chrome="1"
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-[opacity,transform] duration-200 ease-out",
          (fullscreen || cssFullscreen) && "z-[2147483647]",
          chromeVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-1.5 opacity-0",
          reduceMotion && "transition-none",
        )}
        aria-hidden={!chromeVisible}
      >
        <div
          className={cn(
            // Soft dock fade + light glass strip so icons stay readable on bright frames.
            "group/chrome pointer-events-auto bg-gradient-to-t from-black/88 via-black/48 to-transparent pt-6 transition-[background] duration-200",
            !chromeVisible && "pointer-events-none",
          )}
          onMouseEnter={() => {
            if (prefersCoarsePointer()) return;
            chromePinnedRef.current = true;
            clearIdleTimer();
            setControlsVisible(true);
          }}
          onMouseLeave={() => {
            if (prefersCoarsePointer()) return;
            chromePinnedRef.current = false;
            bumpControls();
          }}
        >
          <div
            className={cn(
              "relative w-full min-w-0",
              "pb-[max(0.4rem,env(safe-area-inset-bottom))] pl-[max(0.4rem,env(safe-area-inset-left))] pr-[max(0.4rem,env(safe-area-inset-right))] pt-1",
              "before:pointer-events-none before:absolute before:inset-x-0 before:bottom-0 before:h-[4.75rem] before:bg-zinc-950/30 before:backdrop-blur-[6px] before:supports-[backdrop-filter]:bg-zinc-950/20",
              "drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]",
            )}
          >
            {/* Progress — full content width; compact hit target; thin visual line */}
            <div
              ref={progressRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.floor(effectiveDuration) || 0}
              aria-valuenow={Math.floor(displayTime)}
              aria-valuetext={`${formatPlayerTime(displayTime)} of ${formatPlayerTime(effectiveDuration)}`}
              tabIndex={0}
              className="group/seek relative h-7 w-full min-w-0 cursor-pointer touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 sm:h-3"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                seekingRef.current = true;
                setSeeking(true);
                setMediaSeeking(false);
                bumpControls();
                const fine = e.shiftKey;
                const startTime =
                  videoRef.current?.currentTime ??
                  currentTime;
                scrubOriginRef.current = {
                  time: startTime,
                  clientX: e.clientX,
                  fine,
                };
                const { time, ratio } = timeFromPointer(e, { fine });
                // Preview-only while dragging — commit on pointer up (avoids HLS thrash).
                setSeekPreview(time);
                setHoverPreview({ time, ratio });
                if (fine) {
                  showGestureHint({
                    label: "Fine scrub",
                    detail: `±${FINE_SCRUB_WINDOW_SECS}s`,
                  });
                }
              }}
              onPointerMove={(e) => {
                if (seekingRef.current) e.preventDefault();
                const { time, ratio } = timeFromPointer(e);
                if (seekingRef.current) {
                  setSeekPreview(time);
                  setHoverPreview({ time, ratio });
                  return;
                }
                // Desktop hover scrub preview
                if (e.pointerType === "mouse" && effectiveDuration > 0) {
                  setHoverPreview({ time, ratio });
                }
              }}
              onPointerUp={(e) => {
                if (seekingRef.current) {
                  const { time } = timeFromPointer(e);
                  seekTo(time);
                }
                seekingRef.current = false;
                scrubOriginRef.current = null;
                setSeeking(false);
                setSeekPreview(null);
                if (e.pointerType !== "mouse") setHoverPreview(null);
                bumpControls();
              }}
              onPointerCancel={() => {
                seekingRef.current = false;
                scrubOriginRef.current = null;
                setSeeking(false);
                setSeekPreview(null);
                setHoverPreview(null);
                bumpControls();
              }}
              onPointerLeave={() => {
                if (!seekingRef.current) setHoverPreview(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  seekBy(-SEEK_STEP_FINE);
                } else if (e.key === "ArrowRight") {
                  e.preventDefault();
                  seekBy(SEEK_STEP_FINE);
                }
              }}
            >
              {(hoverPreview || seeking) && effectiveDuration > 0 ? (
                <SeekPreviewCard
                  ratio={hoverPreview?.ratio ?? progressRatio}
                  time={hoverPreview?.time ?? displayTime}
                  cue={hoverStoryboardCue}
                  skipKind={hoverSkip?.kind ?? null}
                  bufferAheadSecs={
                    !casting && bufferedRanges.length > 0
                      ? (() => {
                          const t = hoverPreview?.time ?? displayTime;
                          const ahead = bufferedRanges.find(
                            (r) => t >= r.start && t <= r.end,
                          );
                          if (!ahead) return null;
                          const secs = Math.max(0, Math.floor(ahead.end - t));
                          return secs > 0 ? secs : null;
                        })()
                      : null
                  }
                />
              ) : null}
              {/*
                Avoid translateY on the track itself — % widths / scaleX fills
                inside transformed parents are unreliable on mobile Firefox.
                Center with top + margin instead; use scaleX for played/buffered.
              */}
              <div className={cn(
                "pointer-events-none absolute left-0 right-0 top-1/2 h-[3.5px] w-full -mt-[1.75px] overflow-visible rounded-full ring-1 ring-inset ring-white/[0.07] transition-[height,margin] duration-150 sm:h-[3px] sm:-mt-[1.5px] group-hover/seek:h-[5px] group-hover/seek:-mt-[2.5px]",
                seeking && "h-[5.5px] -mt-[2.75px] sm:h-[4.5px] sm:-mt-[2.25px]",
              )}
                style={{ background: "var(--ak-player-track)" }}
              >
                {/* Buffered ranges — muted ahead-of-playhead fill */}
                {effectiveDuration > 0 && !casting
                  ? bufferedRanges.map((range, i) => {
                      const left = (range.start / effectiveDuration) * 100;
                      const width =
                        ((range.end - range.start) / effectiveDuration) * 100;
                      return (
                        <div
                          key={`${range.start}-${range.end}-${i}`}
                          aria-hidden
                          className="absolute inset-y-0 z-[2] rounded-full"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 0)}%`,
                            background: "var(--ak-player-buffer)",
                          }}
                        />
                      );
                    })
                  : null}
                <div
                  className="absolute inset-y-0 left-0 z-[3] w-full origin-left rounded-full shadow-[0_0_12px_var(--ak-player-accent-soft)]"
                  style={{
                    transform: `scaleX(${progressRatio})`,
                    background: "var(--ak-player-played)",
                  }}
                />
                {/* Playhead tip — tiny bright tick for scrub clarity */}
                {effectiveDuration > 0 ? (
                  <div
                    aria-hidden
                    className="absolute top-1/2 z-[5] h-2.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-90 group-hover/seek:opacity-0"
                    style={{
                      left: `${progressRatio * 100}%`,
                      background: "var(--ak-player-knob)",
                    }}
                  />
                ) : null}
                {/* Skip segment ranges — filled colored bars (intro / outro) */}
                {effectiveDuration > 0
                  ? skipSegments.map((seg) => {
                      const left = (seg.start / effectiveDuration) * 100;
                      const width =
                        ((seg.end - seg.start) / effectiveDuration) * 100;
                      return (
                        <div
                          key={`${seg.kind}-range`}
                          title={skipKindLabel(seg.kind)}
                          aria-hidden
                          className={cn(
                            "absolute top-1/2 z-[1] -translate-y-1/2 rounded-sm transition-[height] duration-150",
                            "h-[3px] group-hover/seek:h-[5px]",
                            seeking && "h-[5px]",
                            seg.kind === "intro"
                              ? "bg-violet-300/45"
                              : seg.kind === "recap"
                                ? "bg-sky-300/45"
                                : "bg-amber-400/65",
                          )}
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 0)}%`,
                          }}
                        />
                      );
                    })
                  : null}
              </div>
              {/* Scrub knob — outside overflow:hidden track so it stays visible */}
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[opacity,transform,width,height] duration-150",
                  "shadow-[0_0_0_2px_rgba(0,0,0,0.4),0_0_0_5px_var(--ak-player-accent-soft),0_2px_12px_rgba(0,0,0,0.5)]",
                  seeking
                    ? "h-[1.125rem] w-[1.125rem] scale-100 opacity-100"
                    : coarsePointer || hoverPreview
                      ? "h-4 w-4 scale-100 opacity-100"
                      : "h-3.5 w-3.5 scale-95 opacity-70 group-hover/seek:h-4 group-hover/seek:w-4 group-hover/seek:scale-100 group-hover/seek:opacity-100",
                )}
                style={{
                  left: `${knobRatio * 100}%`,
                  background: "var(--ak-player-knob)",
                }}
              />
            </div>

            <div className="relative z-[1] flex w-full min-w-0 items-center gap-1 px-0.5 py-1">
              {/* Left — seek, play, seek, episode, time */}
              <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden sm:gap-1">
                <IconButton
                  label={`Seek back ${seekStepSeconds || SEEK_STEP} seconds`}
                  onClick={() => {
                    seekBy(-(seekStepSeconds || SEEK_STEP));
                  }}
                  className="shrink-0"
                >
                  <SeekBackIcon className="h-[17px] w-[17px]" />
                </IconButton>
                <IconButton
                  label={
                    effectivePlaying
                      ? "Pause. Long-press to change speed"
                      : "Play. Long-press to change speed"
                  }
                  onClick={onPlayClick}
                  onPointerDown={onPlayPointerDown}
                  onPointerUp={onPlayPointerUp}
                  onPointerCancel={onPlayPointerUp}
                  className="shrink-0 bg-white text-zinc-950 shadow-[0_2px_14px_rgba(0,0,0,0.35)] hover:bg-white/95"
                >
                  {effectivePlaying ? (
                    <PauseIcon className="h-[17px] w-[17px]" />
                  ) : (
                    <PlayIcon className="h-4 w-4 translate-x-px" />
                  )}
                </IconButton>
                <IconButton
                  label={`Seek forward ${seekStepSeconds || SEEK_STEP} seconds`}
                  onClick={() => {
                    seekBy(seekStepSeconds || SEEK_STEP);
                  }}
                  className="shrink-0"
                >
                  <SeekForwardIcon className="h-[17px] w-[17px]" />
                </IconButton>
                {!compactChrome && (onPrevEpisode || onNextEpisode) ? (
                  <>
                    <span className="mx-0.5 h-4 w-px shrink-0 bg-white/15" aria-hidden />
                    <IconButton
                      label={
                        prevEpisode
                          ? `Previous episode ${prevEpisode.number}`
                          : "Previous episode unavailable"
                      }
                      disabled={!prevEpisode || !onPrevEpisode}
                      onClick={() => goToPrevEpisode()}
                      className="shrink-0"
                    >
                      <EpisodePrevIcon className="h-[17px] w-[17px]" />
                    </IconButton>
                    <IconButton
                      label={
                        nextEpisode
                          ? `Next episode ${nextEpisode.number}`
                          : "Next episode unavailable"
                      }
                      disabled={!nextEpisode || !onNextEpisode}
                      onClick={() => goToNextEpisode()}
                      className="shrink-0"
                    >
                      <EpisodeNextIcon className="h-[17px] w-[17px]" />
                    </IconButton>
                  </>
                ) : null}

                <span
                  className="ml-1.5 min-w-0 select-none truncate tabular-nums tracking-wide text-[11px] text-white/95 sm:ml-2 sm:text-[12px]"
                  aria-hidden
                >
                  <span className="font-semibold">{formatPlayerTime(displayTime)}</span>
                  <span className="text-white/40">
                    <span className="mx-0.5 text-white/20">/</span>
                    {formatPlayerTime(effectiveDuration)}
                  </span>
                </span>
              </div>

              {/* Right — never shrinks; stays above the time label */}
              <div className="relative z-[1] flex shrink-0 items-center gap-0.5">
                {showCaptionsMenu ? (
                  <div className={cn(!coarsePointer && "relative")}>
                    <IconButton
                      buttonRef={captionsTriggerRef}
                      label={
                        selectedCaptionId
                          ? captionOptions.length > 1
                            ? `Subtitles on (${captionOptions.find((c) => c.id === selectedCaptionId)?.label ?? "on"}). Tap to choose track`
                            : `Subtitles on (${captionOptions.find((c) => c.id === selectedCaptionId)?.label ?? "on"})`
                          : captionOptions.length > 1
                            ? "Subtitles off. Tap to choose track"
                            : "Subtitles off"
                      }
                      ariaExpanded={captionsOpen}
                      ariaHasPopup="menu"
                      ariaPressed={Boolean(selectedCaptionId)}
                      onClick={onCaptionsClick}
                      className={cn(
                        !selectedCaptionId && "text-white/45 hover:text-white/80",
                      )}
                    >
                      <CaptionsIcon className="h-[17px] w-[17px]" />
                    </IconButton>
                    {captionsOpen ? (
                      <PlayerOverlayPortal
                        host={
                          coarsePointer
                            ? (getFullscreenTarget() ?? rootRef.current)
                            : undefined
                        }
                      >
                        {coarsePointer ? (
                          <div className={PLAYER_SHEET_LAYER_CLASS}>
                            <button
                              type="button"
                              aria-label="Close captions"
                              className="absolute inset-0 bg-black/55"
                              onClick={() => setCaptionsOpen(false)}
                            />
                            <div
                              ref={captionsMenuRef}
                              role="dialog"
                              aria-label="Captions"
                              className={cn(
                                PLAYER_SHEET_CLASS,
                                !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                              )}
                            >
                              <div
                                className="flex justify-center pb-1 pt-2.5"
                                aria-hidden
                              >
                                <div className="h-1 w-10 rounded-full bg-white/25" />
                              </div>
                              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                                <p className="text-[11px] font-semibold tracking-wide text-white">
                                  Captions
                                </p>
                                <span className="text-[10px] tabular-nums text-white/35">
                                  {selectedCaptionId
                                    ? captionOptions.find(
                                        (c) => c.id === selectedCaptionId,
                                      )?.label ?? "On"
                                    : "Off"}
                                </span>
                              </div>
                              <div className="max-h-[min(42dvh,280px)] overflow-y-auto overscroll-contain sm:max-h-[min(58dvh,380px)]">
                                <MenuSection
                                  dense={coarsePointer || compactChrome}
                                  title="Language"
                                >
                                  <MenuItem
                                    dense={coarsePointer || compactChrome}
                                    active={selectedCaptionId == null}
                                    onClick={() => selectCaption(null)}
                                  >
                                    Off
                                  </MenuItem>
                                  {captionOptions.map((track) => (
                                    <MenuItem
                                      key={track.id}
                                      dense={coarsePointer || compactChrome}
                                      active={selectedCaptionId === track.id}
                                      onClick={() => selectCaption(track.id)}
                                    >
                                      {track.label}
                                    </MenuItem>
                                  ))}
                                </MenuSection>
                                <div className="border-t border-white/[0.08] py-0.5">
                                  <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">
                                    Appearance
                                  </p>
                                  <SegmentedChoice
                                    dense={coarsePointer || compactChrome}
                                    label="Size"
                                    value={captionSize}
                                    onChange={applyCaptionSize}
                                    options={
                                      [
                                        { label: "S", value: "sm" },
                                        { label: "M", value: "md" },
                                        { label: "L", value: "lg" },
                                      ] as const
                                    }
                                  />
                                  <SegmentedChoice
                                    dense={coarsePointer || compactChrome}
                                    label="Position"
                                    value={captionPosition}
                                    onChange={applyCaptionPosition}
                                    options={
                                      [
                                        { label: "Bottom", value: "low" },
                                        { label: "Mid", value: "mid" },
                                        { label: "High", value: "high" },
                                      ] as const
                                    }
                                  />
                                </div>
                                <MenuSection
                                  dense={coarsePointer || compactChrome}
                                  title="Timing"
                                >
                                  {CAPTION_OFFSET_OPTIONS.map((offset) => (
                                    <MenuItem
                                      key={offset}
                                      dense={coarsePointer || compactChrome}
                                      active={
                                        Math.abs(captionOffset - offset) < 0.001
                                      }
                                      onClick={() =>
                                        applyCaptionOffset(offset)
                                      }
                                    >
                                      {offset === 0
                                        ? "On time"
                                        : offset > 0
                                          ? `+${offset}s`
                                          : `${offset}s`}
                                    </MenuItem>
                                  ))}
                                </MenuSection>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            ref={captionsMenuRef}
                            role="dialog"
                            aria-label="Captions"
                            className={cn(
                              "absolute bottom-full right-0 z-50 mb-2.5 w-[min(calc(100vw-1.5rem),240px)] overflow-hidden",
                              PLAYER_POPOVER_CLASS,
                              !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                            )}
                          >
                            <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                              <p className="text-[11px] font-semibold tracking-wide text-white">
                                Captions
                              </p>
                              <span className="text-[10px] tabular-nums text-white/35">
                                {selectedCaptionId
                                  ? captionOptions.find(
                                      (c) => c.id === selectedCaptionId,
                                    )?.label ?? "On"
                                  : "Off"}
                              </span>
                            </div>
                              <div className="max-h-[min(52vh,320px)] overflow-y-auto">
                              <MenuSection title="Language">
                                <MenuItem
                                  active={selectedCaptionId == null}
                                  onClick={() => selectCaption(null)}
                                >
                                  Off
                                </MenuItem>
                                {captionOptions.map((track) => (
                                  <MenuItem
                                    key={track.id}
                                    active={selectedCaptionId === track.id}
                                    onClick={() => selectCaption(track.id)}
                                  >
                                    {track.label}
                                  </MenuItem>
                                ))}
                              </MenuSection>
                              <div className="border-t border-white/[0.08] py-0.5">
                                <p className="px-3 pb-0.5 pt-2 text-[10px] font-medium uppercase tracking-[0.08em] text-white/35">
                                  Appearance
                                </p>
                                <SegmentedChoice
                                  label="Size"
                                  value={captionSize}
                                  onChange={applyCaptionSize}
                                  options={
                                    [
                                      { label: "S", value: "sm" },
                                      { label: "M", value: "md" },
                                      { label: "L", value: "lg" },
                                    ] as const
                                  }
                                />
                                <SegmentedChoice
                                  label="Position"
                                  value={captionPosition}
                                  onChange={applyCaptionPosition}
                                  options={
                                    [
                                      { label: "Bottom", value: "low" },
                                      { label: "Mid", value: "mid" },
                                      { label: "High", value: "high" },
                                    ] as const
                                  }
                                />
                              </div>
                              <MenuSection title="Timing">
                                {CAPTION_OFFSET_OPTIONS.map((offset) => (
                                  <MenuItem
                                    key={offset}
                                    active={
                                      Math.abs(captionOffset - offset) < 0.001
                                    }
                                    onClick={() => applyCaptionOffset(offset)}
                                  >
                                    {offset === 0
                                      ? "On time"
                                      : offset > 0
                                        ? `+${offset}s`
                                        : `${offset}s`}
                                  </MenuItem>
                                ))}
                              </MenuSection>
                            </div>
                          </div>
                        )}
                      </PlayerOverlayPortal>
                    ) : null}
                  </div>
                ) : null}

                {showAudioMenu && !compactChrome ? (
                  <div className={cn(!coarsePointer && "relative")}>
                    <IconButton
                      buttonRef={audioTriggerRef}
                      label={`Audio: ${activeAudioLabel}. Tap to choose track`}
                      ariaExpanded={audioOpen}
                      ariaHasPopup="menu"
                      onClick={onAudioClick}
                    >
                      <AudioIcon className="h-[17px] w-[17px]" />
                    </IconButton>
                    {audioOpen ? (
                      <PlayerOverlayPortal
                        host={
                          coarsePointer
                            ? (getFullscreenTarget() ?? rootRef.current)
                            : undefined
                        }
                      >
                        {coarsePointer ? (
                          <div className={PLAYER_SHEET_LAYER_CLASS}>
                            <button
                              type="button"
                              aria-label="Close audio"
                              className="absolute inset-0 bg-black/55"
                              onClick={() => setAudioOpen(false)}
                            />
                            <div
                              ref={audioMenuRef}
                              role="dialog"
                              aria-label="Audio tracks"
                              className={cn(
                                PLAYER_SHEET_CLASS,
                                !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                              )}
                            >
                              <div
                                className="flex justify-center pb-1 pt-2.5"
                                aria-hidden
                              >
                                <div className="h-1 w-10 rounded-full bg-white/25" />
                              </div>
                              <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-2">
                                <p className="text-[11px] font-semibold tracking-wide text-white">
                                  Audio
                                </p>
                                <span className="text-[10px] tabular-nums text-white/35">
                                  {activeAudioLabel}
                                </span>
                              </div>
                              <div className="max-h-[min(42dvh,280px)] overflow-y-auto overscroll-contain sm:max-h-[min(58dvh,380px)]">
                                <MenuSection title="Track" dense>
                                  {hlsAudioOptions.map((track) => (
                                    <MenuItem
                                      key={track.index}
                                      dense
                                      active={hlsAudioIndex === track.index}
                                      onClick={() => selectHlsAudio(track.index)}
                                    >
                                      {track.label}
                                    </MenuItem>
                                  ))}
                                </MenuSection>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            ref={audioMenuRef}
                            role="menu"
                            aria-label="Audio tracks"
                            className={cn(
                              "absolute bottom-full right-0 z-50 mb-2.5 max-h-[min(50vh,280px)] min-w-[152px] overflow-y-auto py-1",
                              PLAYER_POPOVER_CLASS,
                              !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                            )}
                          >
                            {hlsAudioOptions.map((track) => (
                              <MenuItem
                                key={track.index}
                                active={hlsAudioIndex === track.index}
                                onClick={() => selectHlsAudio(track.index)}
                              >
                                {track.label}
                              </MenuItem>
                            ))}
                          </div>
                        )}
                      </PlayerOverlayPortal>
                    ) : null}
                  </div>
                ) : null}

                {airPlayAvailable ? (
                  <IconButton
                    label={
                      airPlayPreparing
                        ? "Preparing AirPlay…"
                        : airPlayConnected
                          ? "AirPlay connected"
                          : "AirPlay"
                    }
                    ariaPressed={airPlayConnected}
                    disabled={airPlayPreparing}
                    onClick={() => {
                      showAirPlayPicker();
                      bumpControls();
                    }}
                    className={cn(
                      airPlayConnected && "text-white",
                      airPlayPreparing && "opacity-60",
                    )}
                  >
                    {airPlayConnected ? (
                      <AirPlayConnectedIcon className="h-[18px] w-[18px]" />
                    ) : (
                      <AirPlayIcon className="h-[18px] w-[18px]" />
                    )}
                  </IconButton>
                ) : null}

                {castAvailable ? (
                  <IconButton
                    label={
                      casting
                        ? castDeviceName
                          ? `Stop casting (${castDeviceName})`
                          : "Stop casting"
                        : castConnecting
                          ? "Connecting…"
                          : "Cast to device"
                    }
                    ariaPressed={casting}
                    disabled={castConnecting}
                    onClick={() => {
                      void toggleCast();
                      bumpControls();
                    }}
                    className={cn(
                      casting && "text-white",
                      castConnecting && "opacity-70",
                    )}
                  >
                    {casting || castConnecting ? (
                      <CastConnectedIcon className="h-[18px] w-[18px]" />
                    ) : (
                      <CastIcon className="h-[18px] w-[18px]" />
                    )}
                  </IconButton>
                ) : null}

                {showQualityPicker && !compactChrome ? (
                  <div className="relative">
                    <IconButton
                      buttonRef={qualityTriggerRef}
                      label={`Quality: ${qualityButtonLabel}`}
                      ariaExpanded={qualityOpen}
                      ariaHasPopup="menu"
                      onClick={() => {
                        setQualityOpen((v) => !v);
                        setMoreOpen(false);
                        setVolumeOpen(false);
                        setCaptionsOpen(false);
                        setSpeedOpen(false);
                        setAudioOpen(false);
                        bumpControls();
                      }}
                      className="w-auto min-w-10 px-1.5 sm:min-w-9"
                    >
                      <span className="select-none text-[11px] font-medium tabular-nums tracking-wide text-white/75 sm:text-[12px]">
                        {qualityButtonLabel}
                      </span>
                    </IconButton>
                    {qualityOpen ? (
                      <div
                        ref={qualityMenuRef}
                        role="menu"
                        aria-label="Quality"
                        className={cn(
                          "absolute bottom-full right-0 z-50 mb-2.5 max-h-[min(50vh,300px)] min-w-[152px] overflow-y-auto py-1",
                          PLAYER_POPOVER_CLASS,
                          !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                        )}
                      >
                        <QualityMenuContent
                          activeSrc={activeSrc}
                          serverQualities={serverQualities}
                          showHlsQualityMenu={showHlsQualityMenu}
                          hlsLevels={hlsLevels}
                          hlsLevelIndex={hlsLevelIndex}
                          onSelectServer={selectServerQuality}
                          onSelectHls={selectHlsLevel}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!compactChrome ? (
                  <div className="relative">
                    <IconButton
                      buttonRef={speedTriggerRef}
                      label={`Speed: ${speedButtonLabel}`}
                      ariaExpanded={speedOpen}
                      ariaHasPopup="menu"
                      onClick={() => {
                        setSpeedOpen((v) => !v);
                        setMoreOpen(false);
                        setVolumeOpen(false);
                        setCaptionsOpen(false);
                        setQualityOpen(false);
                        setAudioOpen(false);
                        bumpControls();
                      }}
                      className={cn(
                        "w-auto min-w-10 px-1.5 sm:min-w-9",
                        Math.abs(playbackRate - 1) > 0.001 && "text-white",
                      )}
                    >
                      <span className="select-none text-[11px] font-medium tabular-nums tracking-wide text-white/75 sm:text-[12px]">
                        {speedButtonLabel}
                      </span>
                    </IconButton>
                    {speedOpen ? (
                      <div
                        ref={speedMenuRef}
                        role="menu"
                        aria-label="Playback speed"
                        className={cn(
                          "absolute bottom-full right-0 z-50 mb-2.5 min-w-[116px] overflow-y-auto py-1",
                          PLAYER_POPOVER_CLASS,
                          !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                        )}
                      >
                        <SpeedMenuContent
                          playbackRate={playbackRate}
                          showTitle={false}
                          onSelect={(rate) => {
                            applyPlaybackRate(rate, { hint: true });
                            setSpeedOpen(false);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  className={cn(!coarsePointer && !compactChrome && "relative")}
                  onMouseEnter={() => {
                    if (compactChrome || prefersCoarsePointer()) return;
                    setVolumeOpen(true);
                    setMoreOpen(false);
                    setCaptionsOpen(false);
                    setQualityOpen(false);
                    setSpeedOpen(false);
                    setAudioOpen(false);
                  }}
                  onMouseLeave={() => {
                    if (compactChrome || prefersCoarsePointer()) return;
                    setVolumeOpen(false);
                  }}
                >
                  {!compactChrome ? (
                    <IconButton
                      label={
                        prefersCoarsePointer()
                          ? effectiveMuted
                            ? "Unmute. Long-press for volume"
                            : "Mute. Long-press for volume"
                          : effectiveMuted
                            ? "Unmute"
                            : "Mute"
                      }
                      onClick={onVolumeButtonClick}
                      onPointerDown={onVolumePointerDown}
                      onPointerUp={onVolumePointerUp}
                      onPointerCancel={onVolumePointerUp}
                    >
                      {effectiveMuted ? (
                        <VolumeMuteIcon className="h-[18px] w-[18px]" />
                      ) : effectiveVolume < 0.5 ? (
                        <VolumeLowIcon className="h-[18px] w-[18px]" />
                      ) : (
                        <VolumeIcon className="h-[18px] w-[18px]" />
                      )}
                    </IconButton>
                  ) : null}
                  {volumeOpen ? (
                    <PlayerOverlayPortal
                      host={
                        coarsePointer || compactChrome
                          ? (getFullscreenTarget() ?? rootRef.current)
                          : undefined
                      }
                    >
                      {coarsePointer || compactChrome ? (
                        <div className={PLAYER_SHEET_LAYER_CLASS}>
                          <button
                            type="button"
                            aria-label="Close volume"
                            className="absolute inset-0 bg-black/55"
                            onClick={() => setVolumeOpen(false)}
                          />
                          <div
                            className={cn(
                              PLAYER_SHEET_CLASS,
                              "px-4 py-4",
                              !reduceMotion && PLAYER_POPOVER_MOTION_CLASS,
                            )}
                          >
                            <div
                              className="flex justify-center pb-2 pt-1"
                              aria-hidden
                            >
                              <div className="h-1 w-10 rounded-full bg-white/25" />
                            </div>
                            <p className="mb-3 text-center text-[11px] font-semibold tracking-wide text-white">
                              Volume
                            </p>
                            <div className="flex justify-center gap-8 pb-2">
                              <VerticalSliderPopover
                                embedded
                                label="Volume"
                                min={0}
                                max={1}
                                step={0.01}
                                value={effectiveVolume}
                                display={`${Math.round(effectiveVolume * 100)}%`}
                                onChange={(v) =>
                                  setVolumeLevel(v, { hint: true })
                                }
                                secondary={
                                  casting
                                    ? undefined
                                    : {
                                        label: "Sound boost",
                                        caption: "Boost",
                                        min: VOLUME_BOOST_MIN,
                                        max: VOLUME_BOOST_MAX,
                                        step: 0.05,
                                        value: volumeBoost,
                                        display: formatVolumeBoost(volumeBoost),
                                        onChange: (v) =>
                                          setVolumeBoostLevel(v, {
                                            hint: true,
                                          }),
                                      }
                                }
                                footer={
                                  iosVolumeLocked && !casting
                                    ? "iOS uses system volume"
                                    : casting
                                      ? "Cast volume"
                                      : volumeBoost > 1
                                        ? "Boost amplifies local audio"
                                        : undefined
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <VerticalSliderPopover
                          label="Volume"
                          min={0}
                          max={1}
                          step={0.01}
                          value={effectiveVolume}
                          display={`${Math.round(effectiveVolume * 100)}%`}
                          onChange={(v) => setVolumeLevel(v, { hint: true })}
                          secondary={
                            casting
                              ? undefined
                              : {
                                  label: "Sound boost",
                                  caption: "Boost",
                                  min: VOLUME_BOOST_MIN,
                                  max: VOLUME_BOOST_MAX,
                                  step: 0.05,
                                  value: volumeBoost,
                                  display: formatVolumeBoost(volumeBoost),
                                  onChange: (v) =>
                                    setVolumeBoostLevel(v, { hint: true }),
                                }
                          }
                          footer={
                            iosVolumeLocked && !casting
                              ? "iOS uses system volume"
                              : casting
                                ? "Cast volume"
                                : volumeBoost > 1
                                  ? "Boost amplifies local audio"
                                  : undefined
                          }
                        />
                      )}
                    </PlayerOverlayPortal>
                  ) : null}
                </div>

                <div className={cn(!coarsePointer && "relative")}>
                  <IconButton
                    buttonRef={moreTriggerRef}
                    label="Settings"
                    ariaExpanded={moreOpen}
                    ariaHasPopup="menu"
                    onClick={() => {
                      setMoreOpen((v) => !v);
                      setVolumeOpen(false);
                      setCaptionsOpen(false);
                      setQualityOpen(false);
                      setSpeedOpen(false);
                      setAudioOpen(false);
                      bumpControls();
                    }}
                  >
                    <SettingsIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                  {moreOpen ? (
                    <PlayerOverlayPortal
                      host={
                        coarsePointer || compactChrome
                          ? (getFullscreenTarget() ?? rootRef.current)
                          : undefined
                      }
                    >
                      <div
                        className={
                          coarsePointer || compactChrome
                            ? "absolute inset-0 z-[90] flex items-center justify-center overflow-hidden p-3 sm:p-4"
                            : undefined
                        }
                      >
                        {coarsePointer || compactChrome ? (
                          <button
                            type="button"
                            aria-label="Close settings"
                            className="absolute inset-0 bg-black/45"
                            onClick={() => setMoreOpen(false)}
                          />
                        ) : null}
                        <div
                          ref={moreMenuRef}
                          role="menu"
                          aria-label="Settings"
                          className={cn(
                            coarsePointer || compactChrome
                              ? "relative z-[80] flex max-h-[min(58%,19rem)] w-[min(17.5rem,82%)] flex-col overflow-hidden overscroll-contain py-0.5"
                              : "absolute bottom-full right-0 z-50 mb-2.5 max-h-[min(70vh,480px)] w-[min(92vw,20rem)] overflow-hidden py-0",
                            PLAYER_POPOVER_CLASS,
                            !reduceMotion &&
                              (coarsePointer || compactChrome
                                ? "animate-in fade-in zoom-in-95 duration-200"
                                : PLAYER_POPOVER_MOTION_CLASS),
                          )}
                        >
                          <PlayerSettingsMenu
                            className={
                              coarsePointer || compactChrome
                                ? "min-h-0 flex-1 overflow-hidden"
                                : undefined
                            }
                            compact={coarsePointer || compactChrome}
                            watchingHardSub={watchingHardSub}
                            showQualityTab={showQualityPicker}
                            speedLabel={speedButtonLabel}
                            qualityLabel={qualityButtonLabel}
                            volumeBoost={volumeBoost}
                            volumeBoostDisabled={casting}
                            onVolumeBoostChange={(level) =>
                              setVolumeBoostLevel(level, { hint: true })
                            }
                            captionsValue={
                              selectedCaptionId
                                ? (captionOptions.find(
                                    (c) => c.id === selectedCaptionId,
                                  )?.label ?? "On")
                                : "Off"
                            }
                            captionsTrackLabel={
                              selectedCaptionId
                                ? `Tracks · ${captionOptions.find((c) => c.id === selectedCaptionId)?.label ?? "On"}`
                                : "Tracks · Off"
                            }
                            onOpenCaptionsTracks={
                              showCaptionsMenu
                                ? () => {
                                    setMoreOpen(false);
                                    openCaptionsPicker();
                                    bumpControls();
                                  }
                                : undefined
                            }
                            qualityPanel={
                              showQualityPicker ? (
                                <QualityMenuContent
                                  dense={coarsePointer || compactChrome}
                                  activeSrc={activeSrc}
                                  serverQualities={serverQualities}
                                  showHlsQualityMenu={showHlsQualityMenu}
                                  hlsLevels={hlsLevels}
                                  hlsLevelIndex={hlsLevelIndex}
                                  onSelectServer={(entry) => {
                                    selectServerQuality(entry);
                                    setMoreOpen(false);
                                  }}
                                  onSelectHls={(index) => {
                                    selectHlsLevel(index);
                                    setMoreOpen(false);
                                  }}
                                />
                              ) : (
                                <p className="px-3 py-4 text-center text-[11px] text-white/40">
                                  No alternate qualities for this stream
                                </p>
                              )
                            }
                            speedPanel={
                              <SpeedMenuContent
                                dense={coarsePointer || compactChrome}
                                playbackRate={playbackRate}
                                onSelect={(rate) => {
                                  applyPlaybackRate(rate, { hint: true });
                                  setMoreOpen(false);
                                }}
                              />
                            }
                            displayExtras={
                              <>
                                <MenuSection
                                  title="Brightness"
                                  dense={coarsePointer || compactChrome}
                                >
                                  {coarsePointer || compactChrome ? (
                                    <div className="flex gap-1 px-2 pb-1.5 pt-0.5">
                                      {[
                                        { label: "Dim", value: 0.7 },
                                        { label: "Normal", value: 1 },
                                        { label: "Bright", value: 1.35 },
                                      ].map((opt) => (
                                        <button
                                          key={opt.label}
                                          type="button"
                                          onClick={() => {
                                            setBrightnessLevel(opt.value, {
                                              hint: true,
                                            });
                                            setMoreOpen(false);
                                          }}
                                          className={cn(
                                            "min-h-8 flex-1 rounded-md border text-[11px] font-medium transition-colors",
                                            Math.abs(brightness - opt.value) < 0.05
                                              ? "border-white/25 bg-white text-zinc-950"
                                              : "border-white/10 text-white/55 hover:bg-white/[0.06] hover:text-white/85",
                                          )}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    </div>
                                  ) : (
                                    [
                                      { label: "Dim", value: 0.7 },
                                      { label: "Normal", value: 1 },
                                      { label: "Bright", value: 1.35 },
                                    ].map((opt) => (
                                      <MenuItem
                                        key={opt.label}
                                        active={
                                          Math.abs(brightness - opt.value) < 0.05
                                        }
                                        onClick={() => {
                                          setBrightnessLevel(opt.value, {
                                            hint: true,
                                          });
                                          setMoreOpen(false);
                                        }}
                                      >
                                        {opt.label}
                                      </MenuItem>
                                    ))
                                  )}
                                </MenuSection>

                                {showAudioMenu ? (
                                  <MenuSection
                                    title="Audio"
                                    dense={coarsePointer || compactChrome}
                                  >
                                    {hlsAudioOptions.map((track) => (
                                      <MenuItem
                                        key={track.index}
                                        dense={coarsePointer || compactChrome}
                                        active={hlsAudioIndex === track.index}
                                        onClick={() => {
                                          selectHlsAudio(track.index);
                                          setMoreOpen(false);
                                        }}
                                      >
                                        {track.label}
                                      </MenuItem>
                                    ))}
                                  </MenuSection>
                                ) : null}

                                {compactChrome &&
                                (onPrevEpisode || onNextEpisode) ? (
                                  <MenuSection title="Episodes" dense>
                                    {onPrevEpisode ? (
                                      <MenuItem
                                        dense
                                        onClick={() => {
                                          if (!prevEpisode) return;
                                          goToPrevEpisode();
                                          setMoreOpen(false);
                                        }}
                                      >
                                        {prevEpisode
                                          ? `Previous · Ep ${prevEpisode.number}`
                                          : "Previous unavailable"}
                                      </MenuItem>
                                    ) : null}
                                    {onNextEpisode ? (
                                      <MenuItem
                                        dense
                                        onClick={() => {
                                          if (!nextEpisode) return;
                                          goToNextEpisode();
                                          setMoreOpen(false);
                                        }}
                                      >
                                        {nextEpisode
                                          ? `Next · Ep ${nextEpisode.number}`
                                          : "Next unavailable"}
                                      </MenuItem>
                                    ) : null}
                                  </MenuSection>
                                ) : null}

                                {compactChrome ? (
                                  <MenuSection title="Volume" dense>
                                    <MenuItem
                                      dense
                                      active={!effectiveMuted}
                                      onClick={() => {
                                        toggleMute();
                                        setMoreOpen(false);
                                      }}
                                    >
                                      {effectiveMuted ? "Unmute" : "Mute"}
                                    </MenuItem>
                                    <MenuItem
                                      dense
                                      onClick={() => {
                                        setMoreOpen(false);
                                        setVolumeOpen(true);
                                        bumpControls();
                                      }}
                                    >
                                      Adjust volume
                                    </MenuItem>
                                  </MenuSection>
                                ) : null}

                                {compactChrome &&
                                pipSupported &&
                                !pipBlocked ? (
                                  <MenuSection title="More" dense>
                                    <MenuItem
                                      dense
                                      active={inPip}
                                      onClick={() => {
                                        void togglePip();
                                        setMoreOpen(false);
                                      }}
                                    >
                                      {inPip ? "Exit PiP" : "Picture-in-picture"}
                                    </MenuItem>
                                  </MenuSection>
                                ) : null}

                                <MenuSection
                                  title="Help"
                                  dense={coarsePointer || compactChrome}
                                >
                                  <MenuItem
                                    dense={coarsePointer || compactChrome}
                                    onClick={() => {
                                      setMoreOpen(false);
                                      popoverOpenRef.current = true;
                                      setHelpOpen(true);
                                      bumpControls();
                                    }}
                                  >
                                    Keyboard shortcuts
                                  </MenuItem>
                                </MenuSection>
                              </>
                            }
                          />
                        </div>
                      </div>
                    </PlayerOverlayPortal>
                  ) : null}
                </div>

                {pipSupported && !pipBlocked && !compactChrome ? (
                  <IconButton
                    label={
                      inPip
                        ? "Exit picture-in-picture"
                        : "Picture-in-picture"
                    }
                    ariaPressed={inPip}
                    onClick={() => {
                      void togglePip();
                    }}
                    className={cn(inPip && "text-white")}
                  >
                    <PipIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                ) : null}

                <IconButton
                  label={fullscreen || cssFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => void toggleFullscreen()}
                  className="text-white"
                >
                  {fullscreen || cssFullscreen ? (
                    <FullscreenExitIcon className="h-[18px] w-[18px]" />
                  ) : (
                    <FullscreenIcon className="h-[18px] w-[18px]" />
                  )}
                </IconButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/** @deprecated Prefer AniKittyPlayer */
/** @deprecated Prefer KittyPlayer */
export const AniKittyPlayer = KittyPlayer;
/** @deprecated Prefer KittyPlayer */
export const CustomVideoPlayer = KittyPlayer;
