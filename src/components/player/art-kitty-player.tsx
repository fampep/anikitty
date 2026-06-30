"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import type { Option } from "artplayer";
import Hls from "hls.js";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import { buildKittyHlsUrl } from "@/lib/kitty/kitty-hls-url";
import { createHlsConfig } from "@/lib/kitty/hls-config";
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
  detectSubtitleFormat,
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

function isArtPaused(art: Artplayer): boolean {
  return art.video?.paused ?? true;
}

function shouldResumeAt(time: number, duration: number): boolean {
  if (time <= 10) return false;
  if (duration > 0 && time >= duration - 30) return false;
  return true;
}

function resolveTrackSrc(file: string): string {
  if (!file) return file;
  if (/^https?:\/\//i.test(file)) return file;
  if (typeof window !== "undefined" && file.startsWith("/")) {
    return `${window.location.origin}${file}`;
  }
  return file;
}

function generateHighlights(
  start: number | undefined | null,
  end: number | undefined | null,
  label: string,
): { time: number; text: string }[] {
  if (start == null || end == null || start >= end) return [];
  const highlights: { time: number; text: string }[] = [];
  for (let time = Math.floor(start); time <= Math.floor(end); time++) {
    highlights.push({ time, text: label });
  }
  return highlights;
}

function disableNativeTextTracks(video: HTMLVideoElement | null | undefined) {
  if (!video?.textTracks) return;
  for (let i = 0; i < video.textTracks.length; i++) {
    video.textTracks[i].mode = "disabled";
  }
}

function applySubtitleStyles(
  art: Artplayer,
  settings: {
    fontSize: number;
    color: string;
    fontWeight: number;
    backgroundOpacity: number;
    bottomOffset: number;
  },
) {
  const scaled = Math.max(14, Math.min(32, art.height * 0.04, settings.fontSize + 4));
  art.subtitle.style({
    color: settings.color,
    fontSize: `${scaled}px`,
    fontWeight: String(settings.fontWeight),
    textShadow: "2px 2px 4px rgba(0,0,0,0.85)",
  });

  const root = art.template?.$player as HTMLElement | undefined;
  if (root) {
    root.style.setProperty("--art-subtitle-bottom", `${settings.bottomOffset * 16}px`);
  }

  const subEl = art.template?.$subtitle as HTMLElement | undefined;
  if (subEl && settings.backgroundOpacity > 0) {
    subEl.style.setProperty(
      "--art-subtitle-bg",
      `rgba(0,0,0,${settings.backgroundOpacity / 100})`,
    );
  }
}

export default function ArtKittyPlayer({
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
  onEnded,
  w2g,
  preferSubtitles = true,
}: VideoPlayerProps) {
  const t = useT();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const autoNextRef = useRef(useSettingsStore.getState().autoPlay);
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");

  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onOutroStartRef = useRef(onOutroStart);
  const onEndedRef = useRef(onEnded);
  const skipTimesRef = useRef(skipTimes);
  const w2gRef = useRef(w2g);
  const startFiredRef = useRef(false);
  const outroFiredRef = useRef(false);
  const lastProgressTs = useRef(0);
  const skipUiRef = useRef<"intro" | "outro" | null>(null);
  const lastUiTimeRef = useRef(0);
  const lastW2gReportRef = useRef(0);
  const lastAppliedW2gVersion = useRef(0);
  const applyingW2gRef = useRef(false);
  const autoFsRef = useRef(false);
  const durationRef = useRef(0);
  const startTimeRef = useRef(startTime);
  const resumeAppliedRef = useRef(false);
  const isPlayerFullscreenRef = useRef(false);

  const syncPlayerOrientation = useCallback(() => {
    const nativeFs = isElementFullscreen(wrapperRef.current);
    const cls = resolvePlayerOrientClass({
      isFullscreen: nativeFs || isPlayerFullscreenRef.current,
    });
    setOrientClass(cls);
  }, []);

  const syncPlayerOrientationRef = useRef(syncPlayerOrientation);
  useEffect(() => {
    syncPlayerOrientationRef.current = syncPlayerOrientation;
  }, [syncPlayerOrientation]);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  useEffect(() => { onOutroStartRef.current = onOutroStart; }, [onOutroStart]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { skipTimesRef.current = skipTimes; }, [skipTimes]);
  useEffect(() => { w2gRef.current = w2g; }, [w2g]);

  useEffect(() => {
    if (autoFullscreen) autoFsRef.current = true;
  }, [autoFullscreen]);

  useEffect(() => {
    const sync = () => syncPlayerOrientationRef.current();
    const onFsChange = () => {
      const nativeFs = isElementFullscreen(wrapperRef.current);
      if (nativeFs) {
        void tryLockLandscapeOrientation();
      } else if (!isPlayerFullscreenRef.current) {
        void tryUnlockScreenOrientation();
      }
      sync();
    };

    sync();
    const offOrient = onPlayerOrientationChange(sync);
    const offFs = onFullscreenChange(onFsChange);
    return () => {
      offOrient();
      offFs();
      isPlayerFullscreenRef.current = false;
      void tryUnlockScreenOrientation();
    };
  }, []);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      onNextEpisodeRef.current?.();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const proxiedSrc = buildKittyHlsUrl(src, headers);

  const reportW2g = useCallback((isPlaying: boolean, time: number) => {
    const cfg = w2gRef.current;
    if (!cfg?.isHost || applyingW2gRef.current) return;
    cfg.onPlaybackSync?.({ isPlaying, currentTime: time });
    lastW2gReportRef.current = time;
  }, []);

  const seekTo = useCallback((time: number) => {
    const art = artRef.current;
    if (art) {
      art.seek = time;
      art.play();
    }
    setActiveSkip(null);
    skipUiRef.current = null;
  }, []);

  const applyResume = useCallback((art: Artplayer) => {
    const resumeAt = startTimeRef.current;
    const dur = art.duration || durationRef.current;
    if (!shouldResumeAt(resumeAt, dur)) {
      resumeAppliedRef.current = true;
      return;
    }
    if (resumeAppliedRef.current) return;
    if (Math.abs(art.currentTime - resumeAt) <= 2) {
      resumeAppliedRef.current = true;
      return;
    }
    art.seek = resumeAt;
  }, []);

  useEffect(() => {
    startFiredRef.current = false;
    outroFiredRef.current = false;
    lastProgressTs.current = 0;
    skipUiRef.current = null;
    resumeAppliedRef.current = false;
    setActiveSkip(null);
    setCurrentTime(0);
    setCountdown(null);
    durationRef.current = 0;
    setDuration(0);
  }, [proxiedSrc]);

  useEffect(() => {
    const art = artRef.current;
    if (!art) return;
    resumeAppliedRef.current = false;
    applyResume(art);
  }, [startTime, applyResume]);

  useEffect(() => {
    const art = artRef.current;
    if (!art) return;
    applySubtitleStyles(art, subtitleSettings);
  }, [subtitleSettings]);

  useEffect(() => {
    const cfg = w2gRef.current;
    if (!cfg || cfg.isHost || !cfg.syncState) return;
    const art = artRef.current;
    if (!art) return;

    const { version, isPlaying, currentTime: syncTime } = cfg.syncState;
    if (version === lastAppliedW2gVersion.current) return;
    lastAppliedW2gVersion.current = version;
    applyingW2gRef.current = true;

    if (Math.abs(art.currentTime - syncTime) > 2.5) {
      art.seek = syncTime;
    }
    if (isPlaying && isArtPaused(art)) {
      art.play();
    } else if (!isPlaying && !isArtPaused(art)) {
      art.pause();
    }

    window.setTimeout(() => {
      applyingW2gRef.current = false;
    }, 600);
  }, [w2g?.syncState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !proxiedSrc) return;

    const subTracks = tracks.filter(isSubtitleTrack).map((track) => ({
      ...track,
      file: resolveTrackSrc(track.file),
    }));
    const hasExternalSubs = subTracks.length > 0;

    const defaultSub = subTracks.find((tr) => tr.default) ?? subTracks[0];
    const defaultSubType = defaultSub
      ? detectSubtitleFormat({ url: defaultSub.file, label: defaultSub.label })
      : "vtt";

    const subtitleOption: Option["subtitle"] =
      preferSubtitles && defaultSub
        ? {
            url: defaultSub.file,
            type: defaultSubType,
            style: {
              color: subtitleSettings.color,
              fontSize: `${subtitleSettings.fontSize}px`,
              textShadow: "2px 2px 4px rgba(0,0,0,0.85)",
            },
          }
        : undefined;

    const subtitleSelector = subTracks.map((track) => ({
      html: track.label || labelToLanguage(track.label || ""),
      url: track.file,
      type: detectSubtitleFormat({ url: track.file, label: track.label }),
    }));

    let hlsForCleanup: Hls | null = null;

    const art = new Artplayer({
      container,
      url: proxiedSrc,
      type: "m3u8",
      volume: 0.85,
      autoplay: true,
      muted: false,
      pip: true,
      setting: true,
      playbackRate: true,
      aspectRatio: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      screenshot: true,
      backdrop: false,
      autoPlayback: true,
      autoSize: false,
      autoMini: false,
      mutex: true,
      playsInline: true,
      theme: "#c084fc",
      lang: "en",
      moreVideoAttr: { crossOrigin: "anonymous" },
      subtitle: subtitleOption,
      customType: {
        m3u8(video, url, player) {
          if (Hls.isSupported()) {
            hlsRef.current?.destroy();
            const hls = new Hls(
              createHlsConfig({ enableWebVTT: !hasExternalSubs }),
            );
            hls.loadSource(url);
            hls.attachMedia(video as HTMLMediaElement);
            hlsRef.current = hls;
            hlsForCleanup = hls;
            player.on("destroy", () => {
              hls.destroy();
              if (hlsRef.current === hls) hlsRef.current = null;
            });
          } else if ((video as HTMLVideoElement).canPlayType("application/vnd.apple.mpegurl")) {
            (video as HTMLVideoElement).src = url;
          } else {
            player.notice.show = "HLS is not supported in this browser.";
          }
        },
      },
      plugins: [
        artplayerPluginHlsControl({
          quality: {
            control: true,
            setting: true,
            getName: (level: { height?: number; bitrate?: number }) => {
              if (!level.height) return "Auto";
              const tier = level.height <= 480 ? "SD" : level.height <= 720 ? "HD" : "FHD";
              return `${tier} ${level.height}P`;
            },
            title: "Quality",
            auto: "Auto",
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name ?? "Audio",
            title: "Audio",
            auto: "Auto",
          },
        }),
      ],
      highlight: [
        ...generateHighlights(skipTimes?.intro?.start, skipTimes?.intro?.end, "Intro"),
        ...generateHighlights(skipTimes?.outro?.start, skipTimes?.outro?.end, "Outro"),
      ],
      settings: [
        {
          html: t("watch.artAutoNext"),
          tooltip: t("watch.artAutoNextHint"),
          switch: autoNextRef.current,
          onSwitch(item) {
            autoNextRef.current = item.switch;
            return item.switch;
          },
        },
        {
          width: 220,
          html: "Subtitle",
          tooltip: "Subtitle",
          selector: [
            {
              html: "Display",
              tooltip: preferSubtitles ? "Hide" : "Show",
              switch: preferSubtitles,
              onSwitch(item) {
                const show = !item.switch;
                art.subtitle.show = show;
                item.tooltip = show ? "Hide" : "Show";
                return show;
              },
            },
            ...subtitleSelector,
          ],
          onSelect(item: { html?: string; url?: string; type?: string }) {
            if (item.url) {
              const type = (item.type as "vtt" | "srt" | "ass" | undefined)
                ?? detectSubtitleFormat({ url: item.url, label: item.html });
              art.subtitle.switch(item.url, { name: item.html, type });
            }
            return item.html ?? "Subtitle";
          },
        },
      ],
    });

    artRef.current = art;

    art.on("ready", () => {
      applySubtitleStyles(art, subtitleSettings);
      applyResume(art);

      if (hasExternalSubs) {
        disableNativeTextTracks(art.video);
        art.video?.textTracks?.addEventListener("addtrack", () => {
          disableNativeTextTracks(art.video);
        });
      }

      if (autoFsRef.current) {
        autoFsRef.current = false;
        const target = wrapperRef.current ?? container;
        requestElementFullscreen(target)
          .then(() => {
            void tryLockLandscapeOrientation();
            syncPlayerOrientationRef.current();
          })
          .catch(() => {
            art.fullscreen = true;
            isPlayerFullscreenRef.current = true;
            void tryLockLandscapeOrientation();
            syncPlayerOrientationRef.current();
          });
      }
    });

    art.on("fullscreen", (enabled: boolean) => {
      isPlayerFullscreenRef.current = enabled;
      if (enabled) {
        void tryLockLandscapeOrientation();
      } else if (!isElementFullscreen(wrapperRef.current)) {
        void tryUnlockScreenOrientation();
      }
      syncPlayerOrientationRef.current();
    });

    art.on("resize", () => {
      applySubtitleStyles(art, subtitleSettings);
    });

    art.on("video:canplay", () => {
      applyResume(art);
    });

    art.on("video:loadedmetadata", () => {
      applyResume(art);
    });

    art.on("play", () => {
      if (!startFiredRef.current) {
        startFiredRef.current = true;
        onStartRef.current?.();
      }
      reportW2g(true, art.currentTime);
    });

    art.on("pause", () => {
      const current = art.currentTime;
      const dur = art.duration;
      if (current > 5 && dur > 0) onProgressRef.current?.(current, dur);
      reportW2g(false, current);
    });

    art.on("video:timeupdate", () => {
      const current = art.currentTime;
      const dur = art.duration;
      onLiveTimeRef.current?.(current, dur);

      if (dur > 0 && Math.abs(dur - durationRef.current) > 0.5) {
        durationRef.current = dur;
        setDuration(dur);
      }

      const st = skipTimesRef.current;
      let nextSkip: "intro" | "outro" | null = null;
      if (st?.intro && current >= st.intro.start && current < st.intro.end) {
        nextSkip = "intro";
      } else if (st?.outro && current >= st.outro.start && current < st.outro.end) {
        nextSkip = "outro";
        if (!outroFiredRef.current && dur > 0) {
          outroFiredRef.current = true;
          onOutroStartRef.current?.(dur);
        }
      }

      const skipChanged = nextSkip !== skipUiRef.current;
      if (skipChanged) {
        skipUiRef.current = nextSkip;
        setActiveSkip(nextSkip);
      }

      const uiInterval = nextSkip ? 0.25 : 1;
      if (skipChanged || current - lastUiTimeRef.current >= uiInterval) {
        lastUiTimeRef.current = current;
        setCurrentTime(current);
      }

      if (current > 5 && dur > 0) {
        const now = Date.now();
        if (now - lastProgressTs.current >= 10_000) {
          lastProgressTs.current = now;
          onProgressRef.current?.(current, dur);
        }
      }

      if (!resumeAppliedRef.current) {
        applyResume(art);
      }

      const cfg = w2gRef.current;
      if (cfg?.isHost && !applyingW2gRef.current && Math.abs(current - lastW2gReportRef.current) > 2.5) {
        reportW2g(!isArtPaused(art), current);
      }
    });

    art.on("video:ended", () => {
      onEndedRef.current?.();
      if (nextEpisode) {
        setCountdown(5);
      } else if (autoNextRef.current) {
        onNextEpisodeRef.current?.();
      }
    });

    return () => {
      art.destroy();
      artRef.current = null;
      if (hlsForCleanup) {
        hlsForCleanup.destroy();
        hlsForCleanup = null;
      }
      hlsRef.current = null;
    };
  }, [
    proxiedSrc,
    tracks,
    preferSubtitles,
    nextEpisode,
    skipTimes,
    subtitleSettings,
    t,
    reportW2g,
    applyResume,
  ]);

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

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "art-kitty-player kitty-stage relative w-full overflow-hidden rounded-xl bg-[#030303] shadow-[0_32px_100px_-24px_rgba(0,0,0,0.92)] ring-1 ring-white/[0.06]",
        orientClass,
      )}
      style={orientClass ? undefined : { aspectRatio: "16/9" }}
    >
      <div
        className="kitty-stage__glow pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-br from-violet-500/[0.12] via-transparent to-transparent opacity-80"
        aria-hidden
      />
      <div ref={containerRef} className="absolute inset-0" />

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
