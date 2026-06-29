import type { MediaPlayerInstance } from "@vidstack/react";

function getVideo(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector("video");
}

function getCaptionsEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".vds-captions");
}

function getActiveCaptionLabel(player: MediaPlayerInstance): string | null {
  for (const track of player.textTracks) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    if (track.mode === "showing") return track.label ?? null;
  }
  return null;
}

function matchNativeTrack(
  track: TextTrack,
  activeLabel: string | null,
): boolean {
  if (!activeLabel) return false;
  const label = track.label?.toLowerCase() ?? "";
  const lang = track.language?.toLowerCase() ?? "";
  const want = activeLabel.toLowerCase();
  return label === want || lang === want || label.includes(want) || want.includes(label);
}

function getMediaPlayerEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector("media-player");
}

/** Route captions into the PiP video via native text tracks (custom overlay stays on page). */
export function enablePipCaptions(
  container: HTMLElement,
  player: MediaPlayerInstance,
): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);
  const mediaPlayerEl = getMediaPlayerEl(container);
  if (!video) return;

  container.setAttribute("data-pip-active", "true");
  mediaPlayerEl?.setAttribute("data-pip", "");

  if (captionsEl) {
    captionsEl.style.visibility = "hidden";
    captionsEl.style.pointerEvents = "none";
  }

  const activeLabel = getActiveCaptionLabel(player);
  let matched = false;

  for (const track of Array.from(video.textTracks)) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    const show = !matched && matchNativeTrack(track, activeLabel);
    if (show) matched = true;
    track.mode = show ? "showing" : "hidden";
  }

  if (!matched) {
    const fallback = Array.from(video.textTracks).find(
      (t) => t.kind === "subtitles" || t.kind === "captions",
    );
    if (fallback) fallback.mode = "showing";
  }
}

/** Restore Vidstack custom caption overlay after PiP closes. */
export function disablePipCaptions(container: HTMLElement, player: MediaPlayerInstance): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);
  const mediaPlayerEl = getMediaPlayerEl(container);

  container.removeAttribute("data-pip-active");
  mediaPlayerEl?.removeAttribute("data-pip");

  if (captionsEl) {
    captionsEl.style.visibility = "";
    captionsEl.style.pointerEvents = "";
  }

  if (!video) return;

  for (const track of Array.from(video.textTracks)) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    track.mode = "hidden";
  }
}

export function bindPipCaptionSync(
  container: HTMLElement,
  player: MediaPlayerInstance,
): () => void {
  const onPipChange = (event: Event) => {
    const active = (event as CustomEvent<boolean>).detail ?? player.state.pictureInPicture;
    if (active) enablePipCaptions(container, player);
    else disablePipCaptions(container, player);
  };

  const onVideoEnter = () => enablePipCaptions(container, player);
  const onVideoLeave = () => disablePipCaptions(container, player);

  player.addEventListener("media-pip-change", onPipChange);

  let videoCleanup: (() => void) | undefined;
  const attachVideo = () => {
    videoCleanup?.();
    const video = getVideo(container);
    if (!video) {
      videoCleanup = undefined;
      return;
    }
    video.addEventListener("enterpictureinpicture", onVideoEnter);
    video.addEventListener("leavepictureinpicture", onVideoLeave);
    videoCleanup = () => {
      video.removeEventListener("enterpictureinpicture", onVideoEnter);
      video.removeEventListener("leavepictureinpicture", onVideoLeave);
    };
    if (document.pictureInPictureElement === video) {
      enablePipCaptions(container, player);
    }
  };

  attachVideo();
  player.addEventListener("can-play", attachVideo);

  return () => {
    player.removeEventListener("media-pip-change", onPipChange);
    player.removeEventListener("can-play", attachVideo);
    videoCleanup?.();
    disablePipCaptions(container, player);
  };
}
