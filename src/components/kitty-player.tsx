"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "video.js/dist/video-js.css";
import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes, SkipInterval } from "@/query/use-aniskip";
import { isSubtitleTrack, labelToLanguage } from "@/lib/subtitle-track-utils";
import { subtitleSettingsToCssVars } from "@/lib/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import { SkipForward, ChevronRight, X } from "lucide-react";
import { buildKittyHlsUrl } from "@/lib/kitty-hls-url";
import { createVideoJsHtml5Options } from "@/lib/videojs-config";
import { useT } from "@/providers/i18n-provider";
import { useAnime4KUpscaler } from "@/hooks/use-anime4k-upscaler";
import {
  exitElementFullscreen,
  isElementFullscreen,
  requestElementFullscreen,
} from "@/lib/fullscreen";
import { bindPipCaptionSync } from "@/lib/pip-captions";

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
  preferSubtitles?: boolean;
  preferDubAudio?: boolean;
}

type SubTrack = { file: string; label?: string; default?: boolean };

function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}

function isTextSubtitleTrack(track: TextTrack): boolean {
  return track.kind === "subtitles" || track.kind === "captions";
}

function activateSubtitles(
  player: Player,
  subTracks: SubTrack[],
  preferSubtitles: boolean,
): boolean {
  if (subTracks.length === 0) return true;

  const textTracks = player.textTracks();
  const trackList = Array.from(textTracks as unknown as TextTrack[]);
  if (!trackList.length) return false;

  if (!preferSubtitles) {
    let alreadyOff = true;
    for (const track of trackList) {
      if (isTextSubtitleTrack(track) && track.mode !== "disabled") {
        alreadyOff = false;
        break;
      }
    }
    if (alreadyOff) return true;
    for (const track of trackList) {
      if (isTextSubtitleTrack(track)) track.mode = "disabled";
    }
    return true;
  }

  const preferred = subTracks.find((t) => t.default) ?? subTracks[0];
  const preferredLang = labelToLanguage(preferred.label || "");

  let target: TextTrack | undefined;
  for (const track of trackList) {
    if (!isTextSubtitleTrack(track)) continue;
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
    target = trackList.find(isTextSubtitleTrack);
  }
  if (!target) return false;

  let alreadyActive = target.mode === "showing";
  if (alreadyActive) {
    for (const track of trackList) {
      if (!isTextSubtitleTrack(track) || track === target) continue;
      if (track.mode !== "disabled") {
        alreadyActive = false;
        break;
      }
    }
  }
  if (alreadyActive) return true;

  for (const track of trackList) {
    if (isTextSubtitleTrack(track)) track.mode = "disabled";
  }
  target.mode = "showing";
  return true;
}

