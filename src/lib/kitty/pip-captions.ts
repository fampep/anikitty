import type Player from "video.js/dist/types/player";
import { getActiveCaptionLabel, getNativeTextTracks, isSubtitleKind } from "@/lib/kitty/videojs-tracks";

function getVideo(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector("video");
}

function getCaptionsEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".vjs-text-track-display");
}

function matchNativeTrack(track: TextTrack, activeLabel: string | null): boolean {
  if (!activeLabel) return false;
  const label = track.label?.toLowerCase() ?? "";
  const lang = track.language?.toLowerCase() ?? "";
  const want = activeLabel.toLowerCase();
  return label === want || lang === want || label.includes(want) || want.includes(label);
}

/** Route captions into the PiP video via native text tracks (custom overlay stays on page). */
export function enablePipCaptions(container: HTMLElement, player: Player): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);
  if (!video) return;

  container.setAttribute("data-pip-active", "true");
  player.el().setAttribute("data-pip", "");

  if (captionsEl) {
    captionsEl.style.visibility = "hidden";
    captionsEl.style.pointerEvents = "none";
  }

  const activeLabel = getActiveCaptionLabel(player);
  let matched = false;

  for (const track of Array.from(video.textTracks)) {
    if (!isSubtitleKind(track.kind)) continue;
    const show = !matched && matchNativeTrack(track, activeLabel);
    if (show) matched = true;
    track.mode = show ? "showing" : "hidden";
  }

  if (!matched) {
    const fallback = Array.from(video.textTracks).find((t) => isSubtitleKind(t.kind));
    if (fallback) fallback.mode = "showing";
  }
}

/** Restore Video.js caption overlay after PiP closes. */
export function disablePipCaptions(container: HTMLElement, player: Player): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);

  container.removeAttribute("data-pip-active");
  player.el().removeAttribute("data-pip");

  if (captionsEl) {
    captionsEl.style.visibility = "";
    captionsEl.style.pointerEvents = "";
  }

  if (!video) return;

  for (const track of getNativeTextTracks(player)) {
    if (!isSubtitleKind(track.kind)) continue;
    if (track.mode === "showing") continue;
    track.mode = "hidden";
  }

  for (const track of getNativeTextTracks(player)) {
    if (isSubtitleKind(track.kind) && track.mode === "showing") return;
  }
}

export function bindPipCaptionSync(container: HTMLElement, player: Player): () => void {
  const onVideoEnter = () => enablePipCaptions(container, player);
  const onVideoLeave = () => disablePipCaptions(container, player);

  const video = getVideo(container);
  if (video) {
    video.addEventListener("enterpictureinpicture", onVideoEnter);
    video.addEventListener("leavepictureinpicture", onVideoLeave);
    if (document.pictureInPictureElement === video) {
      enablePipCaptions(container, player);
    }
  }

  return () => {
    video?.removeEventListener("enterpictureinpicture", onVideoEnter);
    video?.removeEventListener("leavepictureinpicture", onVideoLeave);
    disablePipCaptions(container, player);
  };
}
