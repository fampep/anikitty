"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { SkipInterval } from "@/hooks/use-aniskip";
import { isSubtitleTrack, labelToLanguage } from "@/lib/subtitles/subtitle-track-utils";
import { subtitleSettingsToCssVars } from "@/lib/subtitles/subtitle-settings";
import { useSettingsStore } from "@/store/settings-store";
import {
  MediaPlayer,
  MediaProvider,
  Track,
  type MediaPlayerInstance,
  isHLSProvider,
  type MediaProviderAdapter,
} from "@vidstack/react";
import { DefaultVideoLayout, defaultLayoutIcons } from "@vidstack/react/player/layouts/default";
import "@vidstack/react/player/styles/base.css";
import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/captions.css";
import "@vidstack/react/player/styles/default/layouts/video.css";
import { PlayerSkipButton } from "@/components/player/player-skip-button";
import { CountdownOverlay, NextEpisodeButton } from "@/components/player/player-overlays";
import { buildKittyHlsUrl } from "@/lib/kitty/kitty-hls-url";
import { createHlsConfig } from "@/lib/kitty/hls-config";
import Hls from "hls.js";
import { bindPipCaptionSync } from "@/lib/kitty/pip-captions";
import type { VideoPlayerProps } from "@/lib/kitty/video-player-types";

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

  const subTracksKey = useMemo(
    () => subTracks.map((t) => `${t.file}|${t.label ?? ""}`).join("\n"),
    [subTracks],
  );

  const subTracksRef = useRef(subTracks);
  useEffect(() => {
    subTracksRef.current = subTracks;
  }, [subTracksKey, subTracks]);

  const activateSubtitlesRef = useRef<() => void>(() => {});
  const subtitleCooldownRef = useRef(false);
  const subtitleActivationKeyRef = useRef("");

  useEffect(() => {
    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || !container) return;
    return bindPipCaptionSync(container, player);
  }, [proxiedSrc]);

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
    durationRef.current = 0;
    setDuration(0);
    subtitleActivationKeyRef.current = "";
  }, [src]);

  // Enable default subtitle track when available (Vidstack CC menu still allows switching/off).
  useEffect(() => {
    const player = playerRef.current;
    if (!player || subTracksKey.length === 0) return;

    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const isSubtitleTrack = (track: { kind?: string }) =>
      track.kind === "subtitles" || track.kind === "captions";

    const activationKey = `${subTracksKey}|${preferSubtitles ? "on" : "off"}`;

    const activate = (): boolean => {
      const configuredTracks = subTracksRef.current;
      if (configuredTracks.length === 0) return true;

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
        if (alreadyOff) {
          subtitleActivationKeyRef.current = activationKey;
          return true;
        }
        subtitleCooldownRef.current = true;
        for (const track of textTracks) {
          if (isSubtitleTrack(track)) track.setMode("disabled");
        }
        subtitleActivationKeyRef.current = activationKey;
        window.setTimeout(() => {
          subtitleCooldownRef.current = false;
        }, 400);
        return true;
      }

      const preferred = configuredTracks.find((t) => t.default) ?? configuredTracks[0];
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
      if (alreadyActive && subtitleActivationKeyRef.current === activationKey) return true;

      subtitleCooldownRef.current = true;
      for (const track of textTracks) {
        if (isSubtitleTrack(track)) track.setMode("disabled");
      }
      target.setMode("showing");
      subtitleActivationKeyRef.current = activationKey;
      window.setTimeout(() => {
        subtitleCooldownRef.current = false;
      }, 400);
      return true;
    };

    const tryActivate = () => {
      if (subtitleCooldownRef.current) return;
      if (subtitleActivationKeyRef.current === activationKey) return;
      if (activate()) return;
      if (attempts++ < 16) {
        retryTimer = setTimeout(tryActivate, 350);
      }
    };

    activateSubtitlesRef.current = tryActivate;

    let tracksChangeTimer: ReturnType<typeof setTimeout> | undefined;
    const onTracksChange = () => {
      if (subtitleCooldownRef.current) return;
      if (subtitleActivationKeyRef.current === activationKey) return;
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
      tracksChangeTimer = setTimeout(tryActivate, 200);
    };

    player.addEventListener("can-play", tryActivate);
    player.addEventListener("vds-text-tracks-change", onTracksChange);
    if (player.state.canPlay && subtitleActivationKeyRef.current !== activationKey) {
      tryActivate();
    }

    return () => {
      player.removeEventListener("can-play", tryActivate);
      player.removeEventListener("vds-text-tracks-change", onTracksChange);
      if (retryTimer) clearTimeout(retryTimer);
      if (tracksChangeTimer) clearTimeout(tracksChangeTimer);
      subtitleActivationKeyRef.current = "";
    };
  }, [proxiedSrc, subTracksKey, preferSubtitles]);

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
      let audioChanged = false;
      if (preferred && playerWithAudio.audioTrack?.id !== preferred.id) {
        playerWithAudio.audioTrack = preferred;
        audioChanged = true;
      }
      if (audioChanged) {
        window.setTimeout(() => activateSubtitlesRef.current(), 150);
      }
      return true;
    };

    const tryPick = () => {
      if (pickAudioTrack()) return;
      if (attempts++ < 12) retryTimer = setTimeout(tryPick, 350);
    };

    const onAudioTracksChange = () => {
      if (subtitleCooldownRef.current) return;
      tryPick();
    };

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

  const durationRef = useRef(0);

  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    const t   = player.currentTime;
    const dur = player.duration;
    const st  = skipRef.current;

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
      reportW2g(!player.paused, t);
    }
  }, [reportW2g]);

  const handleCanPlay = useCallback(() => {
    const t = startTimeRef.current;
    if (t > 10 && playerRef.current) playerRef.current.currentTime = t;

    // Re-enter fullscreen once the player is ready (binge-watch next-episode transition).
    // The wrapper div in VideoPlayerSection already holds fullscreen; calling
    // enterFullscreen here hands it over to Vidstack so its controls work correctly.
    if (autoFsRef.current) {
      autoFsRef.current = false;
      const stage = containerRef.current;
      playerRef.current?.enterFullscreen().catch(() => {
        stage?.requestFullscreen().catch(() => {});
      });
    }
  }, []);

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
  const overlayBottom = showNext ? "kitty-overlay--stacked" : "kitty-overlay--base";

  return (
    <div
      ref={containerRef}
      className="vds-kitty kitty-stage group/stage relative w-full overflow-hidden rounded-xl bg-[#030303] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.92)] ring-1 ring-white/[0.06]"
      style={{ aspectRatio: "16/9" }}
    >
      <div className="kitty-stage__glow pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-violet-500/[0.12] via-transparent to-transparent opacity-80" aria-hidden />

      <MediaPlayer
        ref={playerRef}
        src={{ src: proxiedSrc, type: "application/x-mpegurl" }}
        streamType="on-demand"
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


        <DefaultVideoLayout icons={defaultLayoutIcons} />

        {showNext && nextEpisode && (
          <NextEpisodeButton episode={nextEpisode} stackClass={overlayBottom} onClick={() => onNextEpisodeRef.current?.()} />
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
