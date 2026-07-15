"use client";

import "./vidstack-player.css";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  useMediaPlayer,
  useMediaRemote,
  useMediaState,
  type MediaErrorDetail,
} from "@vidstack/react";
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from "@vidstack/react/player/layouts/default";
import LoadingGirl from "@/components/common/loading-girl";
import { buildVidstackPlayerSrc } from "@/lib/player/build-vidstack-src";
import { createPlayerController } from "@/lib/player/player-controller";
import {
  isElementFullscreen,
  onFullscreenChange,
  requestElementFullscreen,
} from "@/lib/kitty/fullscreen";
import {
  onPlayerOrientationChange,
  resolvePlayerOrientClass,
  tryLockLandscapeOrientation,
  tryUnlockScreenOrientation,
  type PlayerOrientClass,
} from "@/lib/kitty/player-orientation";
import {
  getTrackFile,
  isSubtitleTrack,
  labelToLanguage,
} from "@/lib/subtitles/subtitle-track-utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import type { VideoPlayerProps } from "@/lib/kitty/video-player-types";
import type { SkipInterval } from "@/hooks/use-aniskip";
import { cn } from "@/lib/core/utils";
import { PlayerSkipButton } from "@/components/player/player-skip-button";
import { CountdownOverlay, NextEpisodeButton } from "@/components/player/player-overlays";
import {
  attachAnime4k,
  isWebGpuSupported,
  type Anime4kMode,
} from "@/lib/player/anime4k";

function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}

function shouldResumeAt(time: number, duration: number): boolean {
  if (time <= 10) return false;
  if (duration > 0 && time >= duration - 30) return false;
  return true;
}

function resolvePlayerSrcKey(src: import("@vidstack/react").PlayerSrc): string {
  if (typeof src === "string") return src;
  if (Array.isArray(src)) return src.map(resolvePlayerSrcKey).join("|");
  if (src && typeof src === "object" && "src" in src) return String(src.src);
  return "kitty-stream";
}

type BridgeProps = VideoPlayerProps & {
  srcKey: string;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  anime4kEnabled: boolean;
  anime4kMode: Anime4kMode;
  liteMode: boolean;
  setActiveSkip: (v: "intro" | "outro" | null) => void;
  setCurrentTime: (v: number) => void;
  setDuration: (v: number) => void;
  setCountdown: React.Dispatch<React.SetStateAction<number | null>>;
  setReady: (v: boolean) => void;
  setBuffering: (v: boolean) => void;
  setAnime4kActive: (v: boolean) => void;
  activeSkip: "intro" | "outro" | null;
  currentTime: number;
  duration: number;
  countdown: number | null;
  skipTimes?: VideoPlayerProps["skipTimes"];
  nextEpisode?: VideoPlayerProps["nextEpisode"];
};

