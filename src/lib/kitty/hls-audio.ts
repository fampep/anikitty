import type Hls from "hls.js";

type HlsAudioTrack = {
  name?: string;
  lang?: string;
  groupId?: string;
};

export type HlsAudioPickResult = {
  /** True when a suitable track was selected (or dub isn't required). */
  ok: boolean;
  /** False when dub was requested but no English/dub track exists. */
  dubAvailable: boolean;
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
export function pickHlsAudioTrack(hls: Hls, preferDubAudio: boolean): HlsAudioPickResult {
  const tracks = hls.audioTracks;
  if (!tracks?.length) {
    return { ok: !preferDubAudio, dubAvailable: false };
  }

  const trackList = tracks as HlsAudioTrack[];

  if (tracks.length < 2) {
    const only = trackList[0];
    const dubLike = isDubLike(only);
    if (preferDubAudio) {
      return { ok: dubLike, dubAvailable: dubLike };
    }
    return { ok: true, dubAvailable: dubLike };
  }

  if (preferDubAudio) {
    const dubTrack =
      trackList.find(isDubLike) ??
      trackList.find((t) => !isSubLike(t) && !isDubLike(t) && labelOf(t).includes("en"));
    if (!dubTrack) {
      return { ok: false, dubAvailable: false };
    }
    const index = trackList.indexOf(dubTrack);
    if (index >= 0 && hls.audioTrack !== index) {
      hls.audioTrack = index;
    }
    return { ok: true, dubAvailable: true };
  }

  const subTrack =
    trackList.find(isSubLike) ??
    trackList.find((t) => !isDubLike(t)) ??
    trackList[0];
  const index = trackList.indexOf(subTrack);
  if (index >= 0 && hls.audioTrack !== index) {
    hls.audioTrack = index;
  }
  return { ok: true, dubAvailable: trackList.some(isDubLike) };
}
