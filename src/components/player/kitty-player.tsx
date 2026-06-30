"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import type { SkipInterval } from "@/hooks/use-aniskip";
import { isSubtitleTrack, labelToLanguage } from "@/lib/subtitles/subtitle-track-utils";
import { subtitleSettingsToCssVars } from "@/lib/subtitles/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import { PlayerSkipButton } from "@/components/player/player-skip-button";
import { CountdownOverlay, NextEpisodeButton } from "@/components/player/player-overlays";
import { buildKittyHlsUrl } from "@/lib/kitty/kitty-hls-url";
import { bindPipCaptionSync } from "@/lib/kitty/pip-captions";
import {
  activateKittySubtitles,
  pickKittyAudioTrack,
  type SubTrackConfig,
} from "@/lib/kitty/videojs-tracks";
import type { VideoPlayerProps } from "@/lib/kitty/video-player-types";
import LoadingGirl from "@/components/common/loading-girl";

export default function KittyPlayer({
  src,
  tracks = [],
  headers = {},
  skipTimes,
  startTime = 0,
  autoFullscreen = false,
  nextEpisode,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onOutroStart,
  onEnded: onEndedProp,
  w2g,
  preferSubtitles = true,
  preferDubAudio = false,
}: VideoPlayerProps) {
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);
  const subtitleCssVars = useMemo(
    () => subtitleSettingsToCssVars(subtitleSettings),
    [subtitleSettings],
  );

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const w2gRef = useRef(w2g);
  const skipRef = useRef(skipTimes);
  const lastProgressTs = useRef(0);
  const startFiredRef = useRef(false);
  const lastW2gReportRef = useRef(0);
  const lastAppliedW2gVersion = useRef(0);
  const applyingW2gRef = useRef(false);
  const durationRef = useRef(0);
  const activateSubtitlesRef = useRef<() => void>(() => {});

  useEffect(() => { w2gRef.current = w2g; }, [w2g]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(true);
  const [ready, setReady] = useState(false);
  const lastUiTimeRef = useRef(0);
  const skipUiRef = useRef<"intro" | "outro" | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const onNextEpisodeRef = useRef(onNextEpisode);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  const onOutroStartRef = useRef(onOutroStart);
  useEffect(() => { onOutroStartRef.current = onOutroStart; }, [onOutroStart]);
  const outroFiredRef = useRef(false);

  const startTimeRef = useRef(startTime);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  const referer = headers?.Referer ?? headers?.referer ?? "";
  const proxiedSrc = buildKittyHlsUrl(src, headers);

  const subTracks = useMemo(
    () =>
      tracks
        .filter(isSubtitleTrack)
        .map((track) => ({
          ...track,
          file: resolveTrackSrc(track.file),
        })),
    [tracks],
  );

  const subTracksKey = useMemo(
    () => subTracks.map((t) => `${t.file}|${t.label ?? ""}`).join("\n"),
    [subTracks],
  );

  const subTracksRef = useRef<SubTrackConfig[]>(subTracks);
  useEffect(() => {
    subTracksRef.current = subTracks;
  }, [subTracksKey, subTracks]);

  const preferSubtitlesRef = useRef(preferSubtitles);
  useEffect(() => { preferSubtitlesRef.current = preferSubtitles; }, [preferSubtitles]);
  const preferDubAudioRef = useRef(preferDubAudio);
  useEffect(() => { preferDubAudioRef.current = preferDubAudio; }, [preferDubAudio]);

  // Reset on source change
  useEffect(() => {
    startFiredRef.current = false;
    outroFiredRef.current = false;
    lastProgressTs.current = 0;
    setActiveSkip(null);
    skipUiRef.current = null;
    lastUiTimeRef.current = 0;
    setCurrentTime(0);
    setCountdown(null);
    durationRef.current = 0;
    setDuration(0);
    setBuffering(true);
    setReady(false);
  }, [src]);

  const reportW2g = useCallback((isPlaying: boolean, time: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime: time });
    lastW2gReportRef.current = time;
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime() ?? 0;
    const dur = player.duration() ?? 0;
    const st = skipRef.current;

    onLiveTimeRef.current?.(t, dur);

    if (dur > 0 && Math.abs(dur - durationRef.current) > 0.5) {
      durationRef.current = dur;
      setDuration(dur);
    }

    let nextSkip: "intro" | "outro" | null = null;
    if (st?.intro && t >= st.intro.start && t < st.intro.end) {
      nextSkip = "intro";
    } else if (st?.outro && t >= st.outro.start && t < st.outro.end) {
      nextSkip = "outro";
      if (!outroFiredRef.current && dur > 0) {
        outroFiredRef.current = true;
        onOutroStartRef.current?.(dur);
      }
    }
    setActiveSkip((prev) => (prev === nextSkip ? prev : nextSkip));

    const skipChanged = nextSkip !== skipUiRef.current;
    if (skipChanged) skipUiRef.current = nextSkip;

    const uiInterval = nextSkip ? 0.25 : 1;
    if (skipChanged || t - lastUiTimeRef.current >= uiInterval) {
      lastUiTimeRef.current = t;
      setCurrentTime(t);
    }

    if (t > 5 && dur > 0) {
      const now = Date.now();
      if (now - lastProgressTs.current >= 10_000) {
        lastProgressTs.current = now;
        onProgressRef.current?.(t, dur);
      }
    }

    const cfg = w2gRef.current;
    if (cfg?.isHost && !applyingW2gRef.current && Math.abs(t - lastW2gReportRef.current) > 2.5) {
      reportW2g(player.paused() === false, t);
    }
  }, [reportW2g]);

  const handleCanPlay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const resume = startTimeRef.current;
    if (resume > 10) player.currentTime(resume);

    setBuffering(false);
    setReady(true);

    if (autoFsRef.current) {
      autoFsRef.current = false;
      const stage = containerRef.current;
      if (player.requestFullscreen) {
        player.requestFullscreen().catch(() => {
          stage?.requestFullscreen().catch(() => {});
        });
      } else {
        stage?.requestFullscreen().catch(() => {});
      }
    }
  }, []);

  const handlePlay = useCallback(() => {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
    const player = playerRef.current;
    if (player) reportW2g(true, player.currentTime() ?? 0);
    setBuffering(false);
  }, [reportW2g]);

  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t = player.currentTime() ?? 0;
    const dur = player.duration() ?? 0;
    if (t > 5 && dur > 0) onProgressRef.current?.(t, dur);
    reportW2g(false, t);
  }, [reportW2g]);

  const onEndedRef = useRef(onEndedProp);
  useEffect(() => { onEndedRef.current = onEndedProp; }, [onEndedProp]);

  const handleEnded = useCallback(() => {
    onEndedRef.current?.();
    if (nextEpisode) setCountdown(5);
  }, [nextEpisode]);

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (player) {
      player.currentTime(time);
      void player.play()?.catch(() => {});
    }
    setActiveSkip(null);
  }, []);

  const autoFsRef = useRef(false);
  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onNextEpisodeRef.current?.();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    const cfg = w2gRef.current;
    if (!cfg || cfg.isHost || !cfg.syncState) return;
    const player = playerRef.current;
    if (!player) return;
    const { version, isPlaying, currentTime: syncTime } = cfg.syncState;
    if (version === lastAppliedW2gVersion.current) return;
    lastAppliedW2gVersion.current = version;
    applyingW2gRef.current = true;

    if (Math.abs((player.currentTime() ?? 0) - syncTime) > 2.5) {
      player.currentTime(syncTime);
    }
    if (isPlaying && player.paused()) {
      void player.play()?.catch(() => {});
    } else if (!isPlaying && !player.paused()) {
      player.pause();
    }

    window.setTimeout(() => {
      applyingW2gRef.current = false;
    }, 600);
  }, [w2g?.syncState]);

  // Gold intro/outro markers on the progress bar
  useEffect(() => {
    if (!duration || !skipTimes) return;
    const container = containerRef.current;
    if (!container) return;

    const inject = () => {
      const track = container.querySelector(".vjs-progress-holder");
      if (!track) return;
      track.querySelectorAll(".kitty-skip-marker").forEach((el) => el.remove());

      const ranges = [
        { interval: skipTimes.intro },
        { interval: skipTimes.outro },
      ].filter((r): r is { interval: NonNullable<typeof r.interval> } => !!r.interval);

      for (const { interval } of ranges) {
        const marker = document.createElement("div");
        marker.className = "kitty-skip-marker";
        marker.style.cssText = `
          position:absolute;top:0;height:100%;pointer-events:none;border-radius:999px;z-index:2;
          left:${(interval.start / duration) * 100}%;
          width:${((interval.end - interval.start) / duration) * 100}%;
        `;
        track.appendChild(marker);
      }
    };

    inject();
    const t = setTimeout(inject, 400);
    return () => {
      clearTimeout(t);
      containerRef.current?.querySelectorAll(".kitty-skip-marker").forEach((el) => el.remove());
    };
  }, [duration, skipTimes]);

  // Video.js player lifecycle
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !proxiedSrc) return;

    const player = videojs(videoEl, {
      controls: true,
      autoplay: true,
      preload: "auto",
      fluid: false,
      fill: true,
      responsive: false,
      playsinline: true,
      crossOrigin: "anonymous",
      controlBar: {
        pictureInPictureToggle: true,
        remainingTimeDisplay: false,
      },
      html5: {
        vhs: {
          overrideNative: true,
          enableLowInitialPlaylist: true,
        },
        nativeTextTracks: false,
      },
      sources: [{ src: proxiedSrc, type: "application/x-mpegURL" }],
    });

    playerRef.current = player;

    for (const track of subTracksRef.current) {
      player.addRemoteTextTrack(
        {
          kind: "subtitles",
          src: track.file,
          srclang: labelToLanguage(track.label || ""),
          label: track.label || "Subtitles",
          default:
            preferSubtitlesRef.current &&
            (track.default ??
              (subTracksRef.current.indexOf(track) === 0 &&
                !subTracksRef.current.some((t) => t.default))),
        },
        false,
      );
    }

    let subtitleRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let subtitleAttempts = 0;
    let audioRetryTimer: ReturnType<typeof setTimeout> | undefined;
    let audioAttempts = 0;

    const tryActivateSubtitles = () => {
      const ok = activateKittySubtitles(
        player,
        subTracksRef.current,
        preferSubtitlesRef.current,
      );
      if (ok || subtitleAttempts++ >= 16) return;
      subtitleRetryTimer = setTimeout(tryActivateSubtitles, 350);
    };

    const tryPickAudio = () => {
      const ok = pickKittyAudioTrack(player, preferDubAudioRef.current);
      if (ok || audioAttempts++ >= 12) return;
      audioRetryTimer = setTimeout(tryPickAudio, 350);
    };

    activateSubtitlesRef.current = tryActivateSubtitles;

    const onAudioChange = () => {
      tryPickAudio();
      window.setTimeout(() => tryActivateSubtitles(), 150);
    };

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);

    player.on("timeupdate", handleTimeUpdate);
    player.on("canplay", handleCanPlay);
    player.on("canplay", tryActivateSubtitles);
    player.on("canplay", tryPickAudio);
    player.on("loadedmetadata", tryActivateSubtitles);
    player.on("loadedmetadata", tryPickAudio);
    player.on("play", handlePlay);
    player.on("pause", handlePause);
    player.on("ended", handleEnded);
    player.on("waiting", onWaiting);
    player.on("playing", onPlaying);
    player.on("seeking", onWaiting);
    player.on("audiochange", onAudioChange);
    player.on("loadedmetadata", () => {
      const dur = player.duration() ?? 0;
      if (dur > 0) {
        durationRef.current = dur;
        setDuration(dur);
      }
    });

    tryActivateSubtitles();
    tryPickAudio();

    const container = containerRef.current;
    const pipCleanup = container ? bindPipCaptionSync(container, player) : () => {};

    return () => {
      if (subtitleRetryTimer) clearTimeout(subtitleRetryTimer);
      if (audioRetryTimer) clearTimeout(audioRetryTimer);
      pipCleanup();
      player.off("timeupdate", handleTimeUpdate);
      player.off("canplay", handleCanPlay);
      player.off("play", handlePlay);
      player.off("pause", handlePause);
      player.off("ended", handleEnded);
      player.off("waiting", onWaiting);
      player.off("playing", onPlaying);
      player.off("seeking", onWaiting);
      player.off("audiochange", onAudioChange);
      if (!player.isDisposed()) player.dispose();
      playerRef.current = null;
    };
  }, [
    proxiedSrc,
    handleTimeUpdate,
    handleCanPlay,
    handlePlay,
    handlePause,
    handleEnded,
  ]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !ready) return;
    activateSubtitlesRef.current();
    pickKittyAudioTrack(player, preferDubAudio);
  }, [preferSubtitles, preferDubAudio, subTracksKey, ready]);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro"
      ? skipTimes?.intro
      : activeSkip === "outro"
        ? skipTimes?.outro
        : undefined;

  const nearEnd = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const overlayBottom = showNext ? "kitty-overlay--stacked" : "kitty-overlay--base";
  const showLoading = buffering && !ready;

  return (
    <div
      ref={containerRef}
      className="vjs-kitty kitty-stage group/stage relative w-full overflow-hidden rounded-xl bg-[#030303] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.92)] ring-1 ring-white/[0.06]"
      style={{ aspectRatio: "16/9", ...(subtitleCssVars as React.CSSProperties) }}
    >
      <div
        className="kitty-stage__glow pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-violet-500/[0.12] via-transparent to-transparent opacity-80"
        aria-hidden
      />

      <div data-vjs-player className="absolute inset-0">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin vjs-big-play-centered w-full h-full"
          playsInline
          crossOrigin="anonymous"
        />
      </div>

      {showLoading && (
        <div className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black/35 backdrop-blur-[1px] animate-in fade-in duration-300">
          <LoadingGirl size={120} className="opacity-90" />
        </div>
      )}

      {showNext && nextEpisode && (
        <NextEpisodeButton
          episode={nextEpisode}
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
          onSkip={() => seekTo(activeInterval.end)}
        />
      )}

      {countdown !== null && nextEpisode && (
        <CountdownOverlay
          episode={nextEpisode}
          countdown={countdown}
          onSkip={() => {
            setCountdown(null);
            onNextEpisodeRef.current?.();
          }}
          onCancel={() => setCountdown(null)}
        />
      )}
    </div>
  );
}

function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}
