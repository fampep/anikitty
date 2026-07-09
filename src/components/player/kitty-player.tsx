"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import Artplayer from "artplayer";
import type { Option } from "artplayer";
import Hls from "hls.js";
import { pickHlsAudioTrack } from "@/lib/kitty/hls-audio";
import LoadingGirl from "@/components/common/loading-girl";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import artplayerPluginChromecast from "artplayer-plugin-chromecast";
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
import {
  getSubtitleBackgroundRgba,
  subtitleSettingsToCssVars,
  subtitleSettingsToInlineStyles,
  usesBoxedSubtitleLines,
  type SubtitleSettings,
} from "@/lib/subtitles/subtitle-settings";
import { installBoxedSubtitleLineFormatter } from "@/lib/subtitles/subtitle-boxed-lines";
import { useSettingsStore } from "@/store/settings-store";
import { useT, useI18n } from "@/providers/i18n-provider";
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
  const s = Math.floor(start);
  const e = Math.floor(end);
  if (s === e) return [{ time: s, text: label }];
  return [
    { time: s, text: label },
    { time: e, text: label },
  ];
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

type SubtitleStyleSettings = Parameters<typeof applySubtitleStyles>[1];

function switchExternalSubtitle(
  art: Artplayer,
  url: string,
  track: { file: string; label?: string },
  settings: SubtitleStyleSettings,
  activeUrlRef: { current: string | null },
) {
  disableEmbeddedTextTracks(art.video);
  art.subtitle.show = true;

  if (activeUrlRef.current === url) {
    ensureArtplayerSubtitleTrack(art);
    applySubtitleStyles(art, settings);
    return;
  }

  activeUrlRef.current = url;
  void art.subtitle
    .switch(url, buildSubtitleSwitchOptions({ ...track, file: url }))
    .then(() => {
      if (activeUrlRef.current !== url) return;
      ensureArtplayerSubtitleTrack(art);
      applySubtitleStyles(art, settings);
    })
    .catch(() => {
      if (activeUrlRef.current === url) activeUrlRef.current = null;
    });
}

function applySubtitleMode(
  art: Artplayer,
  tracks: StreamTrack[],
  preferSubtitles: boolean,
  settings: SubtitleStyleSettings,
  activeUrlRef: { current: string | null },
): SubtitleMode {
  const subTracks = resolveSubtitleTracks(tracks);

  if (preferSubtitles && subTracks.length > 0) {
    const active = subTracks.find((track) => track.default) ?? subTracks[0];
    const url = resolveTrackSrc(active.file);
    switchExternalSubtitle(art, url, { ...active, file: url }, settings, activeUrlRef);
    return "external";
  }

  activeUrlRef.current = null;

  if (subTracks.length > 0) {
    art.subtitle.show = false;
    return "off";
  }

  art.subtitle.show = false;
  const nativeEnabled = enableNativeHlsSubtitles(art.video);
  return nativeEnabled ? "native" : "off";
}

