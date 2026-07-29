import type { RefObject } from "react";
import type { KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import type { PlayerController } from "@/lib/player/player-controller";
import type { StreamTrack } from "@/lib/subtitles/subtitle-track-utils";
import type { SkipTimes } from "@/hooks/use-aniskip";
import type { W2gSyncState } from "@/lib/kitty/video-player-types";

export type KittyPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
  /** Anime / series name for Chromecast MediaInfo (and chrome). */
  seriesTitle?: string;
  /** Episode number for Chromecast TvShow metadata. */
  episodeNumber?: number;
  className?: string;
  /** Soft subtitle / caption tracks (VTT preferred). */
  tracks?: StreamTrack[];
  /** MegaPlay-style `allServers` ladder when HLS has no useful levels. */
  qualities?: KittyStreamQuality[];
  /** Headers used when minting / resolving Kitty HLS. */
  headers?: Record<string, string>;
  /** Preferred Kitty CDN node for URL resolution (passthrough). */
  kittyNodeId?: KittyApiNodeId;
  /** Resume / deep-link start position (seconds). */
  startTime?: number;
  /** Intro/outro ranges from AniKitty community skip DB (seconds). */
  skipTimes?: SkipTimes;
  /**
   * Storyboard WebVTT URL for seek hover previews (ReAnime/FlixCloud
   * `thumbnails` / `thumbnails_vtt`, or a `kind: thumbnails` track).
   */
  thumbnails?: string | null;
  /** Auto-enable the first (or default) subtitle track. */
  preferSubtitles?: boolean;
  /** Prefer English/dub HLS audio when the master exposes multiple tracks. */
  preferDubAudio?: boolean;
  /** Enter fullscreen once the first frame is ready (mobile episode swipe). */
  autoFullscreen?: boolean;
  /**
   * Persistent element to fullscreen (e.g. watch-page wrapper). When set,
   * episode remounts of this player keep document fullscreen because the
   * target does not unmount between episodes.
   */
  fullscreenContainerRef?: RefObject<HTMLElement | null>;
  /** Next-episode card / autoplay countdown target. */
  nextEpisode?: { id: string; number: number; title: string; image?: string | null };
  /** Previous episode for chrome skip controls. */
  prevEpisode?: { id: string; number: number; title: string } | null;
  /** Called when the user picks an allServers quality (parent remounts src). */
  onSelectQuality?: (entry: KittyStreamQuality) => void;
  onStart?: () => void;
  onProgress?: (current: number, duration: number) => void;
  onLiveTime?: (current: number, duration: number) => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  /** Fired once when playback enters the outro skip range. */
  onOutroStart?: (duration: number) => void;
  onEnded?: () => void;
  onFatalError?: (info: { type: string; details?: string; status?: number }) => void;
  onPlayerReady?: (player: PlayerController) => void;
  /** Watch-together host/guest sync. */
  w2g?: {
    isHost: boolean;
    syncState?: W2gSyncState | null;
    onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number }) => void;
  };
  /** Optional copy for the HLS / decode failure banner. */
  playbackIssueHint?: string;
  /** Soft-sub overlay on hard-sub streams (watch settings). */
  watchingHardSub?: boolean;
};

/** @deprecated Use KittyPlayerProps */
export type AniKittyPlayerProps = KittyPlayerProps;

/** @deprecated Use KittyPlayerProps */
export type CustomVideoPlayerProps = KittyPlayerProps;

export type HlsLevelOption = {
  index: number;
  label: string;
  height?: number;
  /** Approximate stream bitrate in bits/sec when the HLS level exposes it. */
  bitrate?: number;
};

export type HlsAudioOption = {
  index: number;
  label: string;
};

export type CaptionOption = {
  id: string;
  label: string;
  src: string;
  language: string;
  isDefault?: boolean;
};

export type BufferedRange = { start: number; end: number };

export type GestureHint = {
  label: string;
  detail?: string;
  /** Optional 0–1 meter under the hint (volume / brightness). */
  meter?: number;
};

export type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
  webkitSetPresentationMode?: (
    mode: "inline" | "picture-in-picture" | "fullscreen",
  ) => void;
  webkitPresentationMode?: string;
};
