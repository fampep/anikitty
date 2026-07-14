import type { KittyTrack } from "@/query/stream/get-kitty-stream";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import type { SkipTimes } from "@/hooks/use-aniskip";

export interface W2gSyncState {
  version: number;
  isPlaying: boolean;
  currentTime: number;
}

export interface VideoPlayerProps {
  src: string;
  tracks?: KittyTrack[];
  headers?: Record<string, string>;
  /** MegaPlay / KittyAPI `allServers` — explicit 1080p/720p/360p URLs when HLS has no level ladder. */
  qualities?: KittyStreamQuality[];
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
  /** Fired when HLS playback fatally fails and can't recover (e.g. the stream 404s mid-load). */
  onFatalError?: (info: { type: string; details?: string }) => void;
  /** Fired when dub was requested but the loaded stream has no English audio track. */
  onDubAudioUnavailable?: () => void;
  onPlayerReady?: (art: import("artplayer").default) => void;
  w2g?: {
    isHost: boolean;
    syncState?: W2gSyncState | null;
    onPlaybackSync?: (state: { isPlaying: boolean; currentTime: number }) => void;
  };
  preferSubtitles?: boolean;
  preferDubAudio?: boolean;
}