function pickAudioTrack(player: Player, preferDubAudio: boolean): boolean {
  const audioTracks = player.audioTracks();
  const trackList = Array.from(audioTracks as unknown as Array<{
    id: string;
    label?: string;
    language?: string;
    enabled: boolean;
  }>);
  if (trackList.length === 0) return false;
  if (trackList.length < 2) return true;

  type AudioTrackLike = { id: string; label?: string; language?: string; enabled: boolean };

  const labelOf = (track: AudioTrackLike) =>
    `${track.label ?? ""} ${track.language ?? ""}`.toLowerCase();

  const isDubLike = (track: AudioTrackLike) => {
    const text = labelOf(track);
    return (
      /\bdub\b/.test(text) ||
      /\benglish\b/.test(text) ||
      text === "en" ||
      text.startsWith("en-") ||
      text.includes(" eng")
    );
  };

  const isSubLike = (track: AudioTrackLike) => {
    const text = labelOf(track);
    return (
      /\bjapanese\b/.test(text) ||
      /\bja\b/.test(text) ||
      text === "ja" ||
      text.startsWith("ja-") ||
      /\bsub\b/.test(text)
    );
  };

  const preferred =
    (preferDubAudio
      ? trackList.find(isDubLike) ??
        trackList.find((t) => !isSubLike(t)) ??
        trackList[trackList.length - 1]
      : trackList.find(isSubLike) ??
        trackList.find((t) => !isDubLike(t)) ??
        trackList[0]) ?? null;

  if (!preferred) return true;

  let changed = false;
  for (const track of trackList) {
    const next = track.id === preferred.id;
    if (track.enabled !== next) {
      track.enabled = next;
      changed = true;
    }
  }
  return !changed || true;
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
  const anime4kEnabled = useSettingsStore((s) => s.anime4kEnabled);
  const anime4kMode = useSettingsStore((s) => s.anime4kMode);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  const activateSubtitlesRef = useRef<() => void>(() => {});
  const subtitleCooldownRef = useRef(false);

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
  const onEndedRef = useRef(onEndedProp);
  useEffect(() => { onEndedRef.current = onEndedProp; }, [onEndedProp]);
  const nextEpisodeRef = useRef(nextEpisode);
  useEffect(() => { nextEpisodeRef.current = nextEpisode; }, [nextEpisode]);
  const anime4kEnabledRef = useRef(anime4kEnabled);
  useEffect(() => { anime4kEnabledRef.current = anime4kEnabled; }, [anime4kEnabled]);

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

  useAnime4KUpscaler(
    containerRef,
    canvasRef,
    anime4kEnabled,
    anime4kMode,
    proxiedSrc ?? src,
  );

  const autoFsRef = useRef(false);
  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

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

  const reportW2g = useCallback((isPlaying: boolean, time: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime: time });
    lastW2gReportRef.current = time;
  }, []);

  // Initialize Video.js once per mount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const player = videojs(el, {
      controls: true,
      autoplay: true,
      preload: "auto",
      fluid: false,
      fill: true,
      responsive: false,
      poster: poster || undefined,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      html5: createVideoJsHtml5Options(),
      controlBar: {
        pictureInPictureToggle: true,
        volumePanel: { inline: false },
      },
    });

    playerRef.current = player;

    const handleTimeUpdate = () => {
      const t = player.currentTime() ?? 0;
      const dur = player.duration() ?? 0;
      const st = skipRef.current;

      onLiveTimeRef.current?.(t, dur);

      if (dur > 0) setDuration((prev) => (Math.abs(dur - prev) > 0.5 ? dur : prev));

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
        reportW2g(!player.paused(), t);
      }
    };

    const handleCanPlay = () => {
      const t = startTimeRef.current;
      if (t > 10) player.currentTime(t);

      if (autoFsRef.current) {
        autoFsRef.current = false;
        const stage = containerRef.current;
        if (anime4kEnabledRef.current && stage) {
          requestElementFullscreen(stage).catch(() => {});
        } else {
          player.requestFullscreen().catch(() => {
            stage?.requestFullscreen().catch(() => {});
          });
        }
      }
    };

    const handlePlay = () => {
      if (!startFiredRef.current) {
        startFiredRef.current = true;
        onStartRef.current?.();
      }
      reportW2g(true, player.currentTime() ?? 0);
    };

    const handlePause = () => {
      const t = player.currentTime() ?? 0;
      const dur = player.duration() ?? 0;
      if (t > 5 && dur > 0) onProgressRef.current?.(t, dur);
      reportW2g(false, t);
    };

    const handleEnded = () => {
      onEndedRef.current?.();
      if (nextEpisodeRef.current) setCountdown(5);
    };

    player.on("timeupdate", handleTimeUpdate);
    player.on("canplay", handleCanPlay);
    player.on("play", handlePlay);
    player.on("pause", handlePause);
    player.on("ended", handleEnded);

    return () => {
      player.off("timeupdate", handleTimeUpdate);
      player.off("canplay", handleCanPlay);
      player.off("play", handlePlay);
      player.off("pause", handlePause);
      player.off("ended", handleEnded);
      if (!player.isDisposed()) player.dispose();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load / swap HLS source.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed() || !proxiedSrc) return;

    player.src({ src: proxiedSrc, type: "application/x-mpegurl" });
    if (poster) player.poster(poster);
  }, [proxiedSrc, poster]);

  // Remote subtitle tracks.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    const remote = Array.from(player.remoteTextTracks() as unknown as TextTrack[]);
    for (let i = remote.length - 1; i >= 0; i--) {
      player.removeRemoteTextTrack(remote[i]);
    }

    subTracks.forEach((track, i) => {
      player.addRemoteTextTrack(
        {
          kind: "subtitles",
          src: track.file,
          srclang: labelToLanguage(track.label || ""),
          label: track.label || `Track ${i + 1}`,
          default: false,
        },
        false,
      );
    });
  }, [subTracksKey, proxiedSrc, subTracks]);

  // Subtitle activation.
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed() || subTracks.length === 0) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const tryActivate = () => {
      if (subtitleCooldownRef.current) return;
      if (activateSubtitles(player, subTracks, preferSubtitles)) return;
      if (attempts++ < 16) retryTimer = setTimeout(tryActivate, 350);
    };

    activateSubtitlesRef.current = tryActivate;

    let tracksChangeTimer: ReturnType<typeof setTimeout> | undefined;
    const onTracksChange = () => {
      if (subtitleCooldownRef.current) return;
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
      tracksChangeTimer = setTimeout(tryActivate, 80);
    };

    const textTracks = player.textTracks();
    textTracks.addEventListener("change", onTracksChange);
    player.on("canplay", tryActivate);
    player.on("loadedmetadata", tryActivate);
    tryActivate();

    return () => {
      textTracks.removeEventListener("change", onTracksChange);
      player.off("canplay", tryActivate);
      player.off("loadedmetadata", tryActivate);
      if (retryTimer) clearTimeout(retryTimer);
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
    };
  }, [proxiedSrc, subTracksKey, preferSubtitles, subTracks]);

  // HLS audio track selection (sub vs dub).
  useEffect(() => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const tryPick = () => {
      if (pickAudioTrack(player, preferDubAudio)) {
        window.setTimeout(() => activateSubtitlesRef.current(), 150);
        return;
      }
      if (attempts++ < 12) retryTimer = setTimeout(tryPick, 350);
    };

    const onAudioChange = () => tryPick();
    const audioTracks = player.audioTracks();
    audioTracks.addEventListener("change", onAudioChange);
    audioTracks.addEventListener("addtrack", onAudioChange);
    player.on("canplay", tryPick);
    player.on("loadedmetadata", tryPick);
    tryPick();

    return () => {
      audioTracks.removeEventListener("change", onAudioChange);
      audioTracks.removeEventListener("addtrack", onAudioChange);
      player.off("canplay", tryPick);
      player.off("loadedmetadata", tryPick);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [proxiedSrc, preferDubAudio]);

  // Anime4K: fullscreen targets the stage wrapper.
  useEffect(() => {
    if (!anime4kEnabled) return;
    const player = playerRef.current;
    const stage = containerRef.current;
    if (!player || player.isDisposed() || !stage) return;

    const syncFsAttr = () => {
      if (isElementFullscreen(stage)) stage.setAttribute("data-fullscreen", "");
      else stage.removeAttribute("data-fullscreen");
    };

    const onFsClick = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (isElementFullscreen(stage)) {
        exitElementFullscreen().then(syncFsAttr).catch(() => {});
      } else {
        requestElementFullscreen(stage).then(syncFsAttr).catch(() => {});
      }
    };

    const onFullscreenChange = () => syncFsAttr();

    let fsBtn: HTMLElement | null = null;
    player.ready(() => {
      fsBtn = stage.querySelector(".vjs-fullscreen-control");
      fsBtn?.addEventListener("click", onFsClick, true);
    });

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    return () => {
      fsBtn?.removeEventListener("click", onFsClick, true);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, [anime4kEnabled, proxiedSrc]);

  // PiP caption routing.
  useEffect(() => {
    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || player.isDisposed() || !container) return;
    return bindPipCaptionSync(container, player);
  }, [proxiedSrc, anime4kEnabled]);

  // W2G guest sync.
  useEffect(() => {
    const cfg = w2gRef.current;
    if (!cfg || cfg.isHost || !cfg.syncState) return;
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;

    const { version, isPlaying, currentTime: syncTime } = cfg.syncState;
    if (version === lastAppliedW2gVersion.current) return;
    lastAppliedW2gVersion.current = version;
    applyingW2gRef.current = true;

    const current = player.currentTime() ?? 0;
    if (Math.abs(current - syncTime) > 2.5) player.currentTime(syncTime);
    if (isPlaying && player.paused()) player.play()?.catch(() => {});
    else if (!isPlaying && !player.paused()) player.pause();

    window.setTimeout(() => {
      applyingW2gRef.current = false;
    }, 600);
  }, [w2g?.syncState]);

  // Countdown → next episode.
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

  // Intro/outro markers on the progress bar.
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
      container.querySelectorAll(".kitty-skip-marker").forEach((el) => el.remove());
    };
  }, [duration, skipTimes]);

  const seekTo = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player || player.isDisposed()) return;
    player.currentTime(time);
    player.play()?.catch(() => {});
    setActiveSkip(null);
  }, []);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro" ? skipTimes?.intro : activeSkip === "outro" ? skipTimes?.outro : undefined;

  const nearEnd = duration > 60 && currentTime >= duration - 90;
  const showNext = !!nextEpisode && (nearEnd || activeSkip === "outro") && countdown === null;
  const skipOffset = showNext ? "bottom-[8.5rem]" : "bottom-[4.5rem]";

  return (
    <div
      ref={containerRef}
      className="kitty-player relative w-full bg-black overflow-hidden ring-1 ring-white/[0.08] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)]"
      style={{
        aspectRatio: "16/9",
        ...(subtitleCssVars as React.CSSProperties),
      }}
      data-anime4k={anime4kEnabled ? "true" : undefined}
    >
      <div data-vjs-player className="absolute inset-0">
        <video
          ref={videoRef}
          className="video-js vjs-default-skin vjs-big-play-centered w-full h-full"
          playsInline
          crossOrigin="anonymous"
        />
      </div>

      {anime4kEnabled && (
        <canvas
          ref={canvasRef}
          className="anime4k-canvas pointer-events-none"
          aria-hidden
        />
      )}

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
  const elapsed = Math.max(0, currentTime - interval.start);
  const total = interval.end - interval.start;
  const remaining = Math.max(0, Math.ceil(interval.end - currentTime));
  const progress = total > 0 ? Math.min(1, elapsed / total) : 0;

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
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke="url(#countdown-gradient)"
              strokeWidth="3"
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
          <span className="text-[10px] font-medium uppercase tracking-wider text-violet-300/60 leading-none mb-1">
            {t("watch.upNext")}
          </span>
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