function applySubtitleStyles(art: Artplayer, settings: SubtitleSettings) {
  const scaled = Math.max(14, Math.min(32, art.height * 0.04, settings.fontSize + 4));
  const inline = subtitleSettingsToInlineStyles(settings, scaled);
  const boxedLines = usesBoxedSubtitleLines(settings);

  art.subtitle.style({
    color: inline.color,
    fontSize: inline.fontSize,
    fontWeight: String(inline.fontWeight),
    textShadow: inline.textShadow,
  });

  const root = art.template?.$player as HTMLElement | undefined;
  if (root) {
    root.classList.toggle("kitty-sub-boxed-lines", boxedLines);
    root.style.setProperty("--art-subtitle-bottom", `${settings.bottomOffset * 16}px`);
    root.style.setProperty("--kitty-sub-letter-spacing", inline.letterSpacing);
    root.style.setProperty("--kitty-sub-line-height", String(inline.lineHeight));
    root.style.setProperty("--kitty-sub-font-family", inline.fontFamily);
    root.style.setProperty("--kitty-sub-border-radius", `${settings.borderRadius}px`);
    root.style.setProperty("--kitty-sub-padding", inline.padding);
    root.style.setProperty("--kitty-sub-text-shadow", inline.textShadow);
    root.style.setProperty("--kitty-sub-font-weight", String(inline.fontWeight));
    root.style.setProperty("--kitty-sub-line-bg", getSubtitleBackgroundRgba(settings));
    root.style.setProperty("--kitty-sub-color", settings.color);
    for (const [key, value] of Object.entries(subtitleSettingsToCssVars(settings))) {
      root.style.setProperty(key, value);
    }
    if (inline.WebkitTextStroke) {
      root.style.setProperty("--kitty-sub-text-stroke", inline.WebkitTextStroke);
    } else {
      root.style.removeProperty("--kitty-sub-text-stroke");
    }
  }

  const subEl = art.template?.$subtitle as HTMLElement | undefined;
  if (subEl) {
    subEl.style.letterSpacing = inline.letterSpacing;
    subEl.style.lineHeight = String(inline.lineHeight);
    subEl.style.fontFamily = inline.fontFamily;
    subEl.style.borderRadius = inline.borderRadius;
    subEl.style.padding = inline.padding;
    if (inline.WebkitTextStroke) {
      subEl.style.webkitTextStroke = inline.WebkitTextStroke;
    } else {
      subEl.style.webkitTextStroke = "";
    }
    if (boxedLines) {
      subEl.style.removeProperty("--art-subtitle-bg");
      subEl.style.backgroundColor = "transparent";
      subEl.style.width = "auto";
      subEl.style.maxWidth = "calc(100% - 2rem)";
      subEl.style.left = "50%";
      subEl.style.right = "auto";
      subEl.style.transform = "translateX(-50%)";
      subEl.style.padding = "0";
      subEl.style.borderRadius = "0";
    } else if (settings.backgroundOpacity > 0) {
      subEl.style.removeProperty("left");
      subEl.style.removeProperty("right");
      subEl.style.removeProperty("transform");
      subEl.style.removeProperty("max-width");
      subEl.style.setProperty("--art-subtitle-bg", inline.backgroundColor);
      subEl.style.backgroundColor = inline.backgroundColor;
    } else {
      subEl.style.removeProperty("left");
      subEl.style.removeProperty("right");
      subEl.style.removeProperty("transform");
      subEl.style.removeProperty("max-width");
      subEl.style.removeProperty("--art-subtitle-bg");
      subEl.style.backgroundColor = "transparent";
    }
  }
}

function refreshHlsControls(art: Artplayer) {
  const plugin = art.plugins?.artplayerPluginHlsControl as { update?: () => void } | undefined;
  plugin?.update?.();
}

