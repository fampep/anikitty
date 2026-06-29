"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes, SkipInterval } from "@/query/use-aniskip";
import { isSubtitleTrack, labelToLanguage } from "@/lib/subtitle-track-utils";
import { subtitleSettingsToCssVars } from "@/lib/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  Poster,
  type MediaPlayerInstance,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/captions.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { SkipForward, ChevronRight, X } from "lucide-react";
import { buildKittyHlsUrl } from "@/lib/kitty-hls-url";
import { createHlsConfig } from "@/lib/hls-config";
import { isHLSProvider, type MediaProviderAdapter } from "@vidstack/react";
import Hls from "hls.js";
import { useT } from "@/providers/i18n-provider";
import { useAnime4KUpscaler } from "@/hooks/use-anime4k-upscaler";
import {
  exitElementFullscreen,
  getFullscreenElement,
  isElementFullscreen,
  requestElementFullscreen,
} from "@/lib/fullscreen";
import { bindPipCaptionSync } from "@/lib/pip-captions";
import { bindSubtitlePlaybackSync } from "@/lib/subtitle-playback-sync";

interface W2gSyncState {
  version: number;
  isPlaying: boolean;
  currentTime: number;
}

interface KittyPlayerProps {
  src: string;
  poster?: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  skipTimes?: SkipTimes;
  startTime?: number;
  autoFullscreen?: boolean;
  nextEpisode?: { id: string; number: number; title: string };
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onNextEpisode?: () => void;
  onOutroStart?: (duration: number) => void;
  onEnded?: () => void;
  w2g?: {
    isHost: boolean;
    syncState?: W2gSyncState | null;
    onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number }) => void;
  };
  /** Auto-select and show subtitles when tracks are available (default: sub mode). */
  preferSubtitles?: boolean;
  /** Prefer English/dub HLS audio when the stream has multiple audio tracks. */
  preferDubAudio?: boolean;
}

