"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Hls from "hls.js";

import { cn } from "@/lib/core/utils";
import { createHlsConfig } from "@/lib/kitty/hls-config";
import {
  createHtmlVideoPlayerController,
  type PlayerController,
} from "@/lib/player/player-controller";

import {
  BrightnessIcon,
  Forward10Icon,
  FullscreenExitIcon,
  FullscreenIcon,
  MoreIcon,
  PauseIcon,
  PipIcon,
  PlayIcon,
  PlayOutlineIcon,
  Rewind10Icon,
  ShareIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "./icons";
import { clamp, formatPlayerTime } from "./utils";

const SEEK_STEP = 10;
const SEEK_STEP_FINE = 5;
const IDLE_MS = 2800;
const CLICK_DELAY_MS = 280;
const SEEK_FLASH_MS = 700;

function looksLikeHls(url: string): boolean {
  return /\.m3u8(?:\?|$)/i.test(url) || url.includes("/api/kitty/hls");
}

function prefersCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export type CustomVideoPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  className?: string;
  /** Resume / deep-link start position (seconds). */
  startTime?: number;
  /** Called when share is clicked (stub by default). */
  onShare?: () => void;
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onEnded?: () => void;
  onFatalError?: (info: { type: string; details?: string; status?: number }) => void;
  onPlayerReady?: (player: PlayerController) => void;
  /** Optional copy for the HLS / decode failure banner. */
  playbackIssueHint?: string;
  /** Shown with the issue banner so users can leave custom mode. */
  onUseClassicPlayer?: () => void;
  useClassicLabel?: string;
};

