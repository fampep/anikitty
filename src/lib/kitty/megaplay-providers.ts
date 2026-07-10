/** KittyAPI unified MegaPlay provider (replaces scrape-based Anikoto, AnimeSogo, Anix, HiAnime, Animepahe). */
export const MEGAPLAY_PROVIDER_ID = "MegaPlay" as const;

/** Saved `kittyProvider` values from before the unified provider — map to {@link MEGAPLAY_PROVIDER_ID}. */
export const LEGACY_MEGAPLAY_PROVIDER_IDS = [
  "Anikoto",
  "AnimeSogo",
  "Anix",
  "HiAnime",
  "Animepahe",
] as const;

export type LegacyMegaplayProviderId = (typeof LEGACY_MEGAPLAY_PROVIDER_IDS)[number];

/** megaplay.buzz origin — KittyAPI resolves embed URLs server-side; AniKitty plays HLS via stream-direct. */
export const MEGAPLAY_BUZZ_ORIGIN = "https://megaplay.buzz" as const;

/**
 * `seriesUrl` values for `/provider/MegaPlay/episodes?seriesUrl=`.
 * Prefer `catalog:{id}` (Anikoto API) for s-2 embed IDs and multi-quality streams.
 * A bare number is treated as a catalog ID by KittyAPI.
 */
export type MegaplaySeriesRef = `anilist:${number}` | `catalog:${number}`;

/**
 * megaplay.buzz embed routes tried best → fallback by KittyAPI
 * `buildMegaplayEmbedCandidates()` / `resolveMegaPlayEpisode()`.
 */
export const MEGAPLAY_EMBED_ROUTE_ORDER = ["s2", "ani", "mal"] as const;

export type MegaplayEmbedRoute = (typeof MEGAPLAY_EMBED_ROUTE_ORDER)[number];

/** Which embed route succeeded — KittyAPI sets `backend` on stream/link metadata. */
export type MegaplayBackendRoute = MegaplayEmbedRoute;

/**
 * megaplay.buzz embed paths → KittyAPI `resolveMegaPlayEmbed()` → getSources → HLS.
 *
 * | Route | Format | Example |
 * | s-2   | `/stream/s-2/{episode_embed_id}/{sub\|dub}` | `…/stream/s-2/169702/sub` |
 * | ani   | `/stream/ani/{anilist-id}/{ep}/{sub\|dub}`   | `…/stream/ani/1535/1/sub` |
 * | mal   | `/stream/mal/{mal-id}/{ep}/{sub\|dub}`       | `…/stream/mal/1535/1/dub` |
 */
export const MEGAPLAY_BUZZ_STREAM_PATHS = {
  s2: "/stream/s-2",
  ani: "/stream/ani",
  mal: "/stream/mal",
} as const satisfies Record<MegaplayEmbedRoute, string>;

export type MegaplayProviderConfig = {
  id: typeof MEGAPLAY_PROVIDER_ID;
  slug: string;
  /** Anikoto catalog API — `GET /series/{id}` for `catalog:{id}` episode lists. */
  catalogApi: string;
  streamApi: string;
  hint: string;
};

/** Mirrors KittyAPI `MegaPlayProvider` — megaplay.buzz embeds + stream-direct. */
export const MEGAPLAY_PROVIDER_CONFIG: MegaplayProviderConfig = {
  id: "MegaPlay",
  slug: "megaplay",
  catalogApi: "anikotoapi.site",
  streamApi: "megaplay.buzz",
  hint: "megaplay.buzz · s-2/ani/mal fallbacks · catalog:{id} for 1080p/720p/360p · SUB · DUB · VTT",
};

/** KittyAPI `/stream` and `/stream-direct` response shape (before AniKitty proxy rewrite). */
export type MegaplayStreamResponse = {
  file: string;
  headers?: { Referer?: string; Origin?: string; [key: string]: string | undefined };
  tracks?: { file: string; label: string; default?: boolean }[];
  allServers?: { quality: string; file: string }[];
  backend?: MegaplayBackendRoute;
  server?: string | null;
  download?: string | null;
};

const LEGACY_MEGAPLAY_SET = new Set<string>(LEGACY_MEGAPLAY_PROVIDER_IDS);

export function megaplaySeriesRef(
  kind: "anilist" | "catalog",
  id: number,
): MegaplaySeriesRef {
  return `${kind}:${id}`;
}

/**
 * Parse a MegaPlay `seriesUrl` value.
 * Bare digits (`8691`) are treated as catalog IDs (same as `catalog:8691`).
 */
export function parseMegaplaySeriesRef(
  ref: string,
): { kind: "anilist" | "catalog"; id: number } | null {
  const trimmed = ref.trim();
  const prefixed = /^(anilist|catalog):(\d+)$/.exec(trimmed);
  if (prefixed) {
    const id = parseInt(prefixed[2], 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { kind: prefixed[1] as "anilist" | "catalog", id };
  }
  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    if (!Number.isFinite(id) || id <= 0) return null;
    return { kind: "catalog", id };
  }
  return null;
}

/** Value for `/episodes?seriesUrl=` — accepts prefixed refs or bare catalog id. */
export function formatMegaplaySeriesUrl(ref: MegaplaySeriesRef | number): string {
  if (typeof ref === "number") return String(ref);
  return ref;
}

export function isLegacyMegaplayProvider(provider: string): provider is LegacyMegaplayProviderId {
  return LEGACY_MEGAPLAY_SET.has(provider);
}

export function isMegaplayProvider(provider: string): boolean {
  return provider === MEGAPLAY_PROVIDER_ID || isLegacyMegaplayProvider(provider);
}
