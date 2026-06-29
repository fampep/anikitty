import type Player from "video.js/dist/types/player";

function getVideo(container: HTMLElement): HTMLVideoElement | null {
  return container.querySelector("video");
}

function getCaptionsEl(container: HTMLElement): HTMLElement | null {
  return container.querySelector(".vjs-text-track-display");
}

function getActiveCaptionLabel(player: Player): string | null {
  const tracks = Array.from(player.textTracks() as unknown as TextTrack[]);
  for (const track of tracks) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    if (track.mode === "showing") return track.label ?? null;
  }
  return null;
}

function matchNativeTrack(track: TextTrack, activeLabel: string | null): boolean {
  if (!activeLabel) return false;
  const label = track.label?.toLowerCase() ?? "";
  const lang = track.language?.toLowerCase() ?? "";
  const want = activeLabel.toLowerCase();
  return label === want || lang === want || label.includes(want) || want.includes(label);
}

/** Route captions into the PiP video via native text tracks. */
export function enablePipCaptions(container: HTMLElement, player: Player): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);
  if (!video) return;

  container.setAttribute("data-pip-active", "true");

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

/** Restore Video.js caption overlay after PiP closes. */
export function disablePipCaptions(container: HTMLElement): void {
  const video = getVideo(container);
  const captionsEl = getCaptionsEl(container);

  container.removeAttribute("data-pip-active");

  if (captionsEl) {
    captionsEl.style.visibility = "";
    captionsEl.style.pointerEvents = "";
  }

  if (!video) return;

  for (const track of Array.from(video.textTracks)) {
    if (track.kind !== "subtitles" && track.kind !== "captions") continue;
    if (track.mode === "showing") track.mode = "hidden";
  }
}

export function bindPipCaptionSync(container: HTMLElement, player: Player): () => void {
  const onVideoEnter = () => enablePipCaptions(container, player);
  const onVideoLeave = () => disablePipCaptions(container);

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
  player.on("canplay", attachVideo);

  return () => {
    player.off("canplay", attachVideo);
    videoCleanup?.();
    disablePipCaptions(container);
  };
}
