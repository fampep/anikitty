import type Player from "video.js/dist/types/player";
import { labelToLanguage } from "@/lib/subtitles/subtitle-track-utils";

export type SubTrackConfig = {
  file: string;
  label?: string;
  default?: boolean;
};

function isSubtitleKind(kind?: string) {
  return kind === "subtitles" || kind === "captions";
}

function getNativeTextTracks(player: Player): TextTrack[] {
  const video = player.el().querySelector("video");
  if (!video?.textTracks) return [];
  return Array.from(video.textTracks);
}

function getActiveCaptionLabel(player: Player): string | null {
  for (const track of getNativeTextTracks(player)) {
    if (!isSubtitleKind(track.kind)) continue;
    if (track.mode === "showing") return track.label ?? null;
  }
  return null;
}

export function activateKittySubtitles(
  player: Player,
  configuredTracks: SubTrackConfig[],
  preferSubtitles: boolean,
): boolean {
  if (configuredTracks.length === 0) return true;

  const textTracks = getNativeTextTracks(player);
  if (textTracks.length === 0) return false;

  if (!preferSubtitles) {
    for (const track of textTracks) {
      if (isSubtitleKind(track.kind)) track.mode = "disabled";
    }
    return true;
  }

  const preferred = configuredTracks.find((t) => t.default) ?? configuredTracks[0];
  const preferredLang = labelToLanguage(preferred.label || "");

  let target: TextTrack | undefined;
  for (const track of textTracks) {
    if (!isSubtitleKind(track.kind)) continue;
    const labelMatch =
      track.label === preferred.label ||
      track.language === preferredLang ||
      (preferred.label &&
        track.label?.toLowerCase().includes(preferred.label.toLowerCase()));
    if (labelMatch) {
      target = track;
      break;
    }
  }
  if (!target) {
    target = textTracks.find((t) => isSubtitleKind(t.kind));
  }
  if (!target) return false;

  for (const track of textTracks) {
    if (isSubtitleKind(track.kind)) track.mode = "disabled";
  }
  target.mode = "showing";
  return true;
}

export function pickKittyAudioTrack(player: Player, preferDubAudio: boolean): boolean {
  const audioTracks = player.audioTracks?.();
  if (!audioTracks?.length) return false;
  if (audioTracks.length < 2) return true;

  type AudioTrackLike = { enabled: boolean; label?: string; language?: string };
  const trackList: AudioTrackLike[] = Array.from(
    { length: audioTracks.length },
    (_, i) => (audioTracks as unknown as { [index: number]: AudioTrackLike })[i],
  ).filter((t): t is AudioTrackLike => t != null);

  const labelOf = (track: AudioTrackLike) =>
    `${track.label ?? ""} ${track.language ?? ""}`.toLowerCase();

  const isDubLike = (track: AudioTrackLike) => {
    const text = labelOf(track);
    return (
      /\bdub\b/.test(text) ||
      /\benglish\b/.test(text) ||
      text === "en" ||
      text.startsWith("en-") ||
      text.includes(" eng")
    );
  };

  const isSubLike = (track: AudioTrackLike) => {
    const text = labelOf(track);
    return (
      /\bjapanese\b/.test(text) ||
      /\bja\b/.test(text) ||
      text === "ja" ||
      text.startsWith("ja-") ||
      /\bsub\b/.test(text)
    );
  };

  const preferred = preferDubAudio
    ? (trackList.find(isDubLike) ??
      trackList.find((t) => !isSubLike(t)) ??
      trackList[trackList.length - 1])
    : (trackList.find(isSubLike) ??
      trackList.find((t) => !isDubLike(t)) ??
      trackList[0]);

  if (!preferred) return true;

  let changed = false;
  for (const track of trackList) {
    const next = track === preferred;
    if (track.enabled !== next) {
      track.enabled = next;
      changed = true;
    }
  }
  return !changed || true;
}

export { getActiveCaptionLabel, getNativeTextTracks, isSubtitleKind };
