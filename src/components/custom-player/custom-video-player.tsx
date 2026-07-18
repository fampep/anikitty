"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Hls from "hls.js";

import { pickHlsAudioTrack } from "@/lib/kitty/hls-audio";
import { createHlsConfig } from "@/lib/kitty/hls-config";
import {
  exitElementFullscreen,
  getFullscreenElement,
  isElementFullscreen,
  onFullscreenChange,
  requestElementFullscreen,
} from "@/lib/kitty/fullscreen";
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
  CaptionsIcon,
  CastConnectedIcon,
  CastIcon,
  FullscreenExitIcon,
  FullscreenIcon,
  MoreIcon,
  PauseIcon,
  PlayIcon,
  PlayOutlineIcon,
  SeekBackIcon,
  SeekForwardIcon,
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
import {
  CountdownOverlay,
  NextEpisodeButton,
} from "@/components/player/player-overlays";

import {
  IconButton,
  MenuItem,
  MenuSection,
  SeekPreviewCard,
  VerticalSliderPopover,
} from "./player-chrome";
import {
  buildCastMediaRequest,
  useGoogleCast,
} from "./use-google-cast";
import { useSurfaceGestures } from "./use-surface-gestures";
import {
  captionPositionCss,
  captionSizeCss,
  clamp,
  CUSTOM_PLAYER_SPEEDS,
  formatPlayerTime,
  isAppleTouchDevice,
  loadCustomPlayerPrefs,
  nextCustomPlayerSpeed,
  prefersCoarsePointer,
  resolveStreamAttachMode,
  saveCustomPlayerPrefs,
  sniffIsHlsPlaylist,
  type CaptionPositionPref,
  type CaptionSizePref,
} from "./utils";

type SkipSegmentKind = "intro" | "outro";

type SkipSegment = {
  kind: SkipSegmentKind;
  start: number;
  end: number;
};

function buildSkipSegments(skipTimes?: SkipTimes | null): SkipSegment[] {
  if (!skipTimes) return [];
  const out: SkipSegment[] = [];
  if (
    skipTimes.intro &&
    Number.isFinite(skipTimes.intro.start) &&
    Number.isFinite(skipTimes.intro.end) &&
    skipTimes.intro.end > skipTimes.intro.start
  ) {
    out.push({ kind: "intro", start: skipTimes.intro.start, end: skipTimes.intro.end });
  }
  if (
    skipTimes.outro &&
    Number.isFinite(skipTimes.outro.start) &&
    Number.isFinite(skipTimes.outro.end) &&
    skipTimes.outro.end > skipTimes.outro.start
  ) {
    out.push({ kind: "outro", start: skipTimes.outro.start, end: skipTimes.outro.end });
  }
  return out;
}

function segmentAtTime(
  segments: SkipSegment[],
  time: number,
): SkipSegment | undefined {
  return segments.find((seg) => time >= seg.start && time < seg.end);
}

const SEEK_STEP = 10;
const SEEK_STEP_FINE = 5;
const IDLE_MS = 2800;
const CLICK_DELAY_MS = 280;
const SEEK_FLASH_MS = 700;
const GESTURE_HINT_MS = 750;
const TOUCH_DOUBLE_TAP_MS = 280;
const TOUCH_DOUBLE_TAP_PX = 36;
const LONG_PRESS_MS = 420;
const HOLD_SPEED_RATE = 2;
const PREFS_SAVE_MS = 400;

type BufferedRange = { start: number; end: number };

type GestureHint = {
  label: string;
  detail?: string;
};

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
  webkitSetPresentationMode?: (
    mode: "inline" | "picture-in-picture" | "fullscreen",
  ) => void;
  webkitPresentationMode?: string;
};

function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}

function parseHeight(quality: string): number | undefined {
  const n = parseInt(quality.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function isResolutionQualityLadder(qualities: KittyStreamQuality[]): boolean {
  return qualities.some((entry) => Boolean(parseHeight(entry.quality)));
}

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

export type AniKittyPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  /** Soft subtitle / caption tracks (VTT preferred). */
  tracks?: StreamTrack[];
  /** MegaPlay-style `allServers` ladder when HLS has no useful levels. */
  qualities?: KittyStreamQuality[];
  /** Headers used when minting / resolving Kitty HLS. */
  headers?: Record<string, string>;
  /** Preferred Kitty CDN node for URL resolution (passthrough). */
  kittyNodeId?: KittyApiNodeId;
  /** Resume / deep-link start position (seconds). */
  startTime?: number;
  /** Intro/outro ranges from AniSkip / community / provider (seconds). */
  skipTimes?: SkipTimes;
  /**
   * Storyboard WebVTT URL for seek hover previews (ReAnime/FlixCloud
   * `thumbnails` / `thumbnails_vtt`, or a `kind: thumbnails` track).
   */
  thumbnails?: string | null;
  /** Auto-enable the first (or default) subtitle track. */
  preferSubtitles?: boolean;
  /** Prefer English/dub HLS audio when the master exposes multiple tracks. */
  preferDubAudio?: boolean;
  /** Enter fullscreen once the first frame is ready (mobile episode swipe). */
  autoFullscreen?: boolean;
  /** Next-episode card / autoplay countdown target. */
  nextEpisode?: { id: string; number: number; title: string; image?: string | null };
  /** Called when the user picks an allServers quality (parent remounts src). */
  onSelectQuality?: (entry: KittyStreamQuality) => void;
  /** Called when share is clicked (stub by default). */
  onShare?: () => void;
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onNextEpisode?: () => void;
  /** Fired once when playback enters the outro skip range. */
  onOutroStart?: (duration: number) => void;
  onEnded?: () => void;
  onFatalError?: (info: { type: string; details?: string; status?: number }) => void;
  onPlayerReady?: (player: PlayerController) => void;
  /** Watch-together host/guest sync. */
  w2g?: {
    isHost: boolean;
    syncState?: W2gSyncState | null;
    onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number }) => void;
  };
  /** Optional copy for the HLS / decode failure banner. */
  playbackIssueHint?: string;
};

/** @deprecated Use AniKittyPlayerProps */
export type CustomVideoPlayerProps = AniKittyPlayerProps;

type HlsLevelOption = {
  index: number;
  label: string;
  height?: number;
};

type HlsAudioOption = {
  index: number;
  label: string;
};

type CaptionOption = {
  id: string;
  label: string;
  src: string;
  language: string;
  isDefault?: boolean;
};