function PlayerBridge({
  srcKey,
  startTime = 0,
  preferSubtitles = true,
  skipTimes,
  nextEpisode,
  w2g,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onOutroStart,
  onEnded,
  onPlayerReady,
  autoFullscreen,
  wrapperRef,
  anime4kEnabled,
  anime4kMode,
  liteMode,
  setActiveSkip,
  setCurrentTime,
  setDuration,
  setCountdown,
  setReady,
  setBuffering,
  setAnime4kActive,
  activeSkip,
  currentTime,
  duration,
  countdown,
}: BridgeProps) {
  const player = useMediaPlayer();
  const remote = useMediaRemote();
  const paused = useMediaState("paused");
  const mediaCurrentTime = useMediaState("currentTime");
  const mediaDuration = useMediaState("duration");
  const waiting = useMediaState("waiting");
  const canPlay = useMediaState("canPlay");
  const ended = useMediaState("ended");

  const autoNextRef = useRef(useSettingsStore.getState().autoPlay);
  const autoSkipRef = useRef(useSettingsStore.getState().autoSkipIntro);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);

  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onOutroStartRef = useRef(onOutroStart);
  const onEndedRef = useRef(onEnded);
  const onPlayerReadyRef = useRef(onPlayerReady);
  const skipTimesRef = useRef(skipTimes);
  const w2gRef = useRef(w2g);
  const nextEpisodeRef = useRef(nextEpisode);
  const startTimeRef = useRef(startTime);
  const anime4kDetachRef = useRef<(() => void) | null>(null);

  const startFiredRef = useRef(false);
  const outroFiredRef = useRef(false);
  const endHandledRef = useRef(false);
  const autoNextStartedRef = useRef(false);
  const introAutoSkippedRef = useRef(false);
  const outroAutoSkippedRef = useRef(false);
  const lastProgressTs = useRef(0);
  const skipUiRef = useRef<"intro" | "outro" | null>(null);
  const lastUiTimeRef = useRef(0);
  const lastW2gReportRef = useRef(0);
  const applyingW2gRef = useRef(false);
  const resumeAppliedRef = useRef(false);
  const autoFsRef = useRef(false);
  const controllerSentRef = useRef(false);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  useEffect(() => { onOutroStartRef.current = onOutroStart; }, [onOutroStart]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady; }, [onPlayerReady]);
  useEffect(() => { skipTimesRef.current = skipTimes; }, [skipTimes]);
  useEffect(() => { w2gRef.current = w2g; }, [w2g]);
  useEffect(() => { nextEpisodeRef.current = nextEpisode; }, [nextEpisode]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { autoNextRef.current = autoPlay; }, [autoPlay]);
  useEffect(() => { autoSkipRef.current = autoSkipIntro; }, [autoSkipIntro]);
  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  useEffect(() => {
    controllerSentRef.current = false;
    introAutoSkippedRef.current = false;
    outroAutoSkippedRef.current = false;
    outroFiredRef.current = false;
    endHandledRef.current = false;
    autoNextStartedRef.current = false;
    startFiredRef.current = false;
    resumeAppliedRef.current = false;
    skipUiRef.current = null;
    setActiveSkip(null);
    setCountdown(null);
    setReady(false);
    setBuffering(true);
  }, [srcKey, setActiveSkip, setCountdown, setReady, setBuffering]);

  const reportW2g = useCallback((isPlaying: boolean, time: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime: time });
    lastW2gReportRef.current = time;
  }, []);

  useEffect(() => {
    if (!player || controllerSentRef.current) return;
    controllerSentRef.current = true;
    onPlayerReadyRef.current?.(createPlayerController(player, remote));
  }, [player, remote]);

  useEffect(() => {
    if (!player) return;
    const effectiveAnime4k = anime4kEnabled && !liteMode && isWebGpuSupported();
    let cancelled = false;

    anime4kDetachRef.current?.();
    anime4kDetachRef.current = null;
    setAnime4kActive(false);

    if (!effectiveAnime4k) return;

    const video = player.el?.querySelector("video");
    const videoContainer = player.el;
    if (!video || !videoContainer) return;

    void attachAnime4k({ video, videoContainer, mode: anime4kMode }).then((attachment) => {
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
  }, [player, anime4kEnabled, anime4kMode, liteMode, setAnime4kActive]);

  useEffect(() => {
    if (!player || !canPlay || resumeAppliedRef.current) return;
    const resumeAt = startTimeRef.current;
    if (!shouldResumeAt(resumeAt, mediaDuration)) {
      resumeAppliedRef.current = true;
      return;
    }
    remote.seek(resumeAt);
    resumeAppliedRef.current = true;
  }, [player, canPlay, mediaDuration, remote]);

  useEffect(() => {
    if (!player || !canPlay) return;
    setReady(true);
    setBuffering(false);

    if (autoFsRef.current) {
      autoFsRef.current = false;
      const target = wrapperRef.current;
      if (target) {
        requestElementFullscreen(target)
          .then(() => {
            void tryLockLandscapeOrientation();
          })
          .catch(() => {
            remote.enterFullscreen();
          });
      } else {
        remote.enterFullscreen();
      }
    }
  }, [player, canPlay, remote, setReady, setBuffering, wrapperRef]);

  useEffect(() => {
    if (!player) return;
    if (preferSubtitles) remote.showCaptions();
    else remote.disableCaptions();
  }, [player, preferSubtitles, remote]);

  useEffect(() => {
    setBuffering(waiting && !canPlay);
  }, [waiting, canPlay, setBuffering]);

  useEffect(() => {
    if (!paused && !startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
    if (!paused) {
      reportW2g(true, mediaCurrentTime);
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "playing";
      }
    } else if (mediaCurrentTime > 0) {
      reportW2g(false, mediaCurrentTime);
      if (mediaDuration > 0 && mediaCurrentTime > 5) {
        onProgressRef.current?.(mediaCurrentTime, mediaDuration);
      }
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = "paused";
      }
    }
  }, [paused, mediaCurrentTime, mediaDuration, reportW2g]);

  useEffect(() => {
    if (mediaDuration > 0) setDuration(mediaDuration);
    onLiveTimeRef.current?.(mediaCurrentTime, mediaDuration);

    const st = skipTimesRef.current;
    let nextSkip: "intro" | "outro" | null = null;
    if (st?.intro && mediaCurrentTime >= st.intro.start && mediaCurrentTime < st.intro.end) {
      nextSkip = "intro";
      if (autoSkipRef.current && !introAutoSkippedRef.current) {
        introAutoSkippedRef.current = true;
        remote.seek(st.intro.end);
      }
    } else if (st?.outro && mediaCurrentTime >= st.outro.start && mediaCurrentTime < st.outro.end) {
      nextSkip = "outro";
      if (autoSkipRef.current && !outroAutoSkippedRef.current) {
        outroAutoSkippedRef.current = true;
        remote.seek(st.outro.end);
      }
      if (!outroFiredRef.current && mediaDuration > 0) {
        outroFiredRef.current = true;
        onOutroStartRef.current?.(mediaDuration);
      }
    }

    const skipChanged = nextSkip !== skipUiRef.current;
    if (skipChanged) {
      skipUiRef.current = nextSkip;
      setActiveSkip(nextSkip);
    }

    const uiInterval = nextSkip ? 0.5 : 2;
    if (skipChanged || mediaCurrentTime - lastUiTimeRef.current >= uiInterval) {
      lastUiTimeRef.current = mediaCurrentTime;
      setCurrentTime(mediaCurrentTime);
    }

    if (mediaCurrentTime > 5 && mediaDuration > 0) {
      const now = Date.now();
      if (now - lastProgressTs.current >= 10_000) {
        lastProgressTs.current = now;
        onProgressRef.current?.(mediaCurrentTime, mediaDuration);
      }
    }

    const cfg = w2gRef.current;
    if (
      cfg?.isHost &&
      !applyingW2gRef.current &&
      Math.abs(mediaCurrentTime - lastW2gReportRef.current) > 2.5
    ) {
      reportW2g(!paused, mediaCurrentTime);
    }
  }, [
    mediaCurrentTime,
    mediaDuration,
    paused,
    remote,
    reportW2g,
    setActiveSkip,
    setCurrentTime,
    setDuration,
  ]);

  useEffect(() => {
    if (!ended || endHandledRef.current) return;
    endHandledRef.current = true;
    onEndedRef.current?.();
    if (nextEpisodeRef.current && autoNextRef.current && !autoNextStartedRef.current) {
      autoNextStartedRef.current = true;
      setCountdown(5);
    }
  }, [ended, setCountdown]);

  useEffect(() => {
    const cfg = w2gRef.current;
    if (!player || !cfg?.syncState || cfg.isHost) return;
    applyingW2gRef.current = true;
    remote.seek(cfg.syncState.currentTime);
    if (cfg.syncState.isPlaying) remote.play();
    else remote.pause();
    applyingW2gRef.current = false;
  }, [player, remote, w2g?.syncState?.version, w2g?.isHost, w2g?.syncState]);

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro"
      ? skipTimes?.intro
      : activeSkip === "outro"
        ? skipTimes?.outro
        : undefined;

  const nearEnd = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const overlayBottom = showNext ? "kitty-overlay--stacked" : "kitty-overlay--base";

  const handleSkip = (end: number) => {
    remote.seek(end);
    skipUiRef.current = null;
    setActiveSkip(null);
  };

  return (
    <div className="kitty-player-overlays">
      {showNext && nextEpisode && (
        <NextEpisodeButton
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          stackClass={overlayBottom}
          onClick={() => onNextEpisodeRef.current?.()}
        />
      )}

      {activeSkip && activeInterval && countdown === null && (
        <PlayerSkipButton
          type={activeSkip}
          interval={activeInterval}
          currentTime={currentTime}
          stackClass={overlayBottom}
          onSkip={() => handleSkip(activeInterval.end)}
        />
      )}

      {countdown !== null && nextEpisode && (
        <CountdownOverlay
          episode={nextEpisode}
          imageUrl={nextEpisode.image}
          countdown={countdown}
          onSkip={() => onNextEpisodeRef.current?.()}
          onCancel={() => setCountdown(null)}
        />
      )}
    </div>
  );
}