export function CustomVideoPlayer({
  src,
  poster,
  title,
  className,
  startTime = 0,
  onShare,
  onStart,
  onProgress,
  onLiveTime,
  onEnded,
  onFatalError,
  onPlayerReady,
  playbackIssueHint,
  onUseClassicPlayer,
  useClassicLabel = "Use classic player",
}: CustomVideoPlayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekingRef = useRef(false);
  const startAppliedRef = useRef(false);
  const startedRef = useRef(false);
  const lastProgressTsRef = useRef(0);
  const volumeBeforeMuteRef = useRef(1);
  const onLiveTimeRef = useRef(onLiveTime);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onStartRef = useRef(onStart);
  const onFatalErrorRef = useRef(onFatalError);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const startTimeRef = useRef(startTime);

  onLiveTimeRef.current = onLiveTime;
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onStartRef.current = onStart;
  onFatalErrorRef.current = onFatalError;
  onPlayerReadyRef.current = onPlayerReady;
  startTimeRef.current = startTime;

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [inPip, setInPip] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [brightnessOpen, setBrightnessOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [seeking, setSeeking] = useState(false);
  const [seekPreview, setSeekPreview] = useState<number | null>(null);
  const [hoverPreview, setHoverPreview] = useState<{
    time: number;
    ratio: number;
  } | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [seekFlash, setSeekFlash] = useState<"left" | "right" | null>(null);
  const [playbackIssue, setPlaybackIssue] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState(1);

  const displayTime = seekPreview ?? currentTime;
  const chromeVisible = controlsVisible || seeking || !playing;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const closePopovers = useCallback(() => {
    setVolumeOpen(false);
    setBrightnessOpen(false);
    setMoreOpen(false);
  }, []);

  const bumpControls = useCallback(() => {
    setControlsVisible(true);
    clearIdleTimer();
    const video = videoRef.current;
    if (!video || video.paused || seekingRef.current) return;
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setPipSupported(
      typeof document !== "undefined" &&
        "pictureInPictureEnabled" in document &&
        Boolean(document.pictureInPictureEnabled) &&
        typeof video.requestPictureInPicture === "function",
    );

    onPlayerReadyRef.current?.(
      createHtmlVideoPlayerController(video, rootRef.current),
    );

    const applyStartTime = () => {
      if (startAppliedRef.current) return;
      const t = startTimeRef.current;
      if (t > 10 && Number.isFinite(t)) {
        video.currentTime = t;
        startAppliedRef.current = true;
      }
    };

    const onPlay = () => {
      setPlaying(true);
      setHasStarted(true);
      setBuffering(false);
      bumpControls();
      if (!startedRef.current) {
        startedRef.current = true;
        onStartRef.current?.();
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
    };
    const onDuration = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
      applyStartTime();
    };
    const onBufProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onVolume = () => {
      setVolume(video.volume);
      setMuted(video.muted);
      if (video.volume > 0 && !video.muted) {
        volumeBeforeMuteRef.current = video.volume;
      }
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onCanPlay = () => setBuffering(false);
    const onSeeking = () => setBuffering(true);
    const onSeeked = () => {
      if (!video.paused && video.readyState >= 3) setBuffering(false);
    };
    const onEnterPip = () => setInPip(true);
    const onLeavePip = () => setInPip(false);
    const onFsChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };
    const onVideoEnded = () => {
      onEndedRef.current?.();
    };
    const onNativeError = () => {
      // HLS path reports via hls.js; ignore empty-src teardown noise.
      if (!video.src && !video.currentSrc) return;
      if (looksLikeHls(src) && Hls.isSupported()) return;
      setPlaybackIssue(
        playbackIssueHint ??
          "This stream could not play in the custom player. Switch back to Classic for full HLS support.",
      );
      onFatalErrorRef.current?.({
        type: "media",
        details: video.error?.message ?? "media-error",
        status: video.error?.code,
      });
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
    document.addEventListener("fullscreenchange", onFsChange);

    return () => {
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
      document.removeEventListener("fullscreenchange", onFsChange);
      clearIdleTimer();
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      if (seekFlashTimerRef.current) clearTimeout(seekFlashTimerRef.current);
    };
  }, [bumpControls, clearIdleTimer, src, playbackIssueHint]);

  // Attach progressive / HLS source (native Safari HLS, else hls.js when available).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;
    let cancelled = false;
    let networkRecoveries = 0;
    let mediaRecoveries = 0;
    startAppliedRef.current = false;
    startedRef.current = false;
    setPlaybackIssue(null);
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    setHasStarted(false);
    setBuffering(true);

    const fail = (type: string, details?: string, status?: number) => {
      if (cancelled) return;
      setPlaybackIssue(
        playbackIssueHint ??
          "This stream could not play in the custom player. Switch back to Classic for full HLS support.",
      );
      onFatalErrorRef.current?.({ type, details, status });
    };

    const isHls = looksLikeHls(src);
    const canNativeHls = Boolean(
      video.canPlayType("application/vnd.apple.mpegurl") ||
        video.canPlayType("application/x-mpegURL"),
    );

    if (isHls && !canNativeHls) {
      if (!Hls.isSupported()) {
        fail("hls-unsupported", "Browser cannot play HLS");
        return;
      }
      hls = new Hls(createHlsConfig());
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        setBuffering(false);
        const t = startTimeRef.current;
        if (t > 10) {
          video.currentTime = t;
          startAppliedRef.current = true;
        }
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled) return;
        const status = (data.response as { code?: number } | undefined)?.code;
        if (status === 401 || status === 403) {
          fail("hls-auth", data.details, status);
          hls?.destroy();
          hls = null;
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
        fail("hls", data.details, status);
        hls?.destroy();
        hls = null;
      });
    } else {
      video.src = src;
      const onLoaded = () => setBuffering(false);
      video.addEventListener("loadeddata", onLoaded, { once: true });
    }

    return () => {
      cancelled = true;
      hls?.destroy();
      hls = null;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, playbackIssueHint]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
    bumpControls();
  }, [bumpControls]);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(
        video.currentTime + delta,
        0,
        Number.isFinite(video.duration) ? video.duration : video.currentTime + delta,
      );
      video.currentTime = next;
      setCurrentTime(next);
      bumpControls();
    },
    [bumpControls],
  );

  const seekTo = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(time, 0, duration || video.duration || 0);
      video.currentTime = next;
      setCurrentTime(next);
      bumpControls();
    },
    [bumpControls, duration],
  );

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      video.muted = false;
      video.volume = volumeBeforeMuteRef.current || 1;
    } else {
      volumeBeforeMuteRef.current = video.volume || 1;
      video.muted = true;
    }
    bumpControls();
  }, [bumpControls]);

  const setVolumeLevel = useCallback(
    (level: number) => {
      const video = videoRef.current;
      if (!video) return;
      const next = clamp(level, 0, 1);
      video.volume = next;
      video.muted = next === 0;
      if (next > 0) volumeBeforeMuteRef.current = next;
      bumpControls();
    },
    [bumpControls],
  );

  const toggleFullscreen = useCallback(async () => {
    const root = rootRef.current;
    if (!root) return;
    try {
      if (!document.fullscreenElement) {
        await root.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* browser may deny fullscreen without gesture */
    }
    bumpControls();
  }, [bumpControls]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    bumpControls();
  }, [bumpControls]);

  const togglePip = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !pipSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch {
      /* unsupported or denied */
    }
    bumpControls();
  }, [bumpControls, pipSupported]);

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
    (rate: number) => {
      const video = videoRef.current;
      if (video) video.playbackRate = rate;
      setPlaybackRateState(rate);
      setMoreOpen(false);
      bumpControls();
    },
    [bumpControls],
  );

  const handleVideoClick = useCallback(() => {
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
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) {
        seekBy(-SEEK_STEP);
        showSeekFlash("left");
      } else if (x > third * 2) {
        seekBy(SEEK_STEP);
        showSeekFlash("right");
      } else {
        void toggleFullscreen();
      }
    },
    [seekBy, showSeekFlash, toggleFullscreen],
  );

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
      const isFs = document.fullscreenElement === root;
      if (!focusedInPlayer && !hovered && !isFs && active !== document.body) {
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
          e.preventDefault();
          seekBy(e.shiftKey ? -SEEK_STEP_FINE : -SEEK_STEP);
          showSeekFlash("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(e.shiftKey ? SEEK_STEP_FINE : SEEK_STEP);
          showSeekFlash("right");
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeOpen(true);
          setVolumeLevel((videoRef.current?.muted ? 0 : volume) + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeOpen(true);
          setVolumeLevel((videoRef.current?.muted ? 0 : volume) - 0.05);
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
        case "Escape":
          if (volumeOpen || brightnessOpen || moreOpen) {
            e.preventDefault();
            closePopovers();
            bumpControls();
          } else if (document.fullscreenElement === root) {
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
    brightnessOpen,
    moreOpen,
    closePopovers,
    bumpControls,
    exitFullscreen,
    showSeekFlash,
  ]);

  const progressRatio = duration > 0 ? displayTime / duration : 0;
  const bufferedRatio = duration > 0 ? buffered / duration : 0;
  const showSpinner = buffering && (playing || hasStarted) && !playbackIssue;
  const showCenterPlay = !playing && !buffering;

  const timeFromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = progressRef.current ?? e.currentTarget;
    const rect = el.getBoundingClientRect();
    const ratio = clamp((e.clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    return { time: ratio * duration, ratio };
  };

  const onVolumeButtonClick = () => {
    bumpControls();
    setBrightnessOpen(false);
    setMoreOpen(false);
    if (prefersCoarsePointer()) {
      setVolumeOpen((v) => !v);
      return;
    }
    toggleMute();
  };

  const onBrightnessButtonClick = () => {
    setBrightnessOpen((v) => !v);
    setVolumeOpen(false);
    setMoreOpen(false);
    bumpControls();
  };

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="region"
      aria-label={title ? `Video player: ${title}` : "Video player"}
      className={cn(
        "group/player relative aspect-video w-full overflow-hidden rounded-lg bg-black outline-none",
        "focus-visible:ring-2 focus-visible:ring-white/40",
        chromeVisible ? "cursor-auto" : "cursor-none",
        className,
      )}
      onMouseMove={bumpControls}
      onPointerDown={() => {
        rootRef.current?.focus({ preventScroll: true });
      }}
      onMouseLeave={() => {
        if (!seekingRef.current) setHoverPreview(null);
        if (playing && !seekingRef.current) {
          clearIdleTimer();
          idleTimerRef.current = setTimeout(() => {
            setControlsVisible(false);
            closePopovers();
          }, 700);
        }
      }}
      onTouchStart={bumpControls}
    >
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        style={{ filter: `brightness(${brightness})` }}
        onClick={handleVideoClick}
        onDoubleClick={handleVideoDoubleClick}
      />

      {playbackIssue ? (
        <div className="absolute inset-x-3 top-3 z-40 flex flex-col gap-2 rounded-lg border border-amber-400/30 bg-black/85 px-3 py-2.5 text-left shadow-lg backdrop-blur-md sm:inset-x-auto sm:right-3 sm:max-w-sm">
          <p className="text-[11px] leading-snug text-amber-100/90">{playbackIssue}</p>
          {onUseClassicPlayer ? (
            <button
              type="button"
              onClick={onUseClassicPlayer}
              className="self-start rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/15"
            >
              {useClassicLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Double-click seek flash (ArtPlayer-style) */}
      <div
        className={cn(
          "pointer-events-none absolute left-[12%] top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-all duration-300",
          seekFlash === "left"
            ? "scale-100 opacity-100"
            : "scale-75 opacity-0",
        )}
        aria-hidden
      >
        <Rewind10Icon className="h-8 w-8" />
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
        <Forward10Icon className="h-8 w-8" />
      </div>

      {/* Buffering spinner */}
      <div
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200",
          showSpinner ? "opacity-100" : "opacity-0",
        )}
        aria-hidden={!showSpinner}
        role={showSpinner ? "status" : undefined}
        aria-label={showSpinner ? "Loading" : undefined}
      >
        <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      </div>

      {/* Center play overlay — smooth scale-in when paused */}
      <button
        type="button"
        aria-label="Play"
        onClick={togglePlay}
        className={cn(
          "absolute left-1/2 top-1/2 z-20 flex h-[4.75rem] w-[4.75rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[1.15rem] border border-white/35 bg-black/50 text-white backdrop-blur-[2px]",
          "transition-[opacity,transform] duration-300 ease-out",
          "hover:bg-black/60 hover:border-white/45",
          "sm:h-[4.5rem] sm:w-[4.5rem]",
          showCenterPlay
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-90 opacity-0",
        )}
      >
        <PlayOutlineIcon className="h-8 w-8 translate-x-0.5" />
      </button>

      {/* Share (top-right) */}
      <button
        type="button"
        aria-label="Share"
        onClick={handleShare}
        className={cn(
          "absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center text-white/85 transition-[opacity,transform] duration-300 hover:text-white sm:right-3.5 sm:top-3.5 sm:h-8 sm:w-8",
          chromeVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <ShareIcon className="h-[18px] w-[18px]" />
      </button>

      {/* Bottom chrome — sparse ArtPlayer-like bar */}
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
          <div className="bg-black/35 backdrop-blur-md">
            {/* Progress — tall touch target, thin visual line + hover tooltip */}
            <div
              ref={progressRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.floor(duration) || 0}
              aria-valuenow={Math.floor(displayTime)}
              tabIndex={0}
              className="group/seek relative h-5 cursor-pointer touch-none sm:h-3.5"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                seekingRef.current = true;
                setSeeking(true);
                bumpControls();
                const { time, ratio } = timeFromPointer(e);
                setSeekPreview(time);
                setHoverPreview({ time, ratio });
                seekTo(time);
              }}
              onPointerMove={(e) => {
                const { time, ratio } = timeFromPointer(e);
                if (seekingRef.current) {
                  setSeekPreview(time);
                  setHoverPreview({ time, ratio });
                  seekTo(time);
                  return;
                }
                // Desktop hover scrub preview
                if (e.pointerType === "mouse" && duration > 0) {
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
              {(hoverPreview || seeking) && duration > 0 ? (
                <div
                  className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-[10px] tabular-nums text-white shadow-md"
                  style={{
                    left: `${((hoverPreview?.ratio ?? progressRatio) * 100).toFixed(2)}%`,
                  }}
                >
                  {formatPlayerTime(hoverPreview?.time ?? displayTime)}
                </div>
              ) : null}
              <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-white/28 transition-[height] group-hover/seek:h-[4px] sm:h-[2px]">
                <div
                  className="absolute inset-y-0 left-0 bg-white/40"
                  style={{ width: `${bufferedRatio * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-white"
                  style={{ width: `${progressRatio * 100}%` }}
                />
                {/* Scrub knob — visible while dragging / hovering */}
                <div
                  className={cn(
                    "absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow transition-opacity",
                    seeking || hoverPreview
                      ? "opacity-100"
                      : "opacity-0 group-hover/seek:opacity-100",
                  )}
                  style={{ left: `${progressRatio * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-0.5 px-2 py-2.5 sm:gap-1 sm:px-4 sm:py-3">
              {/* Left cluster */}
              <div className="flex items-center gap-0 sm:gap-1.5">
                <IconButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
                  {playing ? (
                    <PauseIcon className="h-[18px] w-[18px]" />
                  ) : (
                    <PlayIcon className="h-[17px] w-[17px] translate-x-px" />
                  )}
                </IconButton>
                <IconButton
                  label="Rewind 10 seconds"
                  onClick={() => {
                    seekBy(-SEEK_STEP);
                    showSeekFlash("left");
                  }}
                >
                  <Rewind10Icon className="h-[22px] w-[22px]" />
                </IconButton>
                <IconButton
                  label="Forward 10 seconds"
                  onClick={() => {
                    seekBy(SEEK_STEP);
                    showSeekFlash("right");
                  }}
                >
                  <Forward10Icon className="h-[22px] w-[22px]" />
                </IconButton>

                <span className="ml-1 select-none whitespace-nowrap text-[12px] tabular-nums tracking-wide text-white/90 sm:ml-2.5 sm:text-[13px]">
                  {formatPlayerTime(displayTime)}
                  <span className="inline-block w-2.5 sm:w-3.5" aria-hidden />
                  {formatPlayerTime(duration)}
                </span>
              </div>

              <div className="flex-1" />

              {/* Right cluster */}
              <div className="flex items-center gap-0 sm:gap-1.5">
                <div className="relative">
                  <IconButton
                    label="More"
                    onClick={() => {
                      setMoreOpen((v) => !v);
                      setVolumeOpen(false);
                      setBrightnessOpen(false);
                      bumpControls();
                    }}
                  >
                    <MoreIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                  {moreOpen && (
                    <div className="absolute bottom-full right-0 mb-2 min-w-[148px] rounded-md border border-white/10 bg-black/90 py-1 text-xs text-white shadow-lg backdrop-blur-md">
                      {[1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          className={cn(
                            "block w-full px-3 py-2.5 text-left hover:bg-white/10 sm:py-2",
                            playbackRate === rate && "bg-white/10 font-medium",
                          )}
                          onClick={() => applyPlaybackRate(rate)}
                        >
                          Speed {rate === 1 ? "1×" : `${rate}×`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {pipSupported && (
                  <IconButton
                    label={inPip ? "Exit picture-in-picture" : "Picture-in-picture"}
                    onClick={() => void togglePip()}
                    className="hidden sm:inline-flex"
                  >
                    <PipIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                )}

                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (!prefersCoarsePointer()) setBrightnessOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (!prefersCoarsePointer()) setBrightnessOpen(false);
                  }}
                >
                  <IconButton label="Brightness" onClick={onBrightnessButtonClick}>
                    <BrightnessIcon className="h-[18px] w-[18px]" />
                  </IconButton>
                  {brightnessOpen && (
                    <VerticalSliderPopover
                      label="Brightness"
                      min={0.4}
                      max={1.6}
                      step={0.05}
                      value={brightness}
                      display={`${Math.round(brightness * 100)}%`}
                      onChange={(v) => {
                        setBrightness(v);
                        bumpControls();
                      }}
                    />
                  )}
                </div>

                <div
                  className="relative"
                  onMouseEnter={() => {
                    if (!prefersCoarsePointer()) setVolumeOpen(true);
                  }}
                  onMouseLeave={() => {
                    if (!prefersCoarsePointer()) setVolumeOpen(false);
                  }}
                >
                  <IconButton
                    label={muted || volume === 0 ? "Unmute" : "Mute"}
                    onClick={onVolumeButtonClick}
                  >
                    {muted || volume === 0 ? (
                      <VolumeMuteIcon className="h-[18px] w-[18px]" />
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
                      value={muted ? 0 : volume}
                      display={`${Math.round((muted ? 0 : volume) * 100)}%`}
                      onChange={setVolumeLevel}
                    />
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

function VerticalSliderPopover({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="absolute bottom-full left-1/2 z-40 mb-2 flex -translate-x-1/2 flex-col items-center gap-2 rounded-md border border-white/10 bg-black/90 px-3 py-3 backdrop-blur-md">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        className="h-24 w-2 cursor-pointer appearance-none rounded-full bg-white/25 accent-white sm:h-20 sm:w-1.5"
        style={{ writingMode: "vertical-lr", direction: "rtl" }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <span className="text-[10px] tabular-nums text-white/70">{display}</span>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  className,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center text-white/90 transition-opacity hover:text-white hover:opacity-100 active:opacity-70 sm:h-9 sm:w-9",
        className,
      )}
    >
      {children}
    </button>
  );
}
