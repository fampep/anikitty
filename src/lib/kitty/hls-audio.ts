import type Hls from "hls.js";

type HlsAudioTrack = {
  name?: string;
  lang?: string;
  groupId?: string;
};

function labelOf(track: HlsAudioTrack) {
  return `${track.name ?? ""} ${track.lang ?? ""}`.toLowerCase();
}

function isDubLike(track: HlsAudioTrack) {
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

function isSubLike(track: HlsAudioTrack) {
  const text = labelOf(track);
  return (
    /\bjapanese\b/.test(text) ||
    /\bja\b/.test(text) ||
    text === "ja" ||
    text.startsWith("ja-") ||
    text.startsWith("ja_") ||
    /\bsub\b/.test(text)
  );
}

/** Pick Japanese sub or English dub HLS audio when multiple tracks exist. */
export function pickHlsAudioTrack(hls: Hls, preferDubAudio: boolean): boolean {
  const tracks = hls.audioTracks;
  if (!tracks?.length) return false;

  // Single-track streams are already the requested audio (separate sub/dub URLs).
  if (tracks.length < 2) return true;

  const trackList = tracks as HlsAudioTrack[];
  const preferred = preferDubAudio
    ? (trackList.find(isDubLike) ??
      trackList.find((t) => !isSubLike(t)) ??
      trackList[trackList.length - 1])
    : (trackList.find(isSubLike) ??
      trackList.find((t) => !isDubLike(t)) ??
      trackList[0]);

  const index = trackList.indexOf(preferred);
  if (index < 0) return true;
  if (hls.audioTrack === index) return true;
  hls.audioTrack = index;
  return true;
}