export default function KittyPlayer(props: VideoPlayerProps) {
  const {
    src,
    tracks = [],
    headers = {},
    qualities = [],
    skipTimes,
    startTime = 0,
    autoFullscreen = false,
    nextEpisode,
    onFatalError,
    preferSubtitles = true,
  } = props;

  const t = useT();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const kittyProxyNode = useSettingsStore((s) => s.kittyProxyNode);
  const seekStepSeconds = useSettingsStore((s) => s.seekStepSeconds);
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const liteMode = useSettingsStore((s) => s.liteMode);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");
  const [buffering, setBuffering] = useState(true);
  const [ready, setReady] = useState(false);
  const [anime4kActive, setAnime4kActive] = useState(false);

  const playerSrc = useMemo(
    () => buildVidstackPlayerSrc(src, qualities, headers, kittyProxyNode),
    [src, qualities, headers, kittyProxyNode],
  );

  const subtitleTracks = useMemo(
    () =>
      tracks
        .filter(isSubtitleTrack)
        .map((track) => ({
          ...track,
          file: resolveTrackSrc(getTrackFile(track) ?? ""),
        }))
        .filter((track) => Boolean(track.file)),
    [tracks],
  );

  const srcKey = useMemo(() => resolvePlayerSrcKey(playerSrc), [playerSrc]);

  const syncPlayerOrientation = useCallback(() => {
    setOrientClass(
      resolvePlayerOrientClass({
        isFullscreen: isElementFullscreen(wrapperRef.current),
      }),
    );
  }, []);

  useEffect(() => {
    syncPlayerOrientation();
    const offOrient = onPlayerOrientationChange(syncPlayerOrientation);
    const offFs = onFullscreenChange(() => {
      if (isElementFullscreen(wrapperRef.current)) void tryLockLandscapeOrientation();
      else void tryUnlockScreenOrientation();
      syncPlayerOrientation();
    });
    return () => {
      offOrient();
      offFs();
      void tryUnlockScreenOrientation();
    };
  }, [syncPlayerOrientation]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = window.setTimeout(() => {
      setCountdown((value) => {
        if (value === null || value <= 1) {
          props.onNextEpisode?.();
          return null;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [countdown, props.onNextEpisode]);

  if (!src) return null;

  const showLoading = buffering && !ready;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "kitty-vidstack-player rounded-none sm:rounded-xl",
        "shadow-none sm:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-0 sm:ring-1 ring-white/[0.08]",
        orientClass,
        anime4kActive && "anime4k-active",
      )}
    >
      <MediaPlayer
        key={srcKey}
        className="kitty-vidstack-media"
        src={playerSrc}
        viewType="video"
        streamType="on-demand"
        crossOrigin
        playsInline
        autoplay
        storage="kitty-vidstack"
        onError={(detail: MediaErrorDetail) => {
          onFatalError?.({
            type: detail.code != null ? String(detail.code) : "media",
            details: detail.message,
          });
        }}
      >
        <MediaProvider />
        <PlayerBridge
          {...props}
          srcKey={srcKey}
          skipTimes={skipTimes}
          nextEpisode={nextEpisode}
          startTime={startTime}
          autoFullscreen={autoFullscreen}
          preferSubtitles={preferSubtitles}
          wrapperRef={wrapperRef}
          anime4kEnabled={anime4kEnabled}
          anime4kMode={anime4kMode}
          liteMode={liteMode}
          setActiveSkip={setActiveSkip}
          setCurrentTime={setCurrentTime}
          setDuration={setDuration}
          setCountdown={setCountdown}
          setReady={setReady}
          setBuffering={setBuffering}
          setAnime4kActive={setAnime4kActive}
          activeSkip={activeSkip}
          currentTime={currentTime}
          duration={duration}
          countdown={countdown}
        />
        {subtitleTracks.map((track, index) => (
          <Track
            key={`${track.file}-${index}`}
            src={track.file}
            kind="subtitles"
            label={track.label || `Subtitle ${index + 1}`}
            language={labelToLanguage(track.label || "")}
            default={track.default ?? (index === 0 && preferSubtitles)}
          />
        ))}
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          colorScheme="dark"
          seekStep={seekStepSeconds}
          smallLayoutWhen={({ width }) => width < 576}
        />
      </MediaPlayer>

      {showLoading && (
        <div
          role="status"
          aria-busy="true"
          aria-live="polite"
          aria-label={t("watch.loadingStream")}
          className="pointer-events-none absolute inset-0 z-[130] flex items-center justify-center bg-black/40 animate-in fade-in duration-300"
        >
          <LoadingGirl size={120} className="opacity-90 drop-shadow-[0_0_32px_rgba(124,58,237,0.35)]" />
        </div>
      )}
    </div>
  );
}