function hlsLoadFromVideoTime(hls: Hls, video: HTMLVideoElement | null | undefined) {
  const time = video?.currentTime ?? 0;
  hls.startLoad(Math.max(0, time - 0.25));
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
  onFatalError,
  onPlayerReady,
  w2g,
  preferSubtitles = true,
  preferDubAudio = false,
}: VideoPlayerProps) {
  const t = useT();
  const { locale } = useI18n();
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
  const autoSkipRef = useRef(useSettingsStore.getState().autoSkipIntro);
  const autoSkipIntro = useSettingsStore((s) => s.autoSkipIntro);
  const kittyProxyNode = useSettingsStore((s) => s.kittyProxyNode);
  const subtitleSettings = useSettingsStore((s) => s.subtitleSettings);

  useEffect(() => {
    autoNextRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    autoSkipRef.current = autoSkipIntro;
  }, [autoSkipIntro]);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [orientClass, setOrientClass] = useState<PlayerOrientClass>("");
  const [buffering, setBuffering] = useState(true);
  const [ready, setReady] = useState(false);
  // Host for the skip/next/countdown overlays, mounted INSIDE ArtPlayer's
  // player element so they stay visible in every fullscreen mode.
  const [overlayHost, setOverlayHost] = useState<HTMLElement | null>(null);
  const overlayHostRef = useRef<HTMLDivElement | null>(null);

  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onOutroStartRef = useRef(onOutroStart);
  const onEndedRef = useRef(onEnded);
  const onFatalErrorRef = useRef(onFatalError);
  const fatalErrorFiredRef = useRef(false);
  const skipTimesRef = useRef(skipTimes);
  const w2gRef = useRef(w2g);
  const nextEpisodeRef = useRef(nextEpisode);
  const preferSubtitlesRef = useRef(preferSubtitles);
  const tracksRef = useRef(tracks);
  const activeSubtitleUrlRef = useRef<string | null>(null);
  const boxedSubtitleCleanupRef = useRef<(() => void) | null>(null);
  const subtitleModeRef = useRef<SubtitleMode>("off");
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
  const lastAppliedW2gVersion = useRef(0);
  const applyingW2gRef = useRef(false);
  const autoFsRef = useRef(false);
  const durationRef = useRef(0);
  const startTimeRef = useRef(startTime);
  const resumeAppliedRef = useRef(false);
  const resumeSeekTargetRef = useRef<number | null>(null);
  const playbackStartedRef = useRef(false);
  const isSeekingRef = useRef(false);
  const bufferingShowTimerRef = useRef<number | null>(null);
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
  useEffect(() => { onFatalErrorRef.current = onFatalError; }, [onFatalError]);
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
      if (!autoNextStartedRef.current) {
        autoNextStartedRef.current = true;
        onNextEpisodeRef.current?.();
      }
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const triggerNextEpisode = useCallback(() => {
    if (autoNextStartedRef.current) return;
    autoNextStartedRef.current = true;
    setCountdown(null);
    onNextEpisodeRef.current?.();
  }, []);

  const proxiedSrc = buildKittyHlsUrl(src, headers, kittyProxyNode);

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
    endHandledRef.current = false;
    autoNextStartedRef.current = false;
    introAutoSkippedRef.current = false;
    outroAutoSkippedRef.current = false;
    lastProgressTs.current = 0;
    skipUiRef.current = null;
    resumeAppliedRef.current = false;
    resumeSeekTargetRef.current = null;
    playbackStartedRef.current = false;
    isSeekingRef.current = false;
    if (bufferingShowTimerRef.current != null) {
      window.clearTimeout(bufferingShowTimerRef.current);
      bufferingShowTimerRef.current = null;
    }
    activeSubtitleUrlRef.current = null;
    fatalErrorFiredRef.current = false;
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
    if (!art || resumeAppliedRef.current || playbackStartedRef.current) return;
    if (startFiredRef.current && art.currentTime > 5) return;
    applyResume(art);
  }, [startTime, applyResume]);

  const subtitleStyleSettings = subtitleSettings;

  useEffect(() => {
    const art = artRef.current;
    if (!art || !ready) return;

    applySubtitleStyles(art, subtitleStyleSettings);

    boxedSubtitleCleanupRef.current?.();
    boxedSubtitleCleanupRef.current = null;

    if (subtitleStyleSettings.displayMode === "boxedLines") {
      const subEl = art.template?.$subtitle as HTMLElement | undefined;
      if (subEl) {
        boxedSubtitleCleanupRef.current = installBoxedSubtitleLineFormatter(subEl);
      }
    }

    return () => {
      boxedSubtitleCleanupRef.current?.();
      boxedSubtitleCleanupRef.current = null;
    };
  }, [ready, subtitleStyleSettings]);

  // Persisted subtitle timing offset (seconds). ArtPlayer shifts all cues by it.
  // `subtitle.offset` is added at runtime by the `subtitleOffset` option and
  // isn't in ArtPlayer's TS types, hence the cast.
  useEffect(() => {
    const art = artRef.current;
    if (!art?.subtitle || !ready) return;
    try {
      (art.subtitle as unknown as { offset: number }).offset = subtitleSettings.delayOffset;
    } catch {
      /* offset control not ready yet */
    }
  }, [ready, subtitleSettings.delayOffset]);

  useEffect(() => {
    const art = artRef.current;
    if (!art || !ready) return;
    subtitleModeRef.current = applySubtitleMode(
      art,
      tracksRef.current,
      preferSubtitlesRef.current,
      subtitleStyleSettings,
      activeSubtitleUrlRef,
    );
  }, [externalSubtitleSig, preferSubtitles, ready]);

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

    // Persisted volume / mute / speed so they survive episode changes + reloads.
    const readNum = (key: string, fallback: number) => {
      const n = parseFloat(localStorage.getItem(key) ?? "");
      return Number.isFinite(n) ? n : fallback;
    };
    const savedVolume = Math.min(1, Math.max(0, readNum("kittyVolume", 0.85)));
    const savedMuted = localStorage.getItem("kittyMuted") === "1";
    const savedRate = Math.min(4, Math.max(0.25, readNum("kittyPlaybackRate", 1)));

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
      volume: savedVolume,
      autoplay: true,
      muted: savedMuted,
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
      // useWatchKeyboard owns every shortcut. ArtPlayer's built-in hotkeys also
      // bind Space on document, which double-toggles playback and ignores our
      // typing/interactive-element guards.
      hotkey: false,
      lang: locale,
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
            const fireFatalError = (type: string, details?: string) => {
              if (fatalErrorFiredRef.current) return;
              fatalErrorFiredRef.current = true;
              onFatalErrorRef.current?.({ type, details });
            };

            hls.on(Hls.Events.ERROR, (_event, data) => {
              if (!data.fatal) return;
              const video = artRef.current?.video;
              if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                hls.recoverMediaError();
                return;
              }
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                // A dead/404 manifest never recovers by reloading — bubble up
                // immediately so the parent can fail over to another provider.
                const status = (data.response as { code?: number } | undefined)?.code;
                const isManifestOr404 =
                  status === 404 ||
                  data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                  data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
                  data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
                  data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR;
                if (isManifestOr404 || hlsNetworkRecoveries >= 3) {
                  fireFatalError("network", data.details);
                  return;
                }
                hlsNetworkRecoveries += 1;
                hlsLoadFromVideoTime(hls, video);
                return;
              }
              // Any other fatal error we can't recover from.
              fireFatalError(String(data.type), data.details);
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
        artplayerPluginChromecast({
          url: resolveTrackSrc(proxiedSrc),
          mimeType: "application/x-mpegURL",
        }),
      ],
      highlight: [
        ...generateHighlights(skipTimes?.intro?.start, skipTimes?.intro?.end, t("watch.segmentIntro")),
        ...generateHighlights(skipTimes?.outro?.start, skipTimes?.outro?.end, t("watch.segmentOutro")),
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
          html: t("watch.subtitleSettings"),
          tooltip: t("watch.subtitleSettings"),
          selector: [
            {
              html: t("watch.artSubtitleDisplay"),
              tooltip: preferSubtitlesRef.current ? t("watch.artHide") : t("watch.artShow"),
              switch: preferSubtitlesRef.current,
              onSwitch(item) {
                const show = !item.switch;
                art.subtitle.show = show;
                item.tooltip = show ? t("watch.artHide") : t("watch.artShow");
                if (show && subTracks.length > 0) {
                  subtitleModeRef.current = "external";
                  const active = subTracks.find((tr) => tr.default) ?? subTracks[0];
                  const url = resolveTrackSrc(active.file);
                  switchExternalSubtitle(
                    art,
                    url,
                    { ...active, file: url },
                    subtitleStyleSettings,
                    activeSubtitleUrlRef,
                  );
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
                subtitleStyleSettings,
                activeSubtitleUrlRef,
              );
            }
            return item.html ?? t("watch.subtitleSettings");
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
        subtitleStyleSettings,
        activeSubtitleUrlRef,
      );
      applyResume(art);
      refreshHlsControls(art);
      if (savedRate !== 1) art.playbackRate = savedRate;

      // Mount overlays inside the player element (the native-fullscreen target)
      // so the skip/next/countdown UI shows in fullscreen.
      const playerEl = (art.template?.$player ?? container) as HTMLElement;
      const host = document.createElement("div");
      host.className = "kitty-overlay-host";
      host.style.cssText = "position:absolute;inset:0;z-index:120;pointer-events:none;";
      playerEl.appendChild(host);
      overlayHostRef.current = host;
      setOverlayHost(host);

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
      applySubtitleStyles(art, subtitleStyleSettings);
    });

    // Remember volume / mute / playback speed across episodes and sessions.
    art.on("video:volumechange", () => {
      localStorage.setItem("kittyVolume", String(art.volume));
      localStorage.setItem("kittyMuted", art.muted ? "1" : "0");
    });
    art.on("video:ratechange", () => {
      localStorage.setItem("kittyPlaybackRate", String(art.playbackRate));
    });

    const setBufferingDebounced = (show: boolean) => {
      if (show) {
        if (bufferingShowTimerRef.current != null) return;
        bufferingShowTimerRef.current = window.setTimeout(() => {
          bufferingShowTimerRef.current = null;
          setBuffering(true);
        }, 300);
        return;
      }
      if (bufferingShowTimerRef.current != null) {
        window.clearTimeout(bufferingShowTimerRef.current);
        bufferingShowTimerRef.current = null;
      }
      setBuffering(false);
    };

    art.on("video:loadedmetadata", () => {
      if (!resumeAppliedRef.current && !playbackStartedRef.current) applyResume(art);
    });

    art.on("video:seeking", () => {
      isSeekingRef.current = true;
    });

    art.on("video:seeked", () => {
      isSeekingRef.current = false;
      const target = resumeSeekTargetRef.current;
      if (target != null && Math.abs(art.currentTime - target) <= 3) {
        resumeAppliedRef.current = true;
        resumeSeekTargetRef.current = null;
      }
      const video = art.video;
      const hls = hlsRef.current;
      if (hls && video && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
        hlsLoadFromVideoTime(hls, video);
      }
    });

    art.on("video:waiting", () => setBufferingDebounced(true));
    art.on("video:canplay", () => {
      setBufferingDebounced(false);
      setReady(true);
      if (
        preferSubtitlesRef.current &&
        resolveSubtitleTracks(tracksRef.current).length > 0 &&
        !activeSubtitleUrlRef.current
      ) {
        subtitleModeRef.current = applySubtitleMode(
          art,
          tracksRef.current,
          preferSubtitlesRef.current,
          subtitleStyleSettings,
          activeSubtitleUrlRef,
        );
      } else if (subtitleModeRef.current === "external") {
        disableEmbeddedTextTracks(art.video);
        ensureArtplayerSubtitleTrack(art);
      }
    });
    art.on("video:playing", () => {
      playbackStartedRef.current = true;
      setBufferingDebounced(false);
    });

    const setMediaPlaybackState = (state: "playing" | "paused") => {
      if (typeof navigator !== "undefined" && "mediaSession" in navigator) {
        navigator.mediaSession.playbackState = state;
      }
    };

    art.on("play", () => {
      playbackStartedRef.current = true;
      if (!startFiredRef.current) {
        startFiredRef.current = true;
        onStartRef.current?.();
      }
      reportW2g(true, art.currentTime);
      setBufferingDebounced(false);
      setMediaPlaybackState("playing");
    });

    art.on("pause", () => {
      const current = art.currentTime;
      const dur = art.duration;
      if (current > 5 && dur > 0) onProgressRef.current?.(current, dur);
      reportW2g(false, current);
      setMediaPlaybackState("paused");
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
        if (autoSkipRef.current && !introAutoSkippedRef.current) {
          introAutoSkippedRef.current = true;
          art.currentTime = st.intro.end;
        }
      } else if (st?.outro && current >= st.outro.start && current < st.outro.end) {
        nextSkip = "outro";
        if (autoSkipRef.current && !outroAutoSkippedRef.current) {
          outroAutoSkippedRef.current = true;
          art.currentTime = st.outro.end;
        }
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
      if (endHandledRef.current) return;
      endHandledRef.current = true;
      onEndedRef.current?.();
      // Don't set autoNextStartedRef here — that flag guards the actual
      // navigation, which the countdown fires when it reaches 0. Setting it
      // now would block the countdown from ever advancing the episode.
      if (nextEpisodeRef.current && autoNextRef.current && !autoNextStartedRef.current) {
        setCountdown(5);
      }
    });

    return () => {
      if (bufferingShowTimerRef.current != null) {
        window.clearTimeout(bufferingShowTimerRef.current);
        bufferingShowTimerRef.current = null;
      }
      // Detach the overlay host before ArtPlayer tears down its DOM, and let
      // React unmount the portal into it.
      setOverlayHost(null);
      overlayHostRef.current?.remove();
      overlayHostRef.current = null;
      art.destroy();
      artRef.current = null;
      if (hlsForCleanup) {
        hlsForCleanup.destroy();
        hlsForCleanup = null;
      }
      hlsRef.current = null;
    };
  }, [proxiedSrc, t, locale, applyResume, reportW2g]);

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

  const overlays = (
    <>
      {showNext && nextEpisode && (
        <NextEpisodeButton
          episode={nextEpisode}
          stackClass={overlayBottom}
          onClick={triggerNextEpisode}
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
          onSkip={triggerNextEpisode}
          onCancel={() => setCountdown(null)}
        />
      )}
    </>
  );

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

      {/* Mounted inside ArtPlayer's player element so they survive fullscreen. */}
      {overlayHost ? createPortal(overlays, overlayHost) : overlays}
    </div>
  );
}

