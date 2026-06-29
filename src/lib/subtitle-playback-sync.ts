import type { MediaPlayerInstance } from "@vidstack/react";

type CueLike = { startTime: number; endTime: number };
type CueBaseline = { start: number; end: number };

type SyncTextTrack = {
  kind?: string;
  mode?: string;
  cues?: { length: number; [index: number]: unknown } | null;
  setMode?: (mode: string) => void;
  addEventListener?: (type: string, listener: () => void) => void;
};

const cueBaselines = new WeakMap<object, CueBaseline>();

function isCueLike(cue: unknown): cue is CueLike {
  return (
    typeof cue === "object" &&
    cue !== null &&
    "startTime" in cue &&
    "endTime" in cue &&
    typeof (cue as CueLike).startTime === "number" &&
    typeof (cue as CueLike).endTime === "number"
  );
}

function applyOffsetToCue(cue: object, offsetSec: number) {
  if (!isCueLike(cue)) return;
  let base = cueBaselines.get(cue);
  if (!base) {
    base = { start: cue.startTime, end: cue.endTime };
    cueBaselines.set(cue, base);
  }
  cue.startTime = Math.max(0, base.start + offsetSec);
  cue.endTime = Math.max(cue.startTime + 0.05, base.end + offsetSec);
}

function applyOffsetToTrack(track: SyncTextTrack, offsetSec: number) {
  const cues = track.cues;
  if (!cues) return;
  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (cue && typeof cue === "object") applyOffsetToCue(cue, offsetSec);
  }
}

function setTrackMode(track: SyncTextTrack, mode: string) {
  if (track.setMode) track.setMode(mode);
  else track.mode = mode;
}

function getVideo(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector("video");
}

function isSubtitleKind(track: SyncTextTrack): boolean {
  return track.kind === "subtitles" || track.kind === "captions";
}

/** Force the active subtitle track to re-evaluate cues at the current playback time. */
export function resyncShowingSubtitleTrack(
  player: MediaPlayerInstance,
  offsetSec: number,
) {
  for (const track of player.textTracks as unknown as SyncTextTrack[]) {
    if (!isSubtitleKind(track)) continue;
    if (track.mode !== "showing") continue;
    applyOffsetToTrack(track, offsetSec);
    const mode = track.mode ?? "showing";
    setTrackMode(track, "hidden");
    setTrackMode(track, mode);
    return;
  }
}

function attachTrackLoadListeners(
  player: MediaPlayerInstance,
  onTrackLoad: (track: SyncTextTrack) => void,
) {
  for (const track of player.textTracks as unknown as SyncTextTrack[]) {
    if (!isSubtitleKind(track)) continue;
    track.addEventListener?.("load", () => onTrackLoad(track));
  }
}

/**
 * Keep external subtitle cues aligned with the stream playback clock (video.currentTime).
 * Re-syncs after seeks, rate changes, and HLS audio-track switches.
 */
export function bindSubtitlePlaybackSync(
  container: HTMLElement,
  player: MediaPlayerInstance,
  getOffsetSec: () => number,
): { cleanup: () => void; resync: () => void } {
  let lastOffset = getOffsetSec();
  let resyncTimer: ReturnType<typeof setTimeout> | undefined;

  let resyncInFlight = false;

  const resync = () => {
    if (resyncInFlight) return;
    resyncInFlight = true;
    try {
      resyncShowingSubtitleTrack(player, getOffsetSec());
    } finally {
      queueMicrotask(() => {
        resyncInFlight = false;
      });
    }
  };

  const scheduleResync = () => {
    if (resyncTimer) clearTimeout(resyncTimer);
    resyncTimer = setTimeout(() => {
      resyncTimer = undefined;
      lastOffset = getOffsetSec();
      resync();
    }, 40);
  };

  const onTrackLoad = (track: SyncTextTrack) => {
    applyOffsetToTrack(track, getOffsetSec());
    if (track.mode === "showing") scheduleResync();
  };

  const applyOffsetToAllTracks = (offsetSec: number) => {
    for (const track of player.textTracks as unknown as SyncTextTrack[]) {
      if (!isSubtitleKind(track)) continue;
      applyOffsetToTrack(track, offsetSec);
    }
  };

  const onOffsetChange = () => {
    const offset = getOffsetSec();
    if (offset === lastOffset) return;
    lastOffset = offset;
    applyOffsetToAllTracks(offset);
    scheduleResync();
  };

  const onPlaybackResync = () => scheduleResync();

  attachTrackLoadListeners(player, onTrackLoad);

  const onTracksChange = () => {
    attachTrackLoadListeners(player, onTrackLoad);
    applyOffsetToAllTracks(getOffsetSec());
    // Avoid toggling track mode here — resync on text-tracks-change loops with Vidstack.
  };

  player.addEventListener("vds-text-tracks-change", onTracksChange);
  player.addEventListener("can-play", onPlaybackResync);
  player.addEventListener("seeked", onPlaybackResync);
  player.addEventListener("ratechange", onPlaybackResync);
  player.addEventListener("audio-tracks-change", onPlaybackResync);

  const video = getVideo(container);
  const onVideoSeeked = () => onPlaybackResync();
  video?.addEventListener("seeked", onVideoSeeked);

  const offsetPoll = window.setInterval(onOffsetChange, 400);
  scheduleResync();

  const cleanup = () => {
    if (resyncTimer) clearTimeout(resyncTimer);
    window.clearInterval(offsetPoll);
    player.removeEventListener("vds-text-tracks-change", onTracksChange);
    player.removeEventListener("can-play", onPlaybackResync);
    player.removeEventListener("seeked", onPlaybackResync);
    player.removeEventListener("ratechange", onPlaybackResync);
    player.removeEventListener("audio-tracks-change", onPlaybackResync);
    video?.removeEventListener("seeked", onVideoSeeked);
  };

  return { cleanup, resync };
}
