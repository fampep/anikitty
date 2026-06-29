import type { KittyTrack } from "@/query/get-kitty-stream";
import type { SkipTimes } from "@/query/use-aniskip";

export interface W2gSyncState {
  version: number;
  isPlaying: boolean;
  currentTime: number;
}

export interface VideoPlayerProps {
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
