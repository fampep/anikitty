import {
  KITTY_SUB_PROVIDERS_FALLBACK,
  KITTY_SUB_SOURCE_PROVIDER,
} from "@/lib/kitty-subs-api";
import { RYUO_SOURCE_PROVIDER } from "@/lib/ryuo-subtitles";

/** Upstream Miruro stream subtitle cache rows (legacy). */
export const SUBTITLE_SOURCE_PROVIDER = "Miruro";

export {
  ANIKITTY_SUBTITLE_PROXY_LABEL,
  KITTY_SUB_SOURCE_PROVIDER,
} from "@/lib/kitty-subs-api";

export { RYUO_SOURCE_PROVIDER } from "@/lib/ryuo-subtitles";

/** Legacy cached rows — still included in library stats and listings. */
export const SUBTITLE_LEGACY_PROVIDERS = ["Anitaku"] as const;

export const SUBTITLE_LIBRARY_PROVIDERS = [
  RYUO_SOURCE_PROVIDER,
  KITTY_SUB_SOURCE_PROVIDER,
  ...KITTY_SUB_PROVIDERS_FALLBACK,
  SUBTITLE_SOURCE_PROVIDER,
  ...SUBTITLE_LEGACY_PROVIDERS,
] as const;

export const SUBTITLE_CACHE_PROVIDERS = [
  RYUO_SOURCE_PROVIDER,
  KITTY_SUB_SOURCE_PROVIDER,
  ...KITTY_SUB_PROVIDERS_FALLBACK,
  SUBTITLE_SOURCE_PROVIDER,
] as const;

export function isSubtitleCacheProvider(provider: string): boolean {
  return (SUBTITLE_CACHE_PROVIDERS as readonly string[]).includes(provider);
}

/** Stable key for deduplicating the same language across provider rows. */
export function normalizeSubtitleLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Lower rank = preferred when the same language exists under multiple providers. */
export function subtitleProviderRank(provider: string): number {
  if (provider === RYUO_SOURCE_PROVIDER) return 0;
  if (provider === KITTY_SUB_SOURCE_PROVIDER) return 1;
  if (provider === SUBTITLE_SOURCE_PROVIDER) return 2;
  if ((SUBTITLE_LEGACY_PROVIDERS as readonly string[]).includes(provider)) return 3;
  return 4;
}

export type StreamTrack = {
  file?: string;
  url?: string;
  kind?: string;
  label?: string;
  default?: boolean;
};

const NON_SUBTITLE_KINDS = new Set(["thumbnails", "chapters", "metadata"]);

export function getTrackFile(track: StreamTrack): string | null {
  const file = track.file ?? track.url;
  return file?.trim() || null;
}

export function isSubtitleTrack(track: StreamTrack): boolean {
  const file = getTrackFile(track);
  if (!file) return false;

  const kind = (track.kind ?? "subtitles").toLowerCase();
  if (NON_SUBTITLE_KINDS.has(kind)) return false;

  const label = (track.label ?? "").toLowerCase();
  if (
    label.includes("chapter") ||
    label.includes("skip") ||
    label.includes("intro") ||
    label.includes("thumbnail")
  ) {
    return false;
  }

  return kind === "subtitles" || kind === "caption" || kind === "captions" || !track.kind;
}

export function subtitleServeUrl(id: string): string {
  return `/api/kitty/subtitles?id=${encodeURIComponent(id)}`;
}

export function subtitleDownloadUrl(id: string): string {
  return `/api/kitty/subtitles?id=${encodeURIComponent(id)}&download=1`;
}

export function subtitleProxyUrl(sourceUrl: string, headers?: Record<string, string>): string {
  const params = new URLSearchParams({ url: sourceUrl });
  const referer = headers?.Referer ?? headers?.referer;
  if (referer) params.set("referer", referer);
  return `/api/kitty/subtitles/proxy?${params.toString()}`;
}

export function isOurSubtitleUrl(url: string): boolean {
  return url.includes("/api/kitty/subtitles");
}

export function stripSubtitleTracks(tracks: StreamTrack[] | undefined): StreamTrack[] {
  if (!Array.isArray(tracks)) return [];
  return tracks.filter((track) => !isSubtitleTrack(track));
}

const LABEL_LANG_MAP: [string, string][] = [
  ["english", "en"],
  ["en-us", "en"],
  ["en-gb", "en"],
  ["japanese", "ja"],
  ["japan", "ja"],
  ["spanish", "es"],
  ["french", "fr"],
  ["german", "de"],
  ["portuguese", "pt"],
  ["chinese", "zh"],
  ["korean", "ko"],
  ["arabic", "ar"],
  ["italian", "it"],
  ["russian", "ru"],
];

export function labelToLanguage(label: string): string {
  const normalized = label.toLowerCase().trim();
  const iso = normalized.match(/^([a-z]{2})(?:-[a-z]{2})?$/);
  if (iso) return iso[1];
  for (const [key, code] of LABEL_LANG_MAP) {
    if (normalized.includes(key)) return code;
  }
  return normalized.slice(0, 2) || "en";
}

/** Stable language code for deduplicating tracks (one track per language). */
export function normalizeSubtitleLanguage(label: string): string {
  return labelToLanguage(label);
}

/** Keep at most one subtitle track per language. */
export function dedupeSubtitleTracks(tracks: StreamTrack[]): StreamTrack[] {
  const nonSubs = tracks.filter((t) => !isSubtitleTrack(t));
  const byLang = new Map<string, StreamTrack>();

  for (const track of tracks) {
    if (!isSubtitleTrack(track)) continue;
    const key = normalizeSubtitleLanguage(track.label ?? "");
    if (!byLang.has(key)) byLang.set(key, track);
  }

  return [...nonSubs, ...byLang.values()];
}

function sanitizeFilenamePart(value: string, maxLen: number): string {
  return (
    value
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, maxLen) || "track"
  );
}

/** Download filename keyed by AniList ID: `{anilistId}-ep{n}-{label}.vtt` */
export function buildSubtitleFilename(row: {
  anilistId: number;
  episode: number;
  label: string;
}): string {
  const label = sanitizeFilenamePart(row.label, 30);
  return `${row.anilistId}-ep${row.episode}-${label}.vtt`;
}
