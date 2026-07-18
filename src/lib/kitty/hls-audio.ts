import type Hls from "hls.js";

/** Minimal audio-track shape shared by hls.js and the AniKitty player. */
export type StreamAudioTrackLike = {
  name?: string;
  label?: string;
  lang?: string;
  language?: string;
};

function labelOf(track: StreamAudioTrackLike) {
  return `${track.name ?? track.label ?? ""} ${track.lang ?? track.language ?? ""}`.toLowerCase();
}

function isDubLike(track: StreamAudioTrackLike) {
  const text = labelOf(track);
  return (
    /\bdub\b/.test(text) ||
    /\benglish\b/.test(text) ||
    text === "en" ||
    text.startsWith("en-") ||
    text.startsWith("en_") ||
    text.includes(" eng") ||
    /\beng\b/.test(text)
  );
}

function isSubLike(track: StreamAudioTrackLike) {
  const text = labelOf(track);
  return (
    /\bjapanese\b/.test(text) ||
    /\bjpn\b/.test(text) ||
    /\bja\b/.test(text) ||
    text === "ja" ||
    text.startsWith("ja-") ||
    text.startsWith("ja_") ||
    /\bsub\b/.test(text)
  );
}

/** Index of Japanese (sub) or English (dub) when a master has multiple audio tracks. */
export function resolvePreferredAudioTrackIndex(
  tracks: readonly StreamAudioTrackLike[] | null | undefined,
  preferDubAudio: boolean,
): number | null {
  if (!tracks?.length) return null;
  // Single-track streams are already the requested audio (separate sub/dub URLs).
  if (tracks.length < 2) return 0;

  const preferred = preferDubAudio
    ? (tracks.find(isDubLike) ?? tracks.find((t) => !isSubLike(t)) ?? tracks[tracks.length - 1])
    : (tracks.find(isSubLike) ?? tracks.find((t) => !isDubLike(t)) ?? tracks[0]);

  const index = tracks.indexOf(preferred);
  return index >= 0 ? index : null;
}

/** Pick Japanese sub or English dub HLS audio when multiple tracks exist. */
export function pickHlsAudioTrack(hls: Hls, preferDubAudio: boolean): boolean {
  const tracks = hls.audioTracks as StreamAudioTrackLike[] | undefined;
  const index = resolvePreferredAudioTrackIndex(tracks, preferDubAudio);
  if (index == null) return false;
  if (tracks!.length < 2) return true;
  if (hls.audioTrack === index) return true;
  hls.audioTrack = index;
  return true;
}
