"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Artplayer from "artplayer";
import type { Option } from "artplayer";
import Hls from "hls.js";
import { pickHlsAudioTrack } from "@/lib/kitty/hls-audio";
import LoadingGirl from "@/components/common/loading-girl";
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
  getTrackFile,
  isSubtitleTrack,
  labelToLanguage,
  type StreamTrack,
} from "@/lib/subtitles/subtitle-track-utils";
import { sanitizeVttOrSrtContent } from "@/lib/subtitles/vtt-parse";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import type { VideoPlayerProps } from "@/lib/kitty/video-player-types";
import type { SkipInterval } from "@/hooks/use-aniskip";
import { cn } from "@/lib/core/utils";
import { PlayerSkipButton } from "@/components/player/player-skip-button";
import { CountdownOverlay, NextEpisodeButton } from "@/components/player/player-overlays";
import {
  ANIKITTY_PLAYER_CSS_VAR,
  ANIKITTY_PLAYER_THEME,
} from "@/lib/kitty/artplayer-theme";

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

type SubtitleMode = "external" | "native" | "off";

function isEmbeddedTextTrackKind(kind: string): boolean {
  const k = kind.toLowerCase();
  return k === "subtitles" || k === "captions";
}

/** Disable HLS embedded subs/captions only — Artplayer uses a metadata track for external VTT. */
function disableEmbeddedTextTracks(video: HTMLVideoElement | null | undefined) {
  if (!video?.textTracks) return;
  for (let i = 0; i < video.textTracks.length; i++) {
    const track = video.textTracks[i];
    if (isEmbeddedTextTrackKind(track.kind)) {
      track.mode = "disabled";
    }
  }
}

/** Keep Artplayer's metadata cue track active so the .art-subtitle layer updates. */
function ensureArtplayerSubtitleTrack(art: Artplayer) {
  const track = art.subtitle?.textTrack;
  if (track && track.kind.toLowerCase() === "metadata") {
    track.mode = "hidden";
  }
}

function enableNativeHlsSubtitles(video: HTMLVideoElement | null | undefined) {
  if (!video?.textTracks) return false;
  let enabled = false;
  for (let i = 0; i < video.textTracks.length; i++) {
    const track = video.textTracks[i];
    const kind = track.kind.toLowerCase();
    if (kind === "metadata") continue;
    if (!enabled && isEmbeddedTextTrackKind(kind)) {
      track.mode = "showing";
      enabled = true;
    } else if (isEmbeddedTextTrackKind(kind)) {
      track.mode = "hidden";
    }
  }
  return enabled;
}

function handleTextTrackAdded(
  track: TextTrack,
  mode: SubtitleMode,
  onNativeSync: () => void,
) {
  const kind = track.kind.toLowerCase();
  if (mode === "external") {
    if (kind === "metadata") {
      track.mode = "hidden";
    } else if (isEmbeddedTextTrackKind(kind)) {
      track.mode = "disabled";
    }
    return;
  }
  onNativeSync();
}

function resolveSubtitleTracks(tracks: StreamTrack[]) {
  return tracks
    .filter(isSubtitleTrack)
    .map((track) => {
      const file = resolveTrackSrc(getTrackFile(track) ?? "");
      return { ...track, file };
    })
    .filter((track) => Boolean(track.file));
}

function buildSubtitleSwitchOptions(track: { file: string; label?: string }) {
  const type = detectSubtitleFormat({ url: track.file, label: track.label });
  return {
    name: track.label,
    type,
    encoding: "utf-8",
    escape: false,
    onVttLoad: (vtt: string) =>
      type === "ass" ? vtt : sanitizeVttOrSrtContent(vtt),
  };
}

function switchExternalSubtitle(
  art: Artplayer,
  url: string,
  track: { file: string; label?: string },
  settings: Parameters<typeof applySubtitleStyles>[1],
) {
  disableEmbeddedTextTracks(art.video);
  art.subtitle.show = true;
  void art.subtitle
    .switch(url, buildSubtitleSwitchOptions({ ...track, file: url }))
    .then(() => {
      ensureArtplayerSubtitleTrack(art);
      applySubtitleStyles(art, settings);
    })
    .catch(() => {});
}

