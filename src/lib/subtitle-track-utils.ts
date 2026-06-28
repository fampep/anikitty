import { RYUO_SOURCE_PROVIDER } from "@/lib/ryuo-subtitles";
import { KITTY_SUB_PROVIDERS, KITTY_SUB_SOURCE_PROVIDER } from "@/lib/kitty-subs-api";

/** Primary provider for Miruro/Kitty stream subtitle tracks. */
export const SUBTITLE_SOURCE_PROVIDER = "Miruro";

/** Kitty API /subs (Anikoto, AnimeSogo, Anix, HiAnime). */
export { KITTY_SUB_SOURCE_PROVIDER };

/** Fast subtitle source scraped via sub.ryuo.to. */
export { RYUO_SOURCE_PROVIDER };

/** Legacy cached rows — still included in library stats and listings. */
export const SUBTITLE_LEGACY_PROVIDERS = ["Anitaku"] as const;

export const SUBTITLE_LIBRARY_PROVIDERS = [
  KITTY_SUB_SOURCE_PROVIDER,
  ...KITTY_SUB_PROVIDERS,
  RYUO_SOURCE_PROVIDER,
  SUBTITLE_SOURCE_PROVIDER,
  ...SUBTITLE_LEGACY_PROVIDERS,
] as const;

export const SUBTITLE_CACHE_PROVIDERS = [
  KITTY_SUB_SOURCE_PROVIDER,
  ...KITTY_SUB_PROVIDERS,
  RYUO_SOURCE_PROVIDER,
  SUBTITLE_SOURCE_PROVIDER,
] as const;

export function isSubtitleCacheProvider(provider: string): boolean {
  return (SUBTITLE_CACHE_PROVIDERS as readonly string[]).includes(provider);
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

export function subtitleEpisodeZipUrl(anilistId: number, episodes: number[]): string {
  const params = new URLSearchParams({ episodes: episodes.join(",") });
  return `/api/anime/${anilistId}/subtitles/zip?${params.toString()}`;
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
  const normalized = label.toLowerCase();
  for (const [key, code] of LABEL_LANG_MAP) {
    if (normalized.includes(key)) return code;
  }
  return "en";
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
