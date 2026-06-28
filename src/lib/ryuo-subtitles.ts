import type { StreamTrack } from "@/lib/subtitle-track-utils";

export const RYUO_SUB_ENDPOINT = "https://sub.ryuo.to";
export const RYUO_SOURCE_PROVIDER = "Ryuo";

/** Languages probed in parallel on sub.ryuo.to (VTT served directly without upstream src). */
const RYUO_PROBE_LANGS = [
  "en",
  "es",
  "pt",
  "de",
  "fr",
  "it",
  "ru",
  "ar",
  "hi",
  "id",
  "ko",
  "zh",
  "th",
  "vi",
  "tr",
  "pl",
  "nl",
  "ta",
  "ja",
] as const;

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ja: "Japanese",
  ar: "Arabic",
  de: "German",
  es: "Spanish",
  fr: "French",
  it: "Italian",
  ru: "Russian",
  pt: "Portuguese",
  hi: "Hindi",
  ta: "Tamil",
  id: "Indonesian",
  ko: "Korean",
  zh: "Chinese",
  th: "Thai",
  vi: "Vietnamese",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
};

const healthCache = { at: 0, up: false };
const HEALTH_TTL_MS = 60_000;

export function ryuoSubtitleUrl(anilistId: number, episode: number, lang: string): string {
  return `${RYUO_SUB_ENDPOINT}/s/${anilistId}/${episode}/${lang}.vtt`;
}

export async function isRyuoAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - healthCache.at < HEALTH_TTL_MS) return healthCache.up;

  let up = false;
  try {
    const res = await fetch(`${RYUO_SUB_ENDPOINT}/health`, {
      signal: AbortSignal.timeout(4_000),
      cache: "no-store",
    });
    up = res.ok;
  } catch {
    up = false;
  }

  healthCache.at = now;
  healthCache.up = up;
  return up;
}

async function probeRyuoLang(
  anilistId: number,
  episode: number,
  lang: string,
): Promise<string | null> {
  const url = ryuoSubtitleUrl(anilistId, episode, lang);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (res.ok) return lang;
  } catch {
    // fall through
  }

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.trim().startsWith("WEBVTT") ? lang : null;
  } catch {
    return null;
  }
}

/** Discover subtitle tracks from sub.ryuo.to for one episode. */
export async function fetchRyuoSubtitleTracks(
  anilistId: number,
  episode: number,
): Promise<StreamTrack[]> {
  if (anilistId <= 0 || episode <= 0) return [];
  if (!(await isRyuoAvailable())) return [];

  const found = await Promise.all(
    RYUO_PROBE_LANGS.map((lang) => probeRyuoLang(anilistId, episode, lang)),
  );

  const langs = found.filter((lang): lang is string => Boolean(lang));
  if (langs.length === 0) return [];

  const preferEn = langs.includes("en") ? "en" : langs[0];
  const ordered = [preferEn, ...langs.filter((l) => l !== preferEn)];

  return ordered.map((lang, idx) => ({
    file: ryuoSubtitleUrl(anilistId, episode, lang),
    label: LANG_NAMES[lang] ?? lang.toUpperCase(),
    kind: "subtitles",
    default: idx === 0,
  }));
}
