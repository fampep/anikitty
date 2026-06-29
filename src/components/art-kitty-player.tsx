"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Artplayer from "artplayer";
import type { Option } from "artplayer";
import Hls from "hls.js";
import artplayerPluginHlsControl from "artplayer-plugin-hls-control";
import { buildKittyHlsUrl } from "@/lib/kitty-hls-url";
import { createHlsConfig } from "@/lib/hls-config";
import {
  detectSubtitleFormat,
  isSubtitleTrack,
  labelToLanguage,
} from "@/lib/subtitle-track-utils";
import { useSettingsStore } from "@/store/settings-store";
import { useT } from "@/providers/i18n-provider";
import type { VideoPlayerProps } from "@/lib/video-player-types";
import type { SkipInterval } from "@/query/use-aniskip";
import { PlayerSkipButton } from "@/components/player-skip-button";

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

function hideArtPoster(art: Artplayer) {
  const poster = art.template?.$poster as HTMLElement | undefined;
  if (poster) poster.style.display = "none";
}

export default function ArtKittyPlayer({
  src,
  poster,
  tracks = [],
  headers = {},
  skipTimes,
  startTime = 0,
  nextEpisode,
  onStart,
  onProgress,
  onLiveTime,
  onNextEpisode,
  onOutroStart,
  onEnded,
  preferSubtitles = true,
}: VideoPlayerProps) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const autoNextRef = useRef(useSettingsStore.getState().autoPlay);

  const [activeSkip, setActiveSkip] = useState<"intro" | "outro" | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const onStartRef = useRef(onStart);
  const onProgressRef = useRef(onProgress);
  const onLiveTimeRef = useRef(onLiveTime);
  const onNextEpisodeRef = useRef(onNextEpisode);
  const onOutroStartRef = useRef(onOutroStart);
  const onEndedRef = useRef(onEnded);
  const skipTimesRef = useRef(skipTimes);
  const startFiredRef = useRef(false);
  const outroFiredRef = useRef(false);
  const lastProgressTs = useRef(0);
  const skipUiRef = useRef<"intro" | "outro" | null>(null);
  const lastUiTimeRef = useRef(0);

  useEffect(() => { onStartRef.current = onStart; }, [onStart]);
  useEffect(() => { onProgressRef.current = onProgress; }, [onProgress]);
  useEffect(() => { onLiveTimeRef.current = onLiveTime; }, [onLiveTime]);
  useEffect(() => { onNextEpisodeRef.current = onNextEpisode; }, [onNextEpisode]);
  useEffect(() => { onOutroStartRef.current = onOutroStart; }, [onOutroStart]);
  useEffect(() => { onEndedRef.current = onEnded; }, [onEnded]);
  useEffect(() => { skipTimesRef.current = skipTimes; }, [skipTimes]);

  const proxiedSrc = buildKittyHlsUrl(src, headers);

  const seekTo = useCallback((time: number) => {
    const art = artRef.current;
    if (art) {
      art.seek = time;
      art.play();
    }
    setActiveSkip(null);
    skipUiRef.current = null;
  }, []);

  useEffect(() => {
    startFiredRef.current = false;
    outroFiredRef.current = false;
    lastProgressTs.current = 0;
    skipUiRef.current = null;
    setActiveSkip(null);
    setCurrentTime(0);
  }, [proxiedSrc]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !proxiedSrc) return;

    const subTracks = tracks.filter(isSubtitleTrack).map((track) => ({
      ...track,
      file: resolveTrackSrc(track.file),
    }));

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
              color: "#FFFFFF",
              fontSize: "22px",
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
      poster,
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
      theme: "#ffffff",
      lang: "en",
      moreVideoAttr: { crossOrigin: "anonymous" },
      subtitle: subtitleOption,
      customType: {
        m3u8(video, url, player) {
          if (Hls.isSupported()) {
            hlsRef.current?.destroy();
            const hls = new Hls(createHlsConfig());
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
      hideArtPoster(art);

      art.subtitle.style({
        fontSize: `${Math.max(14, Math.min(32, art.height * 0.04))}px`,
      });

      if (startTime > 10 && art.duration > startTime + 5) {
        art.seek = startTime;
      }
    });

    art.on("resize", () => {
      art.subtitle.style({
        fontSize: `${Math.max(14, Math.min(32, art.height * 0.04))}px`,
      });
    });

    art.on("play", () => {
      hideArtPoster(art);
      if (!startFiredRef.current) {
        startFiredRef.current = true;
        onStartRef.current?.();
      }
    });

    art.on("video:timeupdate", () => {
      const current = art.currentTime;
      const duration = art.duration;
      onLiveTimeRef.current?.(current, duration);

      const st = skipTimesRef.current;
      let nextSkip: "intro" | "outro" | null = null;
      if (st?.intro && current >= st.intro.start && current < st.intro.end) {
        nextSkip = "intro";
      } else if (st?.outro && current >= st.outro.start && current < st.outro.end) {
        nextSkip = "outro";
        if (!outroFiredRef.current && duration > 0) {
          outroFiredRef.current = true;
          onOutroStartRef.current?.(duration);
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

      if (current > 5 && duration > 0) {
        const now = Date.now();
        if (now - lastProgressTs.current >= 10_000) {
          lastProgressTs.current = now;
          onProgressRef.current?.(current, duration);
        }
      }
    });

    art.on("video:ended", () => {
      onEndedRef.current?.();
      if (autoNextRef.current && nextEpisode) {
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
  }, [proxiedSrc, poster, tracks, preferSubtitles, startTime, nextEpisode, skipTimes, t]);

  if (!proxiedSrc) return null;

  const activeInterval: SkipInterval | undefined =
    activeSkip === "intro"
      ? skipTimes?.intro
      : activeSkip === "outro"
        ? skipTimes?.outro
        : undefined;

  return (
    <div
      className="art-kitty-player relative w-full overflow-hidden rounded-xl bg-black ring-1 ring-white/[0.06]"
      style={{ aspectRatio: "16/9" }}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {activeSkip && activeInterval && (
        <PlayerSkipButton
          type={activeSkip}
          interval={activeInterval}
          currentTime={currentTime}
          onSkip={() => seekTo(activeInterval.end)}
        />
      )}
    </div>
  );
}