export default function KittyPlayer({
  src,
  poster,
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
}: KittyPlayerProps) {
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);
  const subtitleOffsetRef = useRef(subtitleSettings.timeOffsetSec);
  useEffect(() => {
    subtitleOffsetRef.current = subtitleSettings.timeOffsetSec;
  }, [subtitleSettings.timeOffsetSec]);
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subtitleCssVars = useMemo(
    () => subtitleSettingsToCssVars(subtitleSettings),
    [subtitleSettings],
  );
  const playerRef = useRef<MediaPlayerInstance>(null);
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

  useEffect(() => { w2gRef.current = w2g; }, [w2g]);
  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { skipRef.current = skipTimes; }, [skipTimes]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  // Derived early so effects can reference them
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

  const activateSubtitlesRef = useRef<() => void>(() => {});
  const resyncSubtitlesRef = useRef<() => void>(() => {});

  useAnime4KUpscaler(
    containerRef,
    canvasRef,
    anime4kEnabled,
    anime4kMode,
    proxiedSrc ?? src,
  );

  // When Anime4K is on, fullscreen must target the stage (not media-player alone) so the
  // WebGPU canvas stays visible in every browser.
  useEffect(() => {
    if (!anime4kEnabled) return;

    const stage = containerRef.current;
    const player = playerRef.current;
    if (!stage || !player) return;

    const syncPlayerFullscreenAttr = () => {
      const el = stage.querySelector("media-player");
      if (!el) return;
      if (isElementFullscreen(stage)) el.setAttribute("data-fullscreen", "");
      else el.removeAttribute("data-fullscreen");
    };

    const onEnterRequest = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (isElementFullscreen(stage)) return;
      requestElementFullscreen(stage)
        .then(syncPlayerFullscreenAttr)
        .catch(() => {});
    };

    const onExitRequest = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!getFullscreenElement()) return;
      exitElementFullscreen()
        .then(syncPlayerFullscreenAttr)
        .catch(() => {});
    };

    const onFullscreenChange = () => syncPlayerFullscreenAttr();

    player.addEventListener("media-enter-fullscreen-request", onEnterRequest, true);
    player.addEventListener("media-exit-fullscreen-request", onExitRequest, true);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      player.removeEventListener("media-enter-fullscreen-request", onEnterRequest, true);
      player.removeEventListener("media-exit-fullscreen-request", onExitRequest, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [anime4kEnabled, proxiedSrc]);

  // Custom caption overlay stays on the page during video PiP — switch to native tracks.
  useEffect(() => {
    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || !container) return;
    return bindPipCaptionSync(container, player);
  }, [proxiedSrc, anime4kEnabled]);

  const chapterTrack = tracks.find(
    (t) =>
      !!t.file &&
      (t.kind === "chapters" ||
        t.kind === "metadata" ||
        t.label?.toLowerCase().includes("chapter") ||
        t.label?.toLowerCase().includes("skip") ||
        t.label?.toLowerCase().includes("intro")),
  );
  const m3u8ChaptersUrl =
    !chapterTrack && src
      ? `/api/kitty/chapters?url=${encodeURIComponent(src)}&referer=${encodeURIComponent(referer)}`
      : undefined;
  const effectiveChapterUrl = chapterTrack?.file ?? m3u8ChaptersUrl;

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
  }, [src]);

  // Enable default subtitle track when available (Vidstack CC menu still allows switching/off).
  useEffect(() => {
    const player = playerRef.current;
    if (!player || subTracks.length === 0) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const isSubtitleTrack = (track: { kind?: string }) =>
      track.kind === "subtitles" || track.kind === "captions";

    const activate = (): boolean => {
      if (subTracks.length === 0) return true;

      const textTracks = player.textTracks;
      if (!textTracks?.length) return false;

      if (!preferSubtitles) {
        let alreadyOff = true;
        for (const track of textTracks) {
          if (isSubtitleTrack(track) && track.mode !== "disabled") {
            alreadyOff = false;
            break;
          }
        }
        if (alreadyOff) return true;
        for (const track of textTracks) {
          if (isSubtitleTrack(track)) track.setMode("disabled");
        }
        return true;
      }

      const preferred = subTracks.find((t) => t.default) ?? subTracks[0];
      const preferredLang = labelToLanguage(preferred.label || "");

      let target: (typeof textTracks)[number] | undefined;
      for (const track of textTracks) {
        if (!isSubtitleTrack(track)) continue;
        const labelMatch =
          track.label === preferred.label ||
          track.language === preferredLang ||
          (preferred.label && track.label?.toLowerCase().includes(preferred.label.toLowerCase()));
        if (labelMatch) {
          target = track;
          break;
        }
      }
      if (!target) {
        target = [...textTracks].find(isSubtitleTrack);
      }
      if (!target) return false;

      let alreadyActive = target.mode === "showing";
      if (alreadyActive) {
        for (const track of textTracks) {
          if (!isSubtitleTrack(track) || track === target) continue;
          if (track.mode !== "disabled") {
            alreadyActive = false;
            break;
          }
        }
      }
      if (alreadyActive) return true;

      for (const track of textTracks) {
        if (isSubtitleTrack(track)) track.setMode("disabled");
      }
      target.setMode("showing");
      return true;
    };

    const tryActivate = () => {
      if (activate()) return;
      if (attempts++ < 16) {
        retryTimer = setTimeout(tryActivate, 350);
      }
    };

    activateSubtitlesRef.current = tryActivate;

    let tracksChangeTimer: ReturnType<typeof setTimeout> | undefined;
    const onTracksChange = () => {
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
      tracksChangeTimer = setTimeout(() => tryActivate(), 50);
    };

    player.addEventListener("can-play", tryActivate);
    player.addEventListener("vds-text-tracks-change", onTracksChange);
    if (player.state.canPlay) tryActivate();

    return () => {
      player.removeEventListener("can-play", tryActivate);
      player.removeEventListener("vds-text-tracks-change", onTracksChange);
      if (retryTimer) clearTimeout(retryTimer);
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
    };
  }, [proxiedSrc, subTracks, preferSubtitles]);

  // Keep subtitle cues locked to the stream playback clock (seek / audio-track / offset).
  useEffect(() => {
    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || !container || subTracks.length === 0) {
      resyncSubtitlesRef.current = () => {};
      return;
    }
    const { cleanup, resync } = bindSubtitlePlaybackSync(
      container,
      player,
      () => subtitleOffsetRef.current,
    );
    resyncSubtitlesRef.current = resync;
    return () => {
      resyncSubtitlesRef.current = () => {};
      cleanup();
    };
  }, [proxiedSrc, subTracks.length, preferDubAudio]);

  // Select Japanese (sub) or English/dub HLS audio when multiple tracks exist.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const pickAudioTrack = (): boolean => {
      const tracks = player.audioTracks;
      if (!tracks?.length || tracks.length < 2) return (tracks?.length ?? 0) >= 1;

      type PlayerAudioTrack = { id: string; label?: string; language?: string };
      const trackList: PlayerAudioTrack[] = Array.from(
        { length: tracks.length },
        (_, i) => tracks[i] as PlayerAudioTrack | undefined,
      ).filter((t): t is PlayerAudioTrack => t != null);

      const labelOf = (track: PlayerAudioTrack) =>
        `${track.label ?? ""} ${track.language ?? ""}`.toLowerCase();

      const isDubLike = (track: PlayerAudioTrack) => {
        const text = labelOf(track);
        return (
          /\bdub\b/.test(text) ||
          /\benglish\b/.test(text) ||
          text === "en" ||
          text.startsWith("en-") ||
          text.includes(" eng")
        );
      };

      const isSubLike = (track: PlayerAudioTrack) => {
        const text = labelOf(track);
        return (
          /\bjapanese\b/.test(text) ||
          /\bja\b/.test(text) ||
          text === "ja" ||
          text.startsWith("ja-") ||
          /\bsub\b/.test(text)
        );
      };

      const preferred = preferDubAudio
        ? trackList.find(isDubLike) ??
          trackList.find((t) => !isSubLike(t)) ??
          trackList[trackList.length - 1]
        : trackList.find(isSubLike) ??
          trackList.find((t) => !isDubLike(t)) ??
          trackList[0];

      const playerWithAudio = player as MediaPlayerInstance & {
        audioTrack?: PlayerAudioTrack;
      };
      if (preferred && playerWithAudio.audioTrack?.id !== preferred.id) {
        playerWithAudio.audioTrack = preferred;
      }
      window.setTimeout(() => {
        activateSubtitlesRef.current();
        resyncSubtitlesRef.current();
      }, 150);
      return true;
    };

    const tryPick = () => {
      if (pickAudioTrack()) return;
      if (attempts++ < 12) retryTimer = setTimeout(tryPick, 350);
    };

    const onAudioTracksChange = () => tryPick();

    player.addEventListener("can-play", tryPick);
    player.addEventListener("audio-tracks-change", onAudioTracksChange);
    if (player.state.canPlay) tryPick();

    return () => {
      player.removeEventListener("can-play", tryPick);
      player.removeEventListener("audio-tracks-change", onAudioTracksChange);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [proxiedSrc, preferDubAudio]);

  // Track that fullscreen should be re-entered when the player is ready
  const autoFsRef = useRef(false);
  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  // Countdown tick → fire next episode at 0
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

  // Gold intro/outro markers on the vidstack progress bar
  useEffect(() => {
    if (!duration || !skipTimes) return;
    const container = containerRef.current;
    if (!container) return;

    const inject = () => {
      const track = container.querySelector(".vds-slider-track");
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

  const reportW2g = useCallback((isPlaying: boolean, currentTime: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime });
    lastW2gReportRef.current = currentTime;
  }, []);

  useEffect(() => {
    const cfg = w2gRef.current;
    if (!cfg || cfg.isHost || !cfg.syncState) return;
    const player = playerRef.current;
    if (!player) return;
    const { version, isPlaying, currentTime } = cfg.syncState;
    if (version === lastAppliedW2gVersion.current) return;
    lastAppliedW2gVersion.current = version;
    applyingW2gRef.current = true;

    if (Math.abs(player.currentTime - currentTime) > 2.5) {
      player.currentTime = currentTime;
    }
    if (isPlaying && player.paused) {
      player.play().catch(() => {});
    } else if (!isPlaying && !player.paused) {
      player.pause();
    }

    window.setTimeout(() => {
      applyingW2gRef.current = false;
    }, 600);
  }, [w2g?.syncState]);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
    const st  = skipRef.current;

    onLiveTimeRef.current?.(t, dur);

    if (dur > 0 && Math.abs(dur - duration) > 0.5) {
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
      reportW2g(!player.paused, t);
    }
  }, [duration, reportW2g]);

  const handleCanPlay = useCallback(() => {
    const t = startTimeRef.current;
    if (t > 10 && playerRef.current) playerRef.current.currentTime = t;

    // Re-enter fullscreen once the player is ready (binge-watch next-episode transition).
    // The wrapper div in VideoPlayerSection already holds fullscreen; calling
    // enterFullscreen here hands it over to Vidstack so its controls work correctly.
    if (autoFsRef.current) {
      autoFsRef.current = false;
      const stage = containerRef.current;
      if (anime4kEnabled && stage) {
        requestElementFullscreen(stage).catch(() => {});
      } else {
        playerRef.current?.enterFullscreen().catch(() => {
          stage?.requestFullscreen().catch(() => {});
        });
      }
    }
  }, [anime4kEnabled]);

  const handlePlay = useCallback(() => {
    if (!startFiredRef.current) {
      startFiredRef.current = true;
      onStartRef.current?.();
    }
    const player = playerRef.current;
    if (player) reportW2g(true, player.currentTime);
  }, [reportW2g]);

  const handlePause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
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
    if (player) { player.currentTime = time; player.play(); }
    setActiveSkip(null);
    window.setTimeout(() => resyncSubtitlesRef.current(), 80);
  }, []);

  const onProviderChange = useCallback((provider: MediaProviderAdapter | null) => {
    if (!provider || !isHLSProvider(provider)) return;
    provider.library = Hls;
    provider.config = {
      ...provider.config,
      ...createHlsConfig(),
    };
  }, []);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro" ? skipTimes?.intro : activeSkip === "outro" ? skipTimes?.outro : undefined;

  const nearEnd  = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipOffset = showNext ? "bottom-[8.5rem]" : "bottom-[4.5rem]";

  return (
    <div
      ref={containerRef}
      className="vds-kitty relative w-full bg-black overflow-hidden ring-1 ring-white/[0.08] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)]"
      style={{ aspectRatio: "16/9" }}
      data-anime4k={anime4kEnabled ? "true" : undefined}
    >
      <MediaPlayer
        ref={playerRef}
        src={{ src: proxiedSrc, type: "application/x-mpegurl" }}
        streamType="on-demand"
        poster={poster}
        playsInline
        crossOrigin="anonymous"
        load="eager"
        autoPlay
        className="w-full h-full"
        style={subtitleCssVars as React.CSSProperties & Record<string, string>}
        onProviderChange={onProviderChange}
        onCanPlay={handleCanPlay}
        onPlay={handlePlay}
        onTimeUpdate={handleTimeUpdate}
        onPause={handlePause}
        onEnded={handleEnded}
      >
        <MediaProvider>
          {poster && <Poster className="vds-poster" src={poster} alt="" />}
          {effectiveChapterUrl && (
            <Track src={effectiveChapterUrl} kind="chapters" default />
          )}
          {subTracks.map((track, i) => (
            <Track
              key={`${track.file}-${track.label}-${i}`}
              src={track.file}
              kind="subtitles"
              type="vtt"
              lang={labelToLanguage(track.label || "")}
              label={track.label || `Track ${i + 1}`}
              default={
                preferSubtitles &&
                (track.default ?? (i === 0 && !subTracks.some((t) => t.default)))
              }
            />
          ))}
        </MediaProvider>

        {anime4kEnabled && (
          <canvas
            ref={canvasRef}
            className="anime4k-canvas pointer-events-none"
            aria-hidden
          />
        )}

        <DefaultVideoLayout icons={defaultLayoutIcons} />

        {showNext && nextEpisode && (
          <NextEpisodeButton episode={nextEpisode} onClick={() => onNextEpisodeRef.current?.()} />
        )}

        {activeSkip && activeInterval && countdown === null && (
          <SkipButton
            type={activeSkip}
            interval={activeInterval}
            currentTime={currentTime}
            bottomClass={skipOffset}
            onSkip={() => seekTo(activeInterval.end)}
          />
        )}

        {countdown !== null && nextEpisode && (
          <CountdownOverlay
            episode={nextEpisode}
            countdown={countdown}
            onSkip={() => { setCountdown(null); onNextEpisodeRef.current?.(); }}
            onCancel={() => setCountdown(null)}
          />
        )}
      </MediaPlayer>
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

// ── Skip button ───────────────────────────────────────────────────────

function SkipButton({
  type,
  interval,
  currentTime,
  bottomClass = "bottom-[4.5rem]",
  onSkip,
}: {
  type: "intro" | "outro";
  interval: SkipInterval;
  currentTime: number;
  bottomClass?: string;
  onSkip: () => void;
}) {
  const t = useT();
  const label = type === "intro" ? t("watch.skipIntro") : t("watch.skipCredits");
  const elapsed   = Math.max(0, currentTime - interval.start);
  const total     = interval.end - interval.start;
  const remaining = Math.max(0, Math.ceil(interval.end - currentTime));
  const progress  = total > 0 ? Math.min(1, elapsed / total) : 0;

  return (
    <button
      onClick={onSkip}
      className={`absolute ${bottomClass} right-4 z-50 group flex flex-col overflow-hidden rounded-2xl border border-violet-400/25 bg-black/75 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-violet-400/45 hover:bg-black/85 active:scale-[0.98] animate-in slide-in-from-right-4 fade-in duration-200`}
      style={{ minWidth: 156 }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20 ring-1 ring-violet-400/30 shrink-0">
          <SkipForward className="w-3.5 h-3.5 text-violet-200 group-hover:text-white transition-colors" />
        </span>
        <span className="text-sm font-semibold text-white leading-none">{label}</span>
        <span className="ml-auto text-[11px] font-mono text-white/40 group-hover:text-violet-200/70 transition-colors shrink-0 leading-none tabular-nums">
          {remaining}s
        </span>
      </div>
      <div className="relative h-1 w-full bg-white/[0.06]">
        <div
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </button>
  );
}

// ── Next episode button ───────────────────────────────────────────────

function NextEpisodeButton({
  episode,
  onClick,
}: {
  episode: { number: number; title: string };
  onClick: () => void;
}) {
  const t = useT();
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : t("watch.episode", { n: episode.number });

  return (
    <button
      onClick={onClick}
      className="absolute bottom-[4.5rem] right-4 z-50 group flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-2xl border border-white/15 bg-black/75 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-violet-400/35 hover:bg-black/85 active:scale-[0.98] animate-in slide-in-from-right-4 fade-in duration-200"
      style={{ maxWidth: 280 }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-400/25 shrink-0">
        <ChevronRight className="w-4 h-4 text-violet-300 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
      </span>
      <div className="flex flex-col items-start min-w-0">
        <span className="text-[10px] font-medium uppercase tracking-wider text-violet-300/60 group-hover:text-violet-200/80 transition-colors leading-none mb-1">
          {t("watch.nextEpisode")}
        </span>
        <span className="text-sm font-semibold text-white leading-tight truncate w-full">
          {title}
        </span>
      </div>
    </button>
  );
}

// ── End-of-episode countdown overlay ─────────────────────────────────

function CountdownOverlay({
  episode,
  countdown,
  onSkip,
  onCancel,
}: {
  episode: { number: number; title: string };
  countdown: number;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const title =
    episode.title && episode.title.toLowerCase() !== `episode ${episode.number}`
      ? episode.title
      : t("watch.episode", { n: episode.number });

  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - countdown / 5);

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-4 pl-4 pr-5 py-4 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl shadow-[0_12px_48px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] animate-in slide-in-from-right-6 fade-in duration-300">
        <div className="relative w-12 h-12 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle
              cx="24" cy="24" r="20" fill="none"
              stroke="url(#countdown-gradient)" strokeWidth="3"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
            <defs>
              <linearGradient id="countdown-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white tabular-nums">
            {countdown}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-medium uppercase tracking-wider text-violet-300/60 leading-none mb-1">{t("watch.upNext")}</span>
          <span className="text-sm font-semibold text-white leading-tight truncate max-w-[180px]">
            {title}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 text-white text-xs font-bold hover:from-violet-500 hover:to-violet-400 transition-all shadow-lg shadow-violet-900/40"
          >
            {t("watch.playNow")} <ChevronRight className="w-3 h-3" />
          </button>
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-xl bg-white/[0.06] text-white/50 text-xs font-medium hover:bg-white/10 hover:text-white/80 transition-colors ring-1 ring-white/10"
          >
            <X className="w-3 h-3" /> {t("watch.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