function scheduleSubtitleReapply(apply: () => void): () => void {
  const timers = [0, 400, 1200].map((delay) => window.setTimeout(apply, delay));
  return () => timers.forEach((id) => window.clearTimeout(id));
}

function applySubtitleMode(
  art: Artplayer,
  tracks: StreamTrack[],
  preferSubtitles: boolean,
  settings: {
    fontSize: number;
    color: string;
    fontWeight: number;
    backgroundOpacity: number;
    bottomOffset: number;
  },
): SubtitleMode {
  const subTracks = resolveSubtitleTracks(tracks);

  if (preferSubtitles && subTracks.length > 0) {
    const active = subTracks.find((track) => track.default) ?? subTracks[0];
    const url = resolveTrackSrc(active.file);
    switchExternalSubtitle(art, url, { ...active, file: url }, settings);
    applySubtitleStyles(art, settings);
    return "external";
  }

  if (subTracks.length > 0) {
    art.subtitle.show = false;
    return "off";
  }

  art.subtitle.show = false;
  const nativeEnabled = enableNativeHlsSubtitles(art.video);
  return nativeEnabled ? "native" : "off";
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

function refreshHlsControls(art: Artplayer) {
  const plugin = art.plugins?.artplayerPluginHlsControl as { update?: () => void } | undefined;
  plugin?.update?.();
}

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
  onEnded,
  onPlayerReady,
  w2g,
  preferSubtitles = true,
  preferDubAudio = false,
}: VideoPlayerProps) {
  const t = useT();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const onPlayerReadyRef = useRef(onPlayerReady);
  useEffect(() => {
    onPlayerReadyRef.current = onPlayerReady;
  }, [onPlayerReady]);
  const autoNextRef = useRef(useSettingsStore.getState().autoPlay);
  const autoPlay = useSettingsStore((s) => s.autoPlay);
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);

  useEffect(() => {
    autoNextRef.current = autoPlay;
  }, [autoPlay]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");
  const [buffering, setBuffering] = useState(true);
  const [ready, setReady] = useState(false);

  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onOutroStartRef = useRef(onOutroStart);
  const onEndedRef = useRef(onEnded);
  const skipTimesRef = useRef(skipTimes);
  const w2gRef = useRef(w2g);
  const nextEpisodeRef = useRef(nextEpisode);
  const preferSubtitlesRef = useRef(preferSubtitles);
  const tracksRef = useRef(tracks);
  const subtitleModeRef = useRef<SubtitleMode>("off");
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
  const resumeSeekTargetRef = useRef<number | null>(null);
  const isPlayerFullscreenRef = useRef(false);
  const preferDubAudioRef = useRef(preferDubAudio);

  useEffect(() => {
    preferDubAudioRef.current = preferDubAudio;
  }, [preferDubAudio]);
  useEffect(() => {
    const hls = hlsRef.current;
    if (hls) pickHlsAudioTrack(hls, preferDubAudio);
  }, [preferDubAudio]);

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
  useEffect(() => { nextEpisodeRef.current = nextEpisode; }, [nextEpisode]);
  useEffect(() => { preferSubtitlesRef.current = preferSubtitles; }, [preferSubtitles]);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  const externalSubtitleSig = useMemo(
    () =>
      resolveSubtitleTracks(tracks)
        .map((track) => track.file)
        .join("|"),
    [tracks],
  );

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
      resumeSeekTargetRef.current = null;
      return;
    }
    if (resumeAppliedRef.current) return;
    if (Math.abs(art.currentTime - resumeAt) <= 2) {
      resumeAppliedRef.current = true;
      resumeSeekTargetRef.current = null;
      return;
    }
    if (resumeSeekTargetRef.current === resumeAt) return;
    resumeSeekTargetRef.current = resumeAt;
    art.seek = resumeAt;
  }, []);

  useEffect(() => {
    startFiredRef.current = false;
    outroFiredRef.current = false;
    lastProgressTs.current = 0;
    skipUiRef.current = null;
    resumeAppliedRef.current = false;
    resumeSeekTargetRef.current = null;
    setActiveSkip(null);
    setCurrentTime(0);
    setCountdown(null);
    durationRef.current = 0;
    setDuration(0);
    setBuffering(true);
    setReady(false);
  }, [proxiedSrc]);

  useEffect(() => {
    const art = artRef.current;
    if (!art || resumeAppliedRef.current) return;
    if (startFiredRef.current && art.currentTime > 5) return;
    applyResume(art);
  }, [startTime, applyResume]);

  const reapplyExternalSubtitles = useCallback(
    (art: Artplayer) => {
      const subTracks = resolveSubtitleTracks(tracksRef.current);
      if (!preferSubtitlesRef.current || subTracks.length === 0) return;
      subtitleModeRef.current = applySubtitleMode(
        art,
        tracksRef.current,
        preferSubtitlesRef.current,
        subtitleSettings,
      );
    },
    [subtitleSettings],
  );
  const reapplyExternalSubtitlesRef = useRef(reapplyExternalSubtitles);
  useEffect(() => {
    reapplyExternalSubtitlesRef.current = reapplyExternalSubtitles;
  }, [reapplyExternalSubtitles]);

  useEffect(() => {
    const art = artRef.current;
    if (!art || !ready) return;

    const apply = () => {
      if (!artRef.current) return;
      subtitleModeRef.current = applySubtitleMode(
        artRef.current,
        tracksRef.current,
        preferSubtitlesRef.current,
        subtitleSettings,
      );
    };

    apply();
    return scheduleSubtitleReapply(apply);
  }, [tracks, preferSubtitles, ready, subtitleSettings, externalSubtitleSig]);

  useEffect(() => {
    const art = artRef.current;
    if (!art || !ready || !externalSubtitleSig) return;
    if (!preferSubtitlesRef.current) return;

    const id = window.requestAnimationFrame(() => {
      reapplyExternalSubtitlesRef.current(art);
    });
    return () => window.cancelAnimationFrame(id);
  }, [externalSubtitleSig, ready, preferSubtitles]);

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

    const subTracks = resolveSubtitleTracks(tracksRef.current);
    const hasExternalSubs = subTracks.length > 0;
    const showSubs = preferSubtitlesRef.current;

    const defaultSub = subTracks.find((tr) => tr.default) ?? subTracks[0];
    const defaultSubType = defaultSub
      ? detectSubtitleFormat({ url: defaultSub.file, label: defaultSub.label })
      : "vtt";

    const subtitleOption: Option["subtitle"] =
      showSubs && defaultSub
        ? {
            url: defaultSub.file,
            type: defaultSubType,
            encoding: "utf-8",
            escape: false,
            onVttLoad: (vtt: string) =>
              defaultSubType === "ass" ? vtt : sanitizeVttOrSrtContent(vtt),
            style: {
              color: subtitleSettings.color,
              fontSize: `${subtitleSettings.fontSize}px`,
              textShadow: "2px 2px 4px rgba(0,0,0,0.85)",
            },
          }
        : undefined;

    const subtitleSelector = subTracks.map((track) => {
      const type = detectSubtitleFormat({ url: track.file, label: track.label });
      return {
        html: track.label || labelToLanguage(track.label || ""),
        url: track.file,
        type,
        encoding: "utf-8",
        escape: false,
        onVttLoad: (vtt: string) => (type === "ass" ? vtt : sanitizeVttOrSrtContent(vtt)),
      };
    });

    let hlsForCleanup: Hls | null = null;
    let hlsNetworkRecoveries = 0;
    subtitleModeRef.current =
      showSubs && hasExternalSubs ? "external" : hasExternalSubs ? "off" : "native";

    const shouldUseExternalSubs = () =>
      preferSubtitlesRef.current && resolveSubtitleTracks(tracksRef.current).length > 0;

    const syncNativeSubsIfNeeded = (video: HTMLVideoElement) => {
      if (subtitleModeRef.current === "external") {
        disableEmbeddedTextTracks(video);
        const currentArt = artRef.current;
        if (currentArt) ensureArtplayerSubtitleTrack(currentArt);
        return;
      }
      if (shouldUseExternalSubs()) {
        disableEmbeddedTextTracks(video);
        return;
      }
      const enabled = enableNativeHlsSubtitles(video);
      if (enabled) subtitleModeRef.current = "native";
    };

    const art = new Artplayer({
      container,
      url: proxiedSrc,
      type: "m3u8",
      theme: ANIKITTY_PLAYER_THEME,
      cssVar: ANIKITTY_PLAYER_CSS_VAR,
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
      autoPlayback: false,
      autoSize: false,
      autoMini: false,
      mutex: true,
      playsInline: true,
      lang: "en",
      moreVideoAttr: { crossOrigin: "anonymous" },
      subtitle: subtitleOption,
      customType: {
        m3u8(video, url, player) {
          if (Hls.isSupported()) {
            hlsRef.current?.destroy();
            const hls = new Hls(createHlsConfig({ enableWebVTT: !hasExternalSubs }));
            hls.loadSource(url);
            hls.attachMedia(video as HTMLMediaElement);
            player.hls = hls;
            hlsRef.current = hls;
            hlsForCleanup = hls;

            const tryPickAudio = () => {
              pickHlsAudioTrack(hls, preferDubAudioRef.current);
            };
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              tryPickAudio();
              refreshHlsControls(player);
              syncNativeSubsIfNeeded(video as HTMLVideoElement);
            });
            hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
              syncNativeSubsIfNeeded(video as HTMLVideoElement);
            });
            hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, () => {
              syncNativeSubsIfNeeded(video as HTMLVideoElement);
            });
            hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
              tryPickAudio();
              refreshHlsControls(player);
            });
            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (!data.fatal) return;
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
                return;
              }
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && hlsNetworkRecoveries < 3) {
                hlsNetworkRecoveries += 1;
                hls.startLoad();
              }
            });

            player.on("destroy", () => {
              hls.destroy();
              if (hlsRef.current === hls) hlsRef.current = null;
              player.hls = undefined;
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
              if (!level.height) return t("watch.streamAuto");
              const tier = level.height <= 480 ? "SD" : level.height <= 720 ? "HD" : "FHD";
              return `${tier} ${level.height}P`;
            },
            title: t("watch.streamQuality"),
            auto: t("watch.streamAuto"),
          },
          audio: {
            control: true,
            setting: true,
            getName: (track: { name?: string }) => track.name ?? t("watch.streamAudio"),
            title: t("watch.streamAudio"),
            auto: t("watch.streamAuto"),
          },
        }),
      ],
      highlight: [
        ...generateHighlights(skipTimes?.intro?.start, skipTimes?.intro?.end, "Intro"),
        ...generateHighlights(skipTimes?.outro?.start, skipTimes?.outro?.end, "Outro"),
      ],
      settings: [
        {
          width: 220,
          html: t("watch.artAutoNext"),
          tooltip: autoNextRef.current ? t("watch.on") : t("watch.off"),
          switch: autoNextRef.current,
          onSwitch(item) {
            const enabled = !item.switch;
            autoNextRef.current = enabled;
            useSettingsStore.getState().setAutoPlay(enabled);
            item.tooltip = enabled ? t("watch.on") : t("watch.off");
            art.notice.show = enabled
              ? t("watch.artAutoNextEnabled")
              : t("watch.artAutoNextDisabled");
            return enabled;
          },
        },
        {
          width: 220,
          html: "Subtitle",
          tooltip: "Subtitle",
          selector: [
            {
              html: "Display",
              tooltip: preferSubtitlesRef.current ? "Hide" : "Show",
              switch: preferSubtitlesRef.current,
              onSwitch(item) {
                const show = !item.switch;
                art.subtitle.show = show;
                item.tooltip = show ? "Hide" : "Show";
                if (show && subTracks.length > 0) {
                  subtitleModeRef.current = "external";
                  const active = subTracks.find((tr) => tr.default) ?? subTracks[0];
                  const url = resolveTrackSrc(active.file);
                  switchExternalSubtitle(art, url, { ...active, file: url }, subtitleSettings);
                } else if (!show) {
                  subtitleModeRef.current = enableNativeHlsSubtitles(art.video)
                    ? "native"
                    : "off";
                }
                return show;
              },
            },
            ...subtitleSelector,
          ],
          onSelect(item: { html?: string; url?: string; type?: string }) {
            if (item.url) {
              subtitleModeRef.current = "external";
              const url = resolveTrackSrc(item.url);
              switchExternalSubtitle(
                art,
                url,
                { file: url, label: item.html },
                subtitleSettings,
              );
            }
            return item.html ?? "Subtitle";
          },
        },
      ],
    });

    artRef.current = art;

    art.on("ready", () => {
      setReady(true);
      setBuffering(false);
      subtitleModeRef.current = applySubtitleMode(
        art,
        tracksRef.current,
        preferSubtitlesRef.current,
        subtitleSettings,
      );
      applyResume(art);
      refreshHlsControls(art);
      onPlayerReadyRef.current?.(art);

      const video = art.video;
      if (video?.textTracks) {
        video.textTracks.addEventListener("addtrack", (ev: Event) => {
          const track = (ev as TrackEvent).track;
          if (!track) return;
          handleTextTrackAdded(track, subtitleModeRef.current, () =>
            syncNativeSubsIfNeeded(video),
          );
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

    art.on("video:loadedmetadata", () => {
      if (!resumeAppliedRef.current) applyResume(art);
    });

    art.on("video:seeked", () => {
      const target = resumeSeekTargetRef.current;
      if (target == null) return;
      if (Math.abs(art.currentTime - target) <= 3) {
        resumeAppliedRef.current = true;
        resumeSeekTargetRef.current = null;
      }
    });

    art.on("video:waiting", () => setBuffering(true));
    art.on("video:canplay", () => {
      setBuffering(false);
      setReady(true);
      reapplyExternalSubtitlesRef.current(art);
    });
    art.on("video:playing", () => setBuffering(false));

    art.on("play", () => {
      if (!startFiredRef.current) {
        startFiredRef.current = true;
        onStartRef.current?.();
      }
      reportW2g(true, art.currentTime);
      setBuffering(false);
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

      const cfg = w2gRef.current;
      if (cfg?.isHost && !applyingW2gRef.current && Math.abs(current - lastW2gReportRef.current) > 2.5) {
        reportW2g(!isArtPaused(art), current);
      }
    });

    art.on("video:ended", () => {
      onEndedRef.current?.();
      if (nextEpisodeRef.current && autoNextRef.current) {
        setCountdown(5);
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
  }, [proxiedSrc, externalSubtitleSig, t, applyResume, reportW2g]);

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
      ref={wrapperRef}
      className={cn(
        "art-kitty-player relative w-full overflow-hidden rounded-xl bg-[#030303]",
        "shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.08]",
        orientClass,
      )}
      style={orientClass ? undefined : { aspectRatio: "16/9" }}
    >
      <div ref={containerRef} className="art-kitty-player-mount absolute inset-0 z-0" />

      {showLoading && (
        <div className="pointer-events-none absolute inset-0 z-[130] flex items-center justify-center bg-black/40 animate-in fade-in duration-300">
          <LoadingGirl size={120} className="opacity-90 drop-shadow-[0_0_32px_rgba(124,58,237,0.35)]" />
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