export function AniKittyPlayer({
  src,
  poster,
  title,
  className,
  tracks = [],
  qualities = [],
  headers = {},
  kittyNodeId,
  startTime = 0,
  skipTimes,
  thumbnails,
  preferSubtitles = true,
  preferDubAudio = false,
  autoFullscreen = false,
  nextEpisode,
  onSelectQuality,
  onShare,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onOutroStart,
  onEnded,
  onFatalError,
  onPlayerReady,
  w2g,
  playbackIssueHint,
}: AniKittyPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const captionsMenuRef = useRef<HTMLDivElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const captionsTriggerRef = useRef<HTMLButtonElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekingRef = useRef(false);
  const startAppliedRef = useRef(false);
  const startedRef = useRef(false);
  const lastProgressTsRef = useRef(0);
  const volumeBeforeMuteRef = useRef(1);
  const audioUserPickedRef = useRef(false);
  const qualityResumeRef = useRef<number | null>(null);
  const mediaRetryRef = useRef(false);
  const wasPlayingBeforeHideRef = useRef(false);
  const scrubRafRef = useRef<number | null>(null);
  const scrubTargetRef = useRef<number | null>(null);
  const prefsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdSpeedActiveRef = useRef(false);
  const rateBeforeHoldRef = useRef(1);
  const initialPrefsRef = useRef(
    typeof window !== "undefined" ? loadCustomPlayerPrefs() : null,
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
  const startTimeRef = useRef(startTime);
  const preferDubAudioRef = useRef(preferDubAudio);
  const skipTimesRef = useRef(skipTimes);
  const w2gRef = useRef(w2g);
  const nextEpisodeRef = useRef(nextEpisode);
  const introAutoSkippedRef = useRef(false);
  const outroAutoSkippedRef = useRef(false);
  const outroFiredRef = useRef(false);
  const endHandledRef = useRef(false);
  const autoNextStartedRef = useRef(false);
  const applyingW2gRef = useRef(false);
  const lastW2gReportRef = useRef(0);
  const autoFsRef = useRef(false);
  const anime4kDetachRef = useRef<(() => void) | null>(null);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const liteMode = useSettingsStore((s) => s.liteMode);
  const seekStepSeconds = useSettingsStore((s) => s.seekStepSeconds);
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
  startTimeRef.current = startTime;
  preferDubAudioRef.current = preferDubAudio;
  skipTimesRef.current = skipTimes;
  w2gRef.current = w2g;
  nextEpisodeRef.current = nextEpisode;
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
  const [fullscreen, setFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [pipBlocked, setPipBlocked] = useState(false);
  const [inPip, setInPip] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    time: number;
    ratio: number;
  } | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"left" | "right" | null>(null);
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
  const captionsLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captionsLongPressFiredRef = useRef(false);
  const playLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playLongPressFiredRef = useRef(false);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");
  const [iosVolumeLocked] = useState(() => isAppleTouchDevice());
  const [attachNonce, setAttachNonce] = useState(0);
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

  useEffect(() => {
    introAutoSkippedRef.current = false;
    outroAutoSkippedRef.current = false;
    outroFiredRef.current = false;
    endHandledRef.current = false;
    autoNextStartedRef.current = false;
    setActiveSkip(null);
    setCountdown(null);
  }, [src, skipTimes?.intro?.start, skipTimes?.intro?.end, skipTimes?.outro?.start, skipTimes?.outro?.end]);

  const resolvedSrc = useMemo(() => {
    const raw = (srcOverride ?? src).trim();
    if (!raw) return "";
    // Prefer same-origin Kitty proxy when the parent still has an upstream URL.
    return buildKittyHlsUrl(raw, headers, kittyNodeId) || raw;
  }, [src, srcOverride, headers, kittyNodeId]);

  const activeSrc = resolvedSrc;

  const castingRef = useRef(false);
  const castRemotePlayingRef = useRef(false);
  const bumpControlsRef = useRef<() => void>(() => {});
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

  const serverQualities = useMemo(() => {
    const deduped = dedupeStreamQualities(qualities);
    if (deduped.length > 1 && isResolutionQualityLadder(deduped)) return deduped;
    return [];
  }, [qualities]);

  const showHlsQualityMenu = serverQualities.length === 0 && hlsLevels.length > 1;
  const showAudioMenu = hlsAudioOptions.length > 1;
  const showCaptionsMenu = captionOptions.length > 0;

  const displayTime = seekPreview ?? currentTime;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const closePopovers = useCallback(() => {
    setVolumeOpen(false);
    setMoreOpen(false);
    setCaptionsOpen(false);
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    clearIdleTimer();
    if (seekingRef.current) return;
    if (castingRef.current) {
      if (!castRemotePlayingRef.current) return;
      idleTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
        closePopovers();
      }, IDLE_MS);
      return;
    }
    const video = videoRef.current;
    if (!video || video.paused) return;
    idleTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      closePopovers();
    }, IDLE_MS);
  }, [clearIdleTimer, closePopovers]);

  const showSeekFlash = useCallback((side: "left" | "right") => {
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

  bumpControlsRef.current = bumpControls;
  showGestureHintRef.current = showGestureHint;

  const schedulePrefsSave = useCallback((patch: Parameters<typeof saveCustomPlayerPrefs>[0]) => {
    if (prefsSaveTimerRef.current) clearTimeout(prefsSaveTimerRef.current);
    prefsSaveTimerRef.current = setTimeout(() => {
      prefsSaveTimerRef.current = null;
      saveCustomPlayerPrefs(patch);
    }, PREFS_SAVE_MS);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncOffline = () => setIsOffline(!window.navigator.onLine);
    syncOffline();
    window.addEventListener("online", syncOffline);
    window.addEventListener("offline", syncOffline);
    return () => {
      window.removeEventListener("online", syncOffline);
      window.removeEventListener("offline", syncOffline);
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

  // Apply remembered volume / mute once the video element mounts.
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
  }, []);

  const getCastMedia = useCallback(() => {
    const video = videoRef.current;
    return buildCastMediaRequest({
      url: activeSrc,
      qualities,
      title,
      currentTime: castingRef.current
        ? currentTime
        : (video?.currentTime ?? currentTime),
      autoplay: true,
      volume: muted ? 0 : volume,
      muted,
    });
  }, [activeSrc, qualities, title, currentTime, volume, muted]);

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

  const onCastStarted = useCallback(() => {
    const video = videoRef.current;
    if (video && !video.paused) video.pause();
    try {
      if (video) video.muted = true;
    } catch {
      /* ignore */
    }
    exitPictureInPictureSafe(video);
    bumpControlsRef.current();
    showGestureHintRef.current({ label: "Castingâ€¦", detail: "Chromecast" });
  }, []);

  const onCastError = useCallback((message: string) => {
    bumpControlsRef.current();
    showGestureHintRef.current({
      label: "Cast failed",
      detail: message.length > 72 ? `${message.slice(0, 72)}â€¦` : message,
    });
  }, []);

  const cast = useGoogleCast({
    enabled: Boolean(activeSrc),
    getMedia: getCastMedia,
    onSessionEnd: onCastSessionEnd,
    onCastStarted,
    onCastError,
  });
  castingRef.current = cast.casting;
  castRemotePlayingRef.current = cast.remotePlaying;

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
  } = cast;

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

  // Reload Cast media when the stream URL changes mid-session (quality switch).
  const wasCastingForSyncRef = useRef(false);
  useEffect(() => {
    if (!casting || !activeSrc) {
      wasCastingForSyncRef.current = casting;
      return;
    }
    if (!wasCastingForSyncRef.current) {
      wasCastingForSyncRef.current = true;
      return;
    }
    void castSyncMedia();
  }, [activeSrc, casting, castSyncMedia]);

  // Mirror remote progress into watch progress callbacks while casting.
  useEffect(() => {
    if (!casting) return;
    const t = castRemoteTime;
    const d = castRemoteDuration || duration;
    setCurrentTime(t);
    if (d > 0) setDuration((prev) => (prev > 0 ? prev : d));
    onLiveTimeRef.current?.(t, d);
    const now = Date.now();
    if (d > 0 && now - lastProgressTsRef.current >= 10_000) {
      lastProgressTsRef.current = now;
      onProgressRef.current?.(t, d);
    }
  }, [casting, castRemoteTime, castRemoteDuration, duration]);

  // Reset local quality override when parent src changes (episode / provider).
  // Keep qualityResumeRef so in-player quality switches can restore time.
  useEffect(() => {
    setSrcOverride(null);
    audioUserPickedRef.current = false;
    mediaRetryRef.current = false;
  }, [src]);

  // Prefer-subtitles + remembered caption on/off + last track label.
  useEffect(() => {
    if (captionOptions.length === 0) {
      setSelectedCaptionId(null);
      return;
    }
    const prefs = loadCustomPlayerPrefs();
    if (prefs.captionsOn === false) {
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
    if (!preferSubtitles) {
      setSelectedCaptionId(null);
      return;
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

  // Apply native textTrack modes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const apply = () => {
      const list = video.textTracks;
      for (let i = 0; i < list.length; i++) {
        const tt = list[i];
        if (tt.kind !== "subtitles" && tt.kind !== "captions") continue;
        const match = captionOptions.find(
          (c) => c.label === tt.label || c.language === tt.language,
        );
        const id = match?.id ?? null;
        if (selectedCaptionId && id === selectedCaptionId) {
          tt.mode = "showing";
        } else {
          tt.mode = "disabled";
        }
      }
    };

    apply();
    video.textTracks.addEventListener("addtrack", apply);
    video.textTracks.addEventListener("change", apply);
    return () => {
      video.textTracks.removeEventListener("addtrack", apply);
      video.textTracks.removeEventListener("change", apply);
    };
  }, [captionOptions, selectedCaptionId, activeSrc]);

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
          isFullscreen: fullscreen || isElementFullscreen(rootRef.current),
        }),
      );
    };
    syncOrient();
    return onPlayerOrientationChange(syncOrient);
  }, [fullscreen]);

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
      setCountdown((value) => {
        if (value === null || value <= 1) {
          onNextEpisodeRef.current?.();
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown]);

  // Anime4K WebGPU upscale overlay.
  useEffect(() => {
    const video = videoRef.current;
    const root = rootRef.current;
    const effective = anime4kEnabled && !liteMode && isWebGpuSupported();
    let cancelled = false;

    anime4kDetachRef.current?.();
    anime4kDetachRef.current = null;
    setAnime4kActive(false);

    if (!effective || !video || !root) return;

    void attachAnime4k({
      video,
      videoContainer: root,
      mode: anime4kMode,
    }).then((attachment) => {
      if (cancelled) {
        attachment.detach();
        return;
      }
      anime4kDetachRef.current = attachment.detach;
      setAnime4kActive(true);
    });

    return () => {
      cancelled = true;
      anime4kDetachRef.current?.();
      anime4kDetachRef.current = null;
      setAnime4kActive(false);
    };
  }, [anime4kEnabled, anime4kMode, liteMode, src, attachNonce]);

  useEffect(() => {
    if (fullscreen) {
      void tryLockLandscapeOrientation();
      return () => {
        void tryUnlockScreenOrientation();
      };
    }
    void tryUnlockScreenOrientation();
  }, [fullscreen]);

  // Pause when the tab is hidden; resume if we were playing.
  useEffect(() => {
    const onVisibility = () => {
      if (castingRef.current) return;
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        wasPlayingBeforeHideRef.current = !video.paused;
        if (!video.paused) video.pause();
        return;
      }
      if (wasPlayingBeforeHideRef.current) {
        wasPlayingBeforeHideRef.current = false;
        void video.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
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
      bumpControls();
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
        setBufferedRanges([]);
        return;
      }
      const ranges: BufferedRange[] = [];
      for (let i = 0; i < len; i++) {
        ranges.push({
          start: video.buffered.start(i),
          end: video.buffered.end(i),
        });
      }
      setBufferedRanges(ranges);
    };
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      if (video.volume > 0 && !video.muted) {
        volumeBeforeMuteRef.current = video.volume;
      }
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => {
      setBuffering(false);
      setSourceLoading(false);
    };
    const onCanPlay = () => {
      setBuffering(false);
      setSourceLoading(false);
      if (autoFsRef.current) {
        autoFsRef.current = false;
        const target = rootRef.current;
        if (target) {
          void requestElementFullscreen(target)
            .then(() => {
              void tryLockLandscapeOrientation();
            })
            .catch(() => {});
        }
      }
    };
    const onSeeking = () => setBuffering(true);
    const onSeeked = () => {
      if (!video.paused && video.readyState >= 3) setBuffering(false);
    };
    const onEnterPip = () => setInPip(true);
    const onLeavePip = () => setInPip(false);
    const syncFs = () => {
      const rootFs = isElementFullscreen(rootRef.current);
      const wk = video as WebkitVideo;
      setFullscreen(rootFs || Boolean(wk.webkitDisplayingFullscreen));
    };
    const onVideoEnded = () => {
      if (endHandledRef.current) return;
      endHandledRef.current = true;
      onEndedRef.current?.();
      if (nextEpisodeRef.current && autoNextRef.current && !autoNextStartedRef.current) {
        autoNextStartedRef.current = true;
        setCountdown(5);
      }
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
          "This stream could not play in the AniKitty player. Try another source or refresh.",
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
      onWebkitPresentation as EventListener,
    );
    video.addEventListener(
      "webkitendfullscreen",
      onWebkitPresentation as EventListener,
    );
    const offFs = onFullscreenChange(syncFs);
    syncFs();

    const onPageHide = () => exitPictureInPictureSafe(video);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      exitPictureInPictureSafe(video);
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
        onWebkitPresentation as EventListener,
      );
      video.removeEventListener(
        "webkitendfullscreen",
        onWebkitPresentation as EventListener,
      );
      offFs();
      window.removeEventListener("pagehide", onPageHide);
      clearIdleTimer();
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
      if (gestureHintTimerRef.current) clearTimeout(gestureHintTimerRef.current);
    };
  }, [bumpControls, clearIdleTimer, activeSrc, playbackIssueHint, reportW2g]);

  // Attach progressive / HLS source (prefer hls.js when MSE works).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

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
    setCurrentTime(0);
    setDuration(0);
    setBufferedRanges([]);
    setHasStarted(false);
    setBuffering(true);
    setSourceLoading(true);
    setHlsLevels([]);
    setHlsLevelIndex(-1);
    setHlsAudioOptions([]);
    setHlsAudioIndex(0);
    hlsRef.current = null;

    const fail = (type: string, details?: string, status?: number) => {
      if (cancelled) return;
      setPlaybackIssue(
        playbackIssueHint ??
          "This stream could not play in the AniKitty player. Try another source or refresh.",
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
      void video.play().catch(() => {
        // Autoplay blocked â€” user must tap play (expected on mobile).
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
          label: track.name || track.lang || `Audio ${index + 1}`,
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
      hls = new Hls(createHlsConfig());
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
        if (!data.fatal || cancelled) return;
        const status = (data.response as { code?: number } | undefined)?.code;
        if (status === 401 || status === 403) {
          fail("hls-auth", data.details, status);
          hls?.destroy();
          hls = null;
          hlsRef.current = null;
          return;
        }

        // Extensionless / mis-detected URL: soft-fall back to progressive once.
        const looksManifestFail =
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR;
        if (
          looksManifestFail &&
          !progressiveFallbackTried &&
          !isHlsStreamUrl(activeSrc) &&
          !activeSrc.includes("/api/kitty/hls")
        ) {
          progressiveFallbackTried = true;
          hls?.destroy();
          hls = null;
          hlsRef.current = null;
          attachProgressive();
          return;
        }

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveries < 3) {
          networkRecoveries += 1;
          hls?.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 3) {
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

    const attachNativeHls = () => {
      if (cancelled) return;
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

    const run = async () => {
      const clearlyTyped =
        isHlsStreamUrl(activeSrc) ||
        isMp4StreamUrl(activeSrc) ||
        activeSrc.includes("/api/kitty/hls");

      let sniffed: boolean | null = null;
      if (!clearlyTyped) {
        sniffed = await sniffIsHlsPlaylist(activeSrc, abortSniff.signal);
        if (cancelled) return;
      }

      const mode = resolveStreamAttachMode({
        url: activeSrc,
        video,
        hlsJsSupported: Hls.isSupported(),
        qualities,
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
      video.removeAttribute("src");
      video.load();
    };
  }, [activeSrc, playbackIssueHint, qualities, attachNonce]);

  const togglePlay = useCallback(() => {
    if (castingRef.current) {
      castPlayOrPause();
      bumpControls();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
    bumpControls();
  }, [bumpControls, castPlayOrPause]);

  const seekBy = useCallback(
    (delta: number, opts?: { hint?: boolean }) => {
      if (castingRef.current) {
        const base = currentTime;
        const max = effectiveDuration || base + Math.abs(delta);
        const next = clamp(base + delta, 0, max);
        castSeekTo(next);
        setCurrentTime(next);
        if (opts?.hint !== false) {
          const abs = Math.abs(Math.round(delta));
          showGestureHint({
            label: delta >= 0 ? `+${abs}s` : `âˆ’${abs}s`,
          });
        }
        bumpControls();
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(
        video.currentTime + delta,
        0,
        Number.isFinite(video.duration) ? video.duration : video.currentTime + delta,
      );
      video.currentTime = next;
      setCurrentTime(next);
      if (opts?.hint !== false) {
        const abs = Math.abs(Math.round(delta));
        showGestureHint({
          label: delta >= 0 ? `+${abs}s` : `âˆ’${abs}s`,
        });
      }
      bumpControls();
    },
    [bumpControls, castSeekTo, currentTime, effectiveDuration, showGestureHint],
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

  const toggleMute = useCallback(() => {
    if (castingRef.current) {
      const next = effectiveMuted ? volumeBeforeMuteRef.current || 0.8 : 0;
      if (!effectiveMuted) volumeBeforeMuteRef.current = castRemoteVolume || 1;
      castSetVolume(next);
      bumpControls();
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = volumeBeforeMuteRef.current || 1;
      schedulePrefsSave({ muted: false, volume: video.volume });
    } else {
      volumeBeforeMuteRef.current = video.volume || 1;
      video.muted = true;
      schedulePrefsSave({ muted: true, volume: volumeBeforeMuteRef.current });
    }
    bumpControls();
  }, [bumpControls, castRemoteVolume, castSetVolume, effectiveMuted, schedulePrefsSave]);

  const setVolumeLevel = useCallback(
    (level: number, opts?: { hint?: boolean }) => {
      const next = clamp(level, 0, 1);
      if (castingRef.current) {
        castSetVolume(next);
        if (next > 0) volumeBeforeMuteRef.current = next;
        if (opts?.hint) {
          showGestureHint({
            label: "Volume",
            detail: `${Math.round(next * 100)}%`,
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
        });
      }
      bumpControls();
    },
    [bumpControls, castSetVolume, schedulePrefsSave, showGestureHint],
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
        });
      }
      bumpControls();
    },
    [bumpControls, schedulePrefsSave, showGestureHint],
  );

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    const video = videoRef.current as WebkitVideo | null;
    if (!root) return;
    try {
      if (
        isElementFullscreen(root) ||
        getFullscreenElement() ||
        video?.webkitDisplayingFullscreen
      ) {
        if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
          video.webkitExitFullscreen();
        } else {
          await exitElementFullscreen();
        }
      } else {
        const canElementFs =
          typeof root.requestFullscreen === "function" ||
          typeof (
            root as HTMLElement & { webkitRequestFullscreen?: () => void }
          ).webkitRequestFullscreen === "function";

        if (!canElementFs && video?.webkitEnterFullscreen) {
          video.webkitEnterFullscreen();
        } else {
          try {
            await requestElementFullscreen(root);
          } catch {
            // iOS Safari often only fullscreens the <video> element.
            video?.webkitEnterFullscreen?.();
          }
        }
      }
    } catch {
      /* browser may deny fullscreen without gesture */
    }
    bumpControls();
  }, [bumpControls]);

  const exitFullscreen = useCallback(async () => {
    const video = videoRef.current as WebkitVideo | null;
    try {
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
        bumpControls();
        return;
      }
      if (video.webkitPresentationMode === "picture-in-picture") {
        video.webkitSetPresentationMode?.("inline");
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
    } catch {
      // Soft-fail: keep the control available for a later gesture.
      try {
        const wk = video as WebkitVideo;
        if (typeof wk.webkitSetPresentationMode === "function") {
          wk.webkitSetPresentationMode("picture-in-picture");
          bumpControls();
          return;
        }
      } catch {
        /* ignore */
      }
    }
    bumpControls();
  }, [bumpControls, pipSupported, pipBlocked]);

  const handleShare = useCallback(() => {
    bumpControls();
    if (onShare) {
      onShare();
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(window.location.href);
    }
  }, [bumpControls, onShare]);

  const applyPlaybackRate = useCallback(
    (rate: number, opts?: { hint?: boolean; persist?: boolean }) => {
      const video = videoRef.current;
      if (video) video.playbackRate = rate;
      playbackRateRef.current = rate;
      setPlaybackRateState(rate);
      if (opts?.persist !== false) {
        saveCustomPlayerPrefs({ playbackRate: rate });
      }
      if (opts?.hint) {
        showGestureHint({
          label: rate === 1 ? "Normal" : `${rate}Ã—`,
          detail: "Speed",
        });
      }
      bumpControls();
    },
    [bumpControls, showGestureHint],
  );

  const nudgePlaybackRate = useCallback(
    (direction: 1 | -1) => {
      const speeds = CUSTOM_PLAYER_SPEEDS;
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
      saveCustomPlayerPrefs({ captionSize: size });
      bumpControls();
    },
    [bumpControls],
  );

  const applyCaptionPosition = useCallback(
    (position: CaptionPositionPref) => {
      setCaptionPosition(position);
      saveCustomPlayerPrefs({ captionPosition: position });
      bumpControls();
    },
    [bumpControls],
  );

  const startHoldSpeed = useCallback(() => {
    if (holdSpeedActiveRef.current) return;
    const video = videoRef.current;
    if (!video || video.paused) return;
    holdSpeedActiveRef.current = true;
    rateBeforeHoldRef.current = playbackRateRef.current || 1;
    video.playbackRate = HOLD_SPEED_RATE;
    showGestureHint({ label: `${HOLD_SPEED_RATE}Ã—`, detail: "Hold" });
  }, [showGestureHint]);

  const endHoldSpeed = useCallback(() => {
    if (!holdSpeedActiveRef.current) return;
    holdSpeedActiveRef.current = false;
    const restore = rateBeforeHoldRef.current || 1;
    const video = videoRef.current;
    if (video) video.playbackRate = restore;
    playbackRateRef.current = restore;
    setPlaybackRateState(restore);
    showGestureHint({
      label: restore === 1 ? "Normal" : `${restore}Ã—`,
      detail: "Speed",
    });
  }, [showGestureHint]);

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
      setMoreOpen(false);
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
      setMoreOpen(false);
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
      setMoreOpen(false);
      bumpControls();
    },
    [bumpControls],
  );

  const selectCaption = useCallback(
    (id: string | null) => {
      if (id) lastCaptionIdRef.current = id;
      setSelectedCaptionId(id);
      const label =
        id == null
          ? null
          : captionOptions.find((c) => c.id === id)?.label ?? null;
      saveCustomPlayerPrefs({
        captionsOn: id != null,
        captionLabel: label ?? loadCustomPlayerPrefs().captionLabel,
      });
      setMoreOpen(false);
      setCaptionsOpen(false);
      bumpControls();
    },
    [bumpControls, captionOptions],
  );

  const toggleCaptions = useCallback(() => {
    if (captionOptions.length === 0) return;
    if (selectedCaptionId) {
      selectCaption(null);
      return;
    }
    const preferred =
      (lastCaptionIdRef.current &&
        captionOptions.find((c) => c.id === lastCaptionIdRef.current)?.id) ||
      captionOptions.find((c) => c.isDefault)?.id ||
      captionOptions[0]?.id ||
      null;
    selectCaption(preferred);
  }, [captionOptions, selectCaption, selectedCaptionId]);

  const openCaptionsPicker = useCallback(() => {
    if (captionOptions.length <= 1) return;
    setCaptionsOpen(true);
    setMoreOpen(false);
    setVolumeOpen(false);
    bumpControls();
  }, [bumpControls, captionOptions.length]);

  const clearCaptionsLongPress = useCallback(() => {
    if (captionsLongPressRef.current) {
      clearTimeout(captionsLongPressRef.current);
      captionsLongPressRef.current = null;
    }
  }, []);

  const onCaptionsPointerDown = useCallback(() => {
    if (captionOptions.length <= 1) return;
    captionsLongPressFiredRef.current = false;
    clearCaptionsLongPress();
    captionsLongPressRef.current = setTimeout(() => {
      captionsLongPressFiredRef.current = true;
      captionsLongPressRef.current = null;
      openCaptionsPicker();
    }, LONG_PRESS_MS);
  }, [captionOptions.length, clearCaptionsLongPress, openCaptionsPicker]);

  const onCaptionsPointerUp = useCallback(() => {
    clearCaptionsLongPress();
  }, [clearCaptionsLongPress]);

  const onCaptionsClick = useCallback(() => {
    if (captionsLongPressFiredRef.current) {
      captionsLongPressFiredRef.current = false;
      return;
    }
    if (captionsOpen) {
      setCaptionsOpen(false);
      bumpControls();
      return;
    }
    toggleCaptions();
  }, [bumpControls, captionsOpen, toggleCaptions]);

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
      const next = nextCustomPlayerSpeed(playbackRateRef.current);
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
    if (!moreOpen && !captionsOpen) return;
    const menu = moreOpen
      ? moreMenuRef.current
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
        : captionsTriggerRef.current;
      (restore ?? previouslyFocused)?.focus?.({ preventScroll: true });
    };
  }, [moreOpen, captionsOpen]);

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
        showSeekFlash("left");
      } else if (x > third * 2) {
        seekBy(step);
        showSeekFlash("right");
      } else {
        void toggleFullscreen();
      }
    },
    [seekBy, showSeekFlash, toggleFullscreen],
  );

  const surfaceGestures = useSurfaceGestures({
    onSeekFlash: showSeekFlash,
    onSeekBy: (delta) => seekBy(delta),
    onToggleFullscreen: () => {
      void toggleFullscreen();
    },
    onSingleTap: () => {
      if (!controlsVisible && playing) {
        bumpControls();
        return;
      }
      togglePlay();
    },
    onVolumeDelta: (delta) => {
      const video = videoRef.current;
      const base = video ? (video.muted ? 0 : video.volume) : volume;
      setVolumeLevel(base + delta, { hint: true });
    },
    onBrightnessDelta: (delta) => {
      setBrightnessLevel(brightnessRef.current + delta, { hint: true });
    },
    onHoldSpeedStart: startHoldSpeed,
    onHoldSpeedEnd: endHoldSpeed,
    seekingActive: () => seekingRef.current,
    seekStep: seekStepSeconds || SEEK_STEP,
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
          showSeekFlash("left");
          break;
        case "ArrowRight":
        case "l":
        case "L":
          e.preventDefault();
          seekBy(e.shiftKey ? SEEK_STEP_FINE : step);
          showSeekFlash("right");
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
          toggleMute();
          break;
        case "c":
        case "C":
          if (captionOptions.length > 0) {
            e.preventDefault();
            toggleCaptions();
          }
          break;
        case "Escape":
          if (volumeOpen || moreOpen || captionsOpen) {
            e.preventDefault();
            closePopovers();
            bumpControls();
          } else if (isElementFullscreen(root)) {
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
    closePopovers,
    bumpControls,
    exitFullscreen,
    showSeekFlash,
    captionOptions,
    toggleCaptions,
    nudgePlaybackRate,
    seekToPercent,
  ]);

  const showMiniProgress =
    !chromeVisible &&
    effectivePlaying &&
    !playbackIssue &&
    effectiveDuration > 0 &&
    !casting;
  const cueStyle = {
    ["--ak-cue-size" as string]: captionSizeCss(captionSize),
    ["--ak-cue-bottom" as string]: captionPositionCss(captionPosition),
  };

  const progressRatio =
    effectiveDuration > 0 ? clamp(displayTime / effectiveDuration, 0, 1) : 0;
  const hoverSkip = hoverPreview
    ? segmentAtTime(skipSegments, hoverPreview.time)
    : undefined;
  const activeSkipInterval =
    activeSkip === "intro"
      ? skipTimes?.intro
      : activeSkip === "outro"
        ? skipTimes?.outro
        : undefined;
  const nearEnd = duration > 60 && currentTime >= duration - 90;
  const showNextEpisode =
    !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipStackClass = showNextEpisode
    ? "kitty-overlay--stacked"
    : "kitty-overlay--base";
  const showSpinner =
    !casting &&
    (sourceLoading || buffering) &&
    (playing || hasStarted || sourceLoading) &&
    !playbackIssue;
  const showCenterPlay =
    !casting &&
    !effectivePlaying &&
    !buffering &&
    !sourceLoading &&
    !playbackIssue;
  const activeServerQuality =
    serverQualities.find((q) => q.file === activeSrc || q.file === src) ?? null;

  const timeFromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = progressRef.current ?? e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return { time: ratio * effectiveDuration, ratio };
  };

  const onVolumeButtonClick = () => {
    bumpControls();
    setMoreOpen(false);
    setCaptionsOpen(false);
    if (prefersCoarsePointer()) {
      setVolumeOpen((v) => !v);
      return;
    }
    toggleMute();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={title ? `AniKitty player: ${title}` : "AniKitty player"}
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
      onMouseMove={bumpControls}
      onPointerDown={() => {
        rootRef.current?.focus({ preventScroll: true });
      }}
      onMouseLeave={() => {
        if (!seekingRef.current) setHoverPreview(null);
        if (effectivePlaying && !seekingRef.current) {
          clearIdleTimer();
          idleTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
            closePopovers();
          }, 700);
        }
      }}
      onTouchStart={bumpControls}
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

      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        controlsList="nodownload"
        className={cn(
          "h-full w-full object-contain anikitty-player-video",
          casting && "opacity-40",
        )}
        style={{ filter: `brightness(${brightness})` }}
        onClick={handleVideoClick}
        onDoubleClick={handleVideoDoubleClick}
        onPointerDown={surfaceGestures.onPointerDown}
        onPointerMove={surfaceGestures.onPointerMove}
        onPointerUp={surfaceGestures.onPointerUp}
        onPointerCancel={surfaceGestures.onPointerCancel}
      >
        {captionOptions.map((track) => (
          <track
            key={track.id}
            kind="subtitles"
            src={track.src}
            srcLang={track.language}
            label={track.label}
            default={preferSubtitles && track.id === selectedCaptionId}
          />
        ))}
      </video>

      {/* Casting handoff surface â€” sparse status, not a card stack */}
      {casting || castConnecting ? (
        <div
          className="pointer-events-none absolute inset-0 z-[15] flex flex-col items-center justify-center gap-2 bg-black/35"
          aria-hidden
        >
          <CastConnectedIcon className="h-10 w-10 text-white/90" />
          <p className="text-[13px] font-medium tracking-wide text-white">
            {castConnecting ? "Connectingâ€¦" : "Castingâ€¦"}
          </p>
          {castDeviceName ? (
            <p className="text-[11px] text-white/55">{castDeviceName}</p>
          ) : null}
        </div>
      ) : castLastError ? (
        <div
          className="pointer-events-none absolute inset-x-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[15] text-center"
          role="status"
        >
          <p className="mx-auto max-w-md text-[11px] leading-snug text-white/70">
            {castLastError}
          </p>
        </div>
      ) : null}

      {isOffline ? (
        <div
          role="status"
          className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 rounded-lg border border-amber-400/25 bg-zinc-950/95 px-3.5 py-2.5 text-left shadow-xl sm:inset-x-auto sm:left-3 sm:max-w-xs"
        >
          <p className="text-[12px] font-semibold tracking-wide text-white">
            You&apos;re offline
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-white/60">
            Playback may stall until the connection returns.
          </p>
        </div>
      ) : null}

      {playbackIssue ? (
        <div
          role="alert"
          className="absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-40 flex flex-col gap-2.5 rounded-lg border border-white/15 bg-zinc-950/95 px-3.5 py-3 text-left shadow-xl sm:inset-x-auto sm:right-3 sm:max-w-sm"
        >
          <div className="space-y-1">
            <p className="text-[12px] font-semibold tracking-wide text-white">
              Can&apos;t play this stream
            </p>
            <p className="text-[11px] leading-snug text-white/65">{playbackIssue}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const video = videoRef.current;
                const t = video?.currentTime ?? 0;
                if (t > 1) qualityResumeRef.current = t;
                mediaRetryRef.current = false;
                setPlaybackIssue(null);
                setAttachNonce((n) => n + 1);
              }}
              className="rounded-md border border-white/25 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-950 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => setPlaybackIssue(null)}
              className="rounded-md px-2.5 py-1.5 text-[11px] font-medium text-white/55 hover:text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* Double-click / double-tap seek flash (ArtPlayer-style) */}
      <div
        className={cn(
          "pointer-events-none absolute left-[12%] top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-300",
          seekFlash === "left"
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0",
        )}
        aria-hidden
      >
        <SeekBackIcon className="h-7 w-7" />
      </div>
      <div
        className={cn(
          "pointer-events-none absolute right-[12%] top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-300",
          seekFlash === "right"
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0",
        )}
        aria-hidden
      >
        <SeekForwardIcon className="h-7 w-7" />
      </div>

      {/* Center gesture hint (seek / volume / brightness / speed) */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-[42%] z-30 -translate-x-1/2 -translate-y-1/2 transition-all duration-200",
          gestureHint
            ? "scale-100 opacity-100"
            : "scale-95 opacity-0",
        )}
        aria-hidden
      >
        <div className="min-w-[4.5rem] rounded-md border border-white/10 bg-zinc-950/95 px-3.5 py-2 text-center shadow-lg">
          <p className="text-[13px] font-semibold tabular-nums tracking-wide text-white">
            {gestureHint?.label}
          </p>
          {gestureHint?.detail ? (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/45">
              {gestureHint.detail}
            </p>
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
              : "Buffering"
            : undefined
        }
      >
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              "h-11 w-11 rounded-full border-2 border-white/25 border-t-white",
              !reduceMotion && "animate-spin",
            )}
          />
          {sourceLoading && !hasStarted && !playbackIssue ? (
            <span className="text-[11px] font-medium tracking-wide text-white/70">
              Loading streamâ€¦
            </span>
          ) : buffering && hasStarted ? (
            <span className="text-[11px] font-medium tracking-wide text-white/55">
              Bufferingâ€¦
            </span>
          ) : null}
        </div>
      </div>

      {/* Center play overlay â€” smooth scale-in when paused */}
      <button
        type="button"
        aria-label="Play"
        onClick={togglePlay}
        className={cn(
          "absolute left-1/2 top-1/2 z-20 flex h-[4.75rem] w-[4.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.15rem] border border-white/35 bg-black/50 text-white backdrop-blur-[2px]",
          "transition-[opacity,transform] duration-300 ease-out",
          "hover:bg-black/60 hover:border-white/45",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          "sm:h-[4.5rem] sm:w-[4.5rem]",
          showCenterPlay
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <PlayOutlineIcon className="h-8 w-8 translate-x-0.5" />
      </button>

      {/* Next episode + skip intro/outro overlays */}
      {showNextEpisode && nextEpisode ? (
        <NextEpisodeButton
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          stackClass="kitty-overlay--base"
          onClick={() => onNextEpisodeRef.current?.()}
        />
      ) : null}
      {activeSkip && activeSkipInterval && countdown === null ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            seekTo(activeSkipInterval.end);
            setActiveSkip(null);
          }}
          className={cn(
            "absolute z-40 rounded-md border border-white/35 bg-white px-3.5 py-2",
            "text-[12px] font-semibold tracking-wide text-zinc-950 shadow-lg",
            "transition-[transform,opacity,background-color] duration-200",
            "hover:bg-white/95 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
            "right-[max(0.75rem,env(safe-area-inset-right))]",
            skipStackClass === "kitty-overlay--stacked"
              ? "bottom-[7.25rem] sm:bottom-[6.75rem]"
              : "bottom-[4.85rem] sm:bottom-[4.35rem]",
            "animate-in fade-in zoom-in-95",
          )}
        >
          {activeSkip === "intro" ? "Skip Intro" : "Skip Credits"}
        </button>
      ) : null}
      {countdown !== null && nextEpisode ? (
        <CountdownOverlay
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          countdown={countdown}
          onSkip={() => onNextEpisodeRef.current?.()}
          onCancel={() => setCountdown(null)}
        />
      ) : null}

      {/* Netflix-style mini progress while chrome is hidden */}
      {showMiniProgress ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] bg-white/15"
          aria-hidden
        >
          <div
            className="h-full origin-left bg-white/85"
            style={{ transform: `scaleX(${progressRatio})` }}
          />
        </div>
      ) : null}

      {/* Bottom chrome â€” sparse ArtPlayer-like bar */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ease-out",
          chromeVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto bg-gradient-to-t from-black/70 via-black/45 to-transparent pt-6",
            !chromeVisible && "pointer-events-none",
          )}
        >
          <div
            className={cn(
              "w-full min-w-0 bg-black/35 backdrop-blur-md",
              "pb-[max(0.35rem,env(safe-area-inset-bottom))] pl-[max(0px,env(safe-area-inset-left))] pr-[max(0px,env(safe-area-inset-right))]",
            )}
          >
            {/* Progress â€” full content width; tall touch target; thin visual line */}
            <div
              ref={progressRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.floor(effectiveDuration) || 0}
              aria-valuenow={Math.floor(displayTime)}
              aria-valuetext={`${formatPlayerTime(displayTime)} of ${formatPlayerTime(effectiveDuration)}`}
              tabIndex={0}
              className="group/seek relative h-6 w-full min-w-0 cursor-pointer touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 sm:h-3.5"
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                seekingRef.current = true;
                setSeeking(true);
                bumpControls();
                const { time, ratio } = timeFromPointer(e);
                setSeekPreview(time);
                setHoverPreview({ time, ratio });
                seekTo(time, { smooth: true });
              }}
              onPointerMove={(e) => {
                if (seekingRef.current) e.preventDefault();
                const { time, ratio } = timeFromPointer(e);
                if (seekingRef.current) {
                  setSeekPreview(time);
                  setHoverPreview({ time, ratio });
                  seekTo(time, { smooth: true });
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
                setSeeking(false);
                setSeekPreview(null);
                if (e.pointerType !== "mouse") setHoverPreview(null);
                bumpControls();
              }}
              onPointerCancel={() => {
                seekingRef.current = false;
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
                Avoid translateY on the track itself â€” % widths / scaleX fills
                inside transformed parents are unreliable on mobile Firefox.
                Center with top + margin instead; use scaleX for played/buffered.
              */}
              <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-[3px] w-full -mt-[1.5px] bg-white/22 sm:h-[2px] sm:-mt-px group-hover/seek:h-[4px] group-hover/seek:-mt-0.5">
                {/* Buffered ranges â€” subtle ahead-of-playhead fill */}
                {effectiveDuration > 0 && !casting
                  ? bufferedRanges.map((range, i) => {
                      const left = (range.start / effectiveDuration) * 100;
                      const width =
                        ((range.end - range.start) / effectiveDuration) * 100;
                      return (
                        <div
                          key={`${range.start}-${range.end}-${i}`}
                          aria-hidden
                          className="absolute inset-y-0 z-[1] bg-white/45"
                          style={{
                            left: `${left}%`,
                            width: `${Math.max(width, 0)}%`,
                          }}
                        />
                      );
                    })
                  : null}
                <div
                  className="absolute inset-y-0 left-0 z-[2] w-full origin-left bg-white"
                  style={{ transform: `scaleX(${progressRatio})` }}
                />
                {/* Skip boundary ticks â€” thin notches at intro/outro start & end */}
                {effectiveDuration > 0
                  ? skipSegments.flatMap((seg) =>
                      (
                        [
                          { key: `${seg.kind}-start`, at: seg.start },
                          { key: `${seg.kind}-end`, at: seg.end },
                        ] as const
                      ).map(({ key, at }) => (
                        <div
                          key={key}
                          title={seg.kind === "intro" ? "Intro" : "Outro"}
                          aria-hidden
                          className={cn(
                            "absolute top-1/2 z-[3] w-px -translate-x-1/2 -translate-y-1/2",
                            "h-[7px] bg-white/90 shadow-[0_0_0_0.5px_rgba(0,0,0,0.35)]",
                            "group-hover/seek:h-[9px]",
                          )}
                          style={{ left: `${(at / effectiveDuration) * 100}%` }}
                        />
                      )),
                    )
                  : null}
              </div>
              {/* Scrub knob â€” outside overflow:hidden track so it stays visible */}
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 z-[3] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity",
                  seeking || hoverPreview
                    ? "opacity-100"
                    : "opacity-0 group-hover/seek:opacity-100",
                )}
                style={{ left: `${progressRatio * 100}%` }}
              />
            </div>

            <div className="flex w-full min-w-0 items-center gap-0.5 px-1.5 py-1.5 sm:gap-1 sm:px-3 sm:py-2.5">
              {/* Left cluster */}
              <div className="flex min-w-0 shrink items-center gap-0 sm:gap-1">
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
                >
                  {effectivePlaying ? (
                    <PauseIcon className="h-[18px] w-[18px]" />
                  ) : (
                    <PlayIcon className="h-[17px] w-[17px] translate-x-px" />
                  )}
                </IconButton>
                <IconButton
                  label="Seek back"
                  onClick={() => {
                    seekBy(-(seekStepSeconds || SEEK_STEP));
                    showSeekFlash("left");
                  }}
                >
                  <SeekBackIcon className="h-5 w-5" />
                </IconButton>
                <IconButton
                  label="Seek forward"
                  onClick={() => {
                    seekBy(seekStepSeconds || SEEK_STEP);
                    showSeekFlash("right");
                  }}
                >
                  <SeekForwardIcon className="h-5 w-5" />
                </IconButton>

                <span
                  className="ml-0.5 select-none whitespace-nowrap text-[11px] tabular-nums tracking-wide text-white/90 sm:ml-2.5 sm:text-[13px]"
                  aria-hidden
                >
                  {formatPlayerTime(displayTime)}
                  <span className="inline-block w-2 sm:w-3.5" />
                  {formatPlayerTime(effectiveDuration)}
                </span>
              </div>

              <div className="min-w-2 flex-1 sm:min-w-3" />

              {/* Right cluster â€” CC Â· Cast Â· volume (sm+) Â· more Â· fullscreen */}
              <div className="flex shrink-0 items-center gap-0 sm:gap-1">
                {showCaptionsMenu ? (
                  <div className="relative">
                    <IconButton
                      buttonRef={captionsTriggerRef}
                      label={
                        selectedCaptionId
                          ? `Subtitles on (${captionOptions.find((c) => c.id === selectedCaptionId)?.label ?? "on"}). Long-press to choose track`
                          : "Subtitles off"
                      }
                      ariaExpanded={captionsOpen}
                      ariaHasPopup="menu"
                      ariaPressed={Boolean(selectedCaptionId)}
                      onClick={onCaptionsClick}
                      onPointerDown={onCaptionsPointerDown}
                      onPointerUp={onCaptionsPointerUp}
                      onPointerCancel={onCaptionsPointerUp}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        if (captionOptions.length > 1) openCaptionsPicker();
                      }}
                      className={cn(
                        !selectedCaptionId && "text-white/45 hover:text-white/80",
                      )}
                    >
                      <CaptionsIcon className="h-[18px] w-[18px]" />
                    </IconButton>
                    {captionsOpen && captionOptions.length > 1 ? (
                      <div
                        ref={captionsMenuRef}
                        role="menu"
                        aria-label="Caption tracks"
                        className="absolute bottom-full right-0 z-50 mb-2 max-h-[min(50vh,280px)] min-w-[148px] overflow-y-auto rounded-md border border-white/10 bg-zinc-950 py-1 text-xs text-white shadow-lg"
                      >
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
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {castAvailable ? (
                  <IconButton
                    label={
                      casting
                        ? castDeviceName
                          ? `Stop casting (${castDeviceName})`
                          : "Stop casting"
                        : castConnecting
                          ? "Connectingâ€¦"
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

                <div
                  className="relative hidden sm:block"
                  onMouseEnter={() => {
                    if (!prefersCoarsePointer()) setVolumeOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (!prefersCoarsePointer()) setVolumeOpen(false);
                  }}
                >
                  <IconButton
                    label={effectiveMuted ? "Unmute" : "Mute"}
                    onClick={onVolumeButtonClick}
                  >
                    {effectiveMuted ? (
                      <VolumeMuteIcon className="h-[18px] w-[18px]" />
                    ) : effectiveVolume < 0.5 ? (
                      <VolumeLowIcon className="h-[18px] w-[18px]" />
                    ) : (
                      <VolumeIcon className="h-[18px] w-[18px]" />
                    )}
                  </IconButton>
                  {volumeOpen && (
                    <VerticalSliderPopover
                      label="Volume"
                      min={0}
                      max={1}
                      step={0.01}
                      value={effectiveVolume}
                      display={`${Math.round(effectiveVolume * 100)}%`}
                      onChange={(v) => setVolumeLevel(v, { hint: true })}
                      footer={
                        iosVolumeLocked && !casting
                          ? "iOS uses system volume"
                          : casting
                            ? "Cast volume"
                            : undefined
                      }
                    />
                  )}
                </div>

                <div className="relative">
                  <IconButton
                    buttonRef={moreTriggerRef}
                    label="More options"
                    ariaExpanded={moreOpen}
                    ariaHasPopup="menu"
                    onClick={() => {
                      setMoreOpen((v) => !v);
                      setVolumeOpen(false);
                      setCaptionsOpen(false);
                      bumpControls();
                    }}
                  >
                    <MoreIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                  {moreOpen && (
                    <div
                      ref={moreMenuRef}
                      role="menu"
                      aria-label="Player options"
                      className="absolute bottom-full right-0 z-50 mb-2 max-h-[min(70vh,420px)] min-w-[176px] overflow-y-auto rounded-md border border-white/10 bg-zinc-950 py-1 text-xs text-white shadow-lg"
                    >
                      <MenuSection title="Speed">
                        {CUSTOM_PLAYER_SPEEDS.map((rate) => (
                          <MenuItem
                            key={rate}
                            active={playbackRate === rate}
                            onClick={() => applyPlaybackRate(rate, { hint: true })}
                          >
                            {rate === 1 ? "Normal" : `${rate}Ã—`}
                          </MenuItem>
                        ))}
                      </MenuSection>

                      <MenuSection title="Volume" className="sm:hidden">
                        <MenuItem
                          active={!effectiveMuted}
                          onClick={() => {
                            toggleMute();
                            setMoreOpen(false);
                          }}
                        >
                          {effectiveMuted ? "Unmute" : "Mute"}
                        </MenuItem>
                      </MenuSection>

                      <MenuSection title="Brightness">
                        {[
                          { label: "Dim", value: 0.7 },
                          { label: "Normal", value: 1 },
                          { label: "Bright", value: 1.35 },
                        ].map((opt) => (
                          <MenuItem
                            key={opt.label}
                            active={Math.abs(brightness - opt.value) < 0.05}
                            onClick={() => {
                              setBrightnessLevel(opt.value, { hint: true });
                              setMoreOpen(false);
                            }}
                          >
                            {opt.label}
                          </MenuItem>
                        ))}
                      </MenuSection>

                      {pipSupported && !pipBlocked ? (
                        <MenuSection title="Display">
                          <MenuItem
                            active={inPip}
                            onClick={() => {
                              void togglePip();
                              setMoreOpen(false);
                            }}
                          >
                            {inPip ? "Exit picture-in-picture" : "Picture-in-picture"}
                          </MenuItem>
                        </MenuSection>
                      ) : null}

                      {serverQualities.length > 1 ? (
                        <MenuSection title="Quality">
                          {serverQualities.map((entry) => (
                            <MenuItem
                              key={entry.file}
                              active={activeSrc === entry.file}
                              onClick={() => selectServerQuality(entry)}
                            >
                              {formatStreamQualityLabel(entry.quality)}
                            </MenuItem>
                          ))}
                        </MenuSection>
                      ) : null}

                      {showHlsQualityMenu ? (
                        <MenuSection title="Quality">
                          <MenuItem
                            active={hlsLevelIndex < 0}
                            onClick={() => selectHlsLevel(-1)}
                          >
                            Auto
                          </MenuItem>
                          {[...hlsLevels]
                            .sort(
                              (a, b) => (b.height ?? 0) - (a.height ?? 0),
                            )
                            .map((level) => (
                              <MenuItem
                                key={level.index}
                                active={hlsLevelIndex === level.index}
                                onClick={() => selectHlsLevel(level.index)}
                              >
                                {level.label}
                              </MenuItem>
                            ))}
                        </MenuSection>
                      ) : null}

                      {showCaptionsMenu ? (
                        <MenuSection title="Captions">
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
                      ) : null}

                      {showCaptionsMenu ? (
                        <MenuSection title="Caption size">
                          {(
                            [
                              { label: "Small", value: "sm" },
                              { label: "Medium", value: "md" },
                              { label: "Large", value: "lg" },
                            ] as const
                          ).map((opt) => (
                            <MenuItem
                              key={opt.value}
                              active={captionSize === opt.value}
                              onClick={() => {
                                applyCaptionSize(opt.value);
                                setMoreOpen(false);
                              }}
                            >
                              {opt.label}
                            </MenuItem>
                          ))}
                        </MenuSection>
                      ) : null}

                      {showCaptionsMenu ? (
                        <MenuSection title="Caption position">
                          {(
                            [
                              { label: "Low", value: "low" },
                              { label: "Mid", value: "mid" },
                              { label: "High", value: "high" },
                            ] as const
                          ).map((opt) => (
                            <MenuItem
                              key={opt.value}
                              active={captionPosition === opt.value}
                              onClick={() => {
                                applyCaptionPosition(opt.value);
                                setMoreOpen(false);
                              }}
                            >
                              {opt.label}
                            </MenuItem>
                          ))}
                        </MenuSection>
                      ) : null}

                      {showAudioMenu ? (
                        <MenuSection title="Audio">
                          {hlsAudioOptions.map((track) => (
                            <MenuItem
                              key={track.index}
                              active={hlsAudioIndex === track.index}
                              onClick={() => selectHlsAudio(track.index)}
                            >
                              {track.label}
                            </MenuItem>
                          ))}
                        </MenuSection>
                      ) : null}

                      <MenuSection title="Share">
                        <MenuItem
                          onClick={() => {
                            handleShare();
                            setMoreOpen(false);
                          }}
                        >
                          Share
                        </MenuItem>
                      </MenuSection>

                      {activeServerQuality ||
                      (showHlsQualityMenu && hlsLevelIndex >= 0) ? (
                        <p className="border-t border-white/10 px-3 py-2 text-[10px] text-white/45">
                          {activeServerQuality
                            ? formatStreamQualityLabel(
                                activeServerQuality.quality,
                              )
                            : hlsLevels.find((l) => l.index === hlsLevelIndex)
                                ?.label}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <IconButton
                  label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => void toggleFullscreen()}
                >
                  {fullscreen ? (
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
export const CustomVideoPlayer = AniKittyPlayer;
