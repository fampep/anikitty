import type { MediaPlayerInstance, MediaRemoteControl } from "@vidstack/react";
import { isElementFullscreen } from "@/lib/kitty/fullscreen";

/** Thin adapter so watch-page keyboard shortcuts and media session work without Artplayer. */
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

export function createPlayerController(
  player: MediaPlayerInstance,
  remote: MediaRemoteControl,
): PlayerController {
  return {
    play: () => {
      remote.play();
    },
    pause: () => {
      remote.pause();
    },
    toggle: () => {
      if (player.paused) remote.play();
      else remote.pause();
    },
    seek: (seconds: number) => {
      remote.seek(seconds);
    },
    get currentTime() {
      return player.currentTime;
    },
    get duration() {
      return player.duration;
    },
    get paused() {
      return player.paused;
    },
    get volume() {
      return player.volume;
    },
    setVolume(value: number) {
      remote.changeVolume(Math.min(1, Math.max(0, value)));
    },
    get muted() {
      return player.muted;
    },
    setMuted(value: boolean) {
      if (value) remote.mute();
      else remote.unmute();
    },
    toggleFullscreen: () => {
      const target = player.el;
      if (target && isElementFullscreen(target)) remote.exitFullscreen();
      else remote.enterFullscreen();
    },
    get video() {
      return player.el?.querySelector("video") ?? null;
    },
  };
}
