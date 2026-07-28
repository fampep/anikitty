import {
  exitElementFullscreen,
  elementSupportsFullscreenRequest,
  exitVideoWebkitFullscreen,
  isElementFullscreen,
  isVideoWebkitFullscreen,
  prefersCssImmersiveFullscreen,
  requestElementFullscreen,
} from "@/lib/kitty/fullscreen";

/** Thin adapter so watch-page keyboard shortcuts and media session work with HTML video. */
export type PlayerController = {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  readonly currentTime: number;
  readonly duration: number;
  readonly paused: boolean;
  readonly volume: number;
  setVolume: (value: number) => void;
  readonly muted: boolean;
  setMuted: (value: boolean) => void;
  toggleFullscreen: () => void;
  readonly video: HTMLVideoElement | null;
};

/** Adapter for the AniKitty HTML5 player. */
export function createHtmlVideoPlayerController(
  video: HTMLVideoElement,
  root?: HTMLElement | null,
  opts?: { toggleFullscreen?: () => void },
): PlayerController {
  return {
    play: () => {
      void video.play();
    },
    pause: () => {
      video.pause();
    },
    toggle: () => {
      if (video.paused) void video.play();
      else video.pause();
    },
    seek: (seconds: number) => {
      video.currentTime = seconds;
    },
    get currentTime() {
      return video.currentTime;
    },
    get duration() {
      return Number.isFinite(video.duration) ? video.duration : 0;
    },
    get paused() {
      return video.paused;
    },
    get volume() {
      return video.volume;
    },
    setVolume(value: number) {
      video.volume = Math.min(1, Math.max(0, value));
    },
    get muted() {
      return video.muted;
    },
    setMuted(value: boolean) {
      video.muted = value;
    },
    toggleFullscreen: () => {
      if (opts?.toggleFullscreen) {
        opts.toggleFullscreen();
        return;
      }
      const target = root ?? video;
      if (isElementFullscreen(target) || isVideoWebkitFullscreen(video)) {
        if (isVideoWebkitFullscreen(video)) {
          try {
            exitVideoWebkitFullscreen(video);
          } catch {
            /* ignore */
          }
        } else {
          void exitElementFullscreen().catch(() => {});
        }
        return;
      }
      // iOS CSS immersive is owned by the React player hook — do not enter
      // native webkit video FS from this adapter (drops kitty chrome).
      if (prefersCssImmersiveFullscreen()) return;
      if (elementSupportsFullscreenRequest(target)) {
        void requestElementFullscreen(target).catch(() => {});
      }
    },
    get video() {
      return video;
    },
  };
}
