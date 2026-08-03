/**
 * MyAnimeList fallback for when AniList is unreachable.
 *
 * AniList has extended outages (it currently answers every metadata query with
 * `403 "The AniList API has been temporarily disabled due to severe stability
 * issues."`), which otherwise takes every metadata route down with it.
 *
 * Uses the official MAL API (`api.myanimelist.net/v2`) via `malApiGet`, which
 * needs `MAL_CLIENT_ID`. Records are remapped into the AniList `Media` shape the
 * routes already consume, so existing mappers (`toAnime`, `mapSpotlight`,
 * `mapMediaToCriticalPayload`, …) work unchanged.
 *
 * Ids are the subtlety: MAL returns MAL ids but every link in the app is an
 * AniList id, so ids are bridged back through AniZip — which does not depend on
 * AniList either. Entries that can't be bridged are dropped rather than emitted
 * with an id that would deep-link to the wrong anime.
 */

import { malApiGet, getMalClientId } from "@/lib/anime/mal-api";
import { getAniListIdsByMalIds } from "@/lib/anime/anime-metadata-store";

const ANI_ZIP = "https://api.ani.zip/mappings";

/** Everything a detail page reads. */
const DETAIL_FIELDS = [
  "id",
  "title",
  "alternative_titles",
  "main_picture",
  "start_date",
  "end_date",
  "synopsis",
  "mean",
  "rank",
  "popularity",
  "num_list_users",
  "num_favorites",
  "media_type",
  "status",
  "genres",
  "num_episodes",
  "start_season",
  "broadcast",
  "source",
  "average_episode_duration",
  "rating",
  "studios",
  "nsfw",
].join(",");

/** Trimmed set for rails and search results. */
const LIST_FIELDS = [
  "id",
  "title",
  "alternative_titles",
  "main_picture",
  "start_date",
  "end_date",
  "mean",
  "media_type",
  "status",
  "genres",
  "num_episodes",
  "start_season",
  "broadcast",
  "studios",
  "nsfw",
].join(",");

/** The subset of AniList's `Media` our metadata routes read. */
export type FallbackMedia = {
  id: number;
  idMal: number | null;
  isAdult: boolean;
  title: { english: string | null; romaji: string | null; native: string | null };
  description: string | null;
  coverImage: { extraLarge: string | null; large: string | null };
  bannerImage: string | null;
  episodes: number | null;
  format: string | null;
  status: string | null;
  duration: number | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  trending: number | null;
  genres: string[];
  synonyms: string[];
  season: string | null;
  seasonYear: number | null;
  source: string | null;
  countryOfOrigin: string;
  startDate: PartialDate;
  endDate: PartialDate;
  /** MAL publishes no airing schedule — absent, which reads as "unknown". */
  nextAiringEpisode: null;
  /** Weekday from MAL's `broadcast`, for schedule rails. */
  broadcastDay: string | null;
  broadcastTime: string | null;
  studios: { nodes: Array<{ id: string; name: string; isAnimationStudio: boolean }> };
  trailer: null;
  rankings: [];
  tags: [];
  externalLinks: Array<{ site: string; url: string; type: null; color: null; icon: null }>;
  stats: { statusDistribution: []; scoreDistribution: [] };
  /** Marks payloads that came from the fallback rather than AniList. */
  _source: "mal";
};

type PartialDate = { year: number | null; month: number | null; day: number | null };

const STATUS_MAP: Record<string, string> = {
  finished_airing: "FINISHED",
  currently_airing: "RELEASING",
  not_yet_aired: "NOT_YET_RELEASED",
};

const FORMAT_MAP: Record<string, string> = {
  tv: "TV",
  tv_special: "SPECIAL",
  movie: "MOVIE",
  ova: "OVA",
  ona: "ONA",
  special: "SPECIAL",
  music: "MUSIC",
};

function toPartialDate(iso: string | null | undefined): PartialDate {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(iso?.trim() ?? "");
  if (!match) return { year: null, month: null, day: null };
  return {
    year: Number(match[1]),
    month: Number(match[2]) || null,
    day: match[3] ? Number(match[3]) : null,
  };
}

function positive(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function names(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => (item as { name?: string })?.name?.trim())
    .filter((name): name is string => !!name);
}

/** Convert one MAL anime node into the AniList `Media` shape. */
function mapMalNode(anilistId: number, row: any): FallbackMedia {
  const malId = positive(row.id);
  const alt = row.alternative_titles ?? {};
  const score = positive(row.mean);
  const cover = row.main_picture?.large ?? row.main_picture?.medium ?? null;
  // MAL reports episode length in seconds; AniList in minutes.
  const durationSec = positive(row.average_episode_duration);

  return {
    id: anilistId,
    idMal: malId,
    isAdult: row.nsfw === "black" || /^rx/i.test(String(row.rating ?? "")),
    title: {
      english: alt.en?.trim() || null,
      romaji: row.title ?? null,
      native: alt.ja?.trim() || null,
    },
    description: typeof row.synopsis === "string" ? row.synopsis : null,
    coverImage: { extraLarge: cover, large: cover },
    bannerImage: cover,
    episodes: positive(row.num_episodes),
    format: FORMAT_MAP[String(row.media_type ?? "").toLowerCase()] ?? null,
    status: STATUS_MAP[String(row.status ?? "").toLowerCase()] ?? null,
    duration: durationSec ? Math.round(durationSec / 60) : null,
    // AniList scores are 0–100, MAL's are 0–10.
    averageScore: score != null ? Math.round(score * 10) : null,
    meanScore: score != null ? Math.round(score * 10) : null,
    popularity: positive(row.num_list_users),
    favourites: positive(row.num_favorites),
    trending: null,
    genres: names(row.genres),
    synonyms: Array.isArray(alt.synonyms) ? alt.synonyms.filter(Boolean) : [],
    season: typeof row.start_season?.season === "string"
      ? row.start_season.season.toUpperCase()
      : null,
    seasonYear: positive(row.start_season?.year),
    source: typeof row.source === "string"
      ? row.source.toUpperCase().replace(/\s+/g, "_")
      : null,
    countryOfOrigin: "JP",
    startDate: toPartialDate(row.start_date),
    endDate: toPartialDate(row.end_date),
    nextAiringEpisode: null,
    broadcastDay: row.broadcast?.day_of_the_week ?? null,
    broadcastTime: row.broadcast?.start_time ?? null,
    studios: {
      nodes: names(row.studios).map((name, i) => ({
        id: String(row.studios?.[i]?.id ?? name),
        name,
        isAnimationStudio: true,
      })),
    },
    trailer: null,
    rankings: [],
    tags: [],
    externalLinks: malId
      ? [
          {
            site: "MyAnimeList",
            url: `https://myanimelist.net/anime/${malId}`,
            type: null,
            color: null,
            icon: null,
          },
        ]
      : [],
    stats: { statusDistribution: [], scoreDistribution: [] },
    _source: "mal",
  };
}

// --- id bridging -------------------------------------------------------------

/**
 * Only *answered* lookups are cached. Caching a failed request as "no mapping"
 * would drop that anime from every rail for the life of the process — a single
 * AniZip hiccup was enough to take a 15-item rail down to one.
 */
const idCache = new Map<string, number | null>();

type LookupResult = { ok: true; mappings: any } | { ok: false };

async function aniZipLookup(param: string, value: number): Promise<LookupResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ANI_ZIP}?${param}=${value}`, {
        signal: AbortSignal.timeout(8000),
        next: { revalidate: 86400 },
      });
      // 404 is a real answer: AniZip knows nothing about this id.
      if (res.status === 404) return { ok: true, mappings: null };
      if (res.ok) return { ok: true, mappings: (await res.json())?.mappings ?? null };
    } catch {
      // fall through to retry
    }
    if (attempt < 2) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
  }
  return { ok: false };
}

async function resolveId(
  key: string,
  param: string,
  value: number,
  field: string,
): Promise<number | null> {
  if (idCache.has(key)) return idCache.get(key) ?? null;

  const result = await aniZipLookup(param, value);
  if (!result.ok) return null;

  const id = positive(result.mappings?.[field]);
  idCache.set(key, id);
  return id;
}

/** AniList id → MAL id, via AniZip (which does not depend on AniList). */
export async function resolveMalIdFromAniList(anilistId: number): Promise<number | null> {
  return resolveId(`al:${anilistId}`, "anilist_id", anilistId, "mal_id");
}

/** MAL id → AniList id, so fallback cards still deep-link correctly. */
export async function resolveAniListIdFromMal(malId: number): Promise<number | null> {
  return resolveId(`mal:${malId}`, "mal_id", malId, "anilist_id");
}

/** Resolve a batch of MAL ids: our own metadata rows first, AniZip for the rest. */
async function resolveAniListIds(malIds: number[]): Promise<Map<number, number>> {
  const resolved = new Map<number, number>();
  const wanted = [...new Set(malIds)];
  if (wanted.length === 0) return resolved;

  // One DB round-trip covers every anime the site has already seen, which keeps
  // the AniZip fan-out to genuinely unknown ids.
  try {
    for (const [malId, anilistId] of await getAniListIdsByMalIds(wanted)) {
      resolved.set(malId, anilistId);
    }
  } catch {
    // DB unavailable — AniZip can still answer for all of them.
  }

  const queue = wanted.filter((malId) => !resolved.has(malId));
  const CONCURRENCY = 3;

  async function worker() {
    for (;;) {
      const malId = queue.shift();
      if (malId === undefined) return;
      const anilistId = await resolveAniListIdFromMal(malId);
      if (anilistId) resolved.set(malId, anilistId);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker()),
  );
  return resolved;
}

// --- fetchers ----------------------------------------------------------------

async function malJson(path: string): Promise<any | null> {
  if (!getMalClientId()) return null;
  try {
    const res = await malApiGet(path, { revalidate: 3600 });
    if (!res.ok) {
      console.error(`[mal-fallback] ${path} -> HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[mal-fallback] ${path} failed:`, err);
    return null;
  }
}

/** Map a MAL list response (`{data:[{node}]}`) into AniList-shaped media. */
async function mapMalList(json: any): Promise<FallbackMedia[]> {
  const nodes: any[] = (json?.data ?? [])
    .map((entry: any) => entry?.node)
    .filter(Boolean);
  if (nodes.length === 0) return [];

  const ids = await resolveAniListIds(
    nodes.map((n) => positive(n.id)).filter((id): id is number => id != null),
  );

  // Drop anything we can't bridge — a MAL id in an AniList slot would deep-link
  // to an unrelated anime.
  return nodes
    .map((node) => {
      const anilistId = ids.get(node.id);
      return anilistId ? mapMalNode(anilistId, node) : null;
    })
    .filter((m): m is FallbackMedia => m != null);
}

/**
 * AniList `Media` for an AniList id, sourced from MAL. Returns null when the id
 * can't be bridged or MAL is unreachable — callers should then keep whatever
 * error AniList gave them.
 */
export async function fetchMediaFromMal(
  anilistId: number,
  knownMalId?: number | null,
): Promise<FallbackMedia | null> {
  const malId = positive(knownMalId) ?? (await resolveMalIdFromAniList(anilistId));
  if (!malId) return null;

  const row = await malJson(`/anime/${malId}?fields=${DETAIL_FIELDS}`);
  return row?.id ? mapMalNode(anilistId, row) : null;
}

/** Filter MAL results by AniList-compatible criteria (local client-side). */
export function filterMalResults(
  media: FallbackMedia[],
  opts: {
    genres?: string[] | null;
    genresExclude?: string[] | null;
    status?: string | null;
    format?: string | null;
    scoreMin?: number | null;
    scoreMax?: number | null;
    startDateMin?: number | null;
    startDateMax?: number | null;
  },
): FallbackMedia[] {
  return media.filter((m) => {
    if (opts.genres?.length) {
      const hasGenre = opts.genres.some((g) => m.genres.includes(g));
      if (!hasGenre) return false;
    }
    if (opts.genresExclude?.length) {
      const hasExcluded = opts.genresExclude.some((g) => m.genres.includes(g));
      if (hasExcluded) return false;
    }
    if (opts.status && m.status !== opts.status) return false;
    if (opts.format && m.format !== opts.format) return false;
    if (opts.scoreMin != null && (m.averageScore ?? 0) < opts.scoreMin) return false;
    if (opts.scoreMax != null && (m.averageScore ?? 100) > opts.scoreMax) return false;
    if (opts.startDateMin != null) {
      const year = m.startDate.year ?? 0;
      if (year * 10000 + (m.startDate.month ?? 0) * 100 + (m.startDate.day ?? 0) < opts.startDateMin) {
        return false;
      }
    }
    if (opts.startDateMax != null) {
      const year = m.startDate.year ?? 9999;
      if (year * 10000 + (m.startDate.month ?? 12) * 100 + (m.startDate.day ?? 31) > opts.startDateMax) {
        return false;
      }
    }
    return true;
  });
}

export async function searchMediaOnMal(
  query: string,
  limit = 24,
): Promise<FallbackMedia[]> {
  if (!query.trim()) return [];
  const json = await malJson(
    `/anime?q=${encodeURIComponent(query.trim())}&limit=${Math.min(limit, 100)}&fields=${LIST_FIELDS}`,
  );
  return mapMalList(json);
}

export type MalRankingType =
  | "all"
  | "airing"
  | "upcoming"
  | "tv"
  | "movie"
  | "ova"
  | "special"
  | "bypopularity"
  | "favorite";

export async function fetchMalRanking(
  rankingType: MalRankingType,
  limit = 24,
): Promise<FallbackMedia[]> {
  const json = await malJson(
    `/anime/ranking?ranking_type=${rankingType}&limit=${Math.min(limit, 100)}&fields=${LIST_FIELDS}`,
  );
  return mapMalList(json);
}

const SEASONS = ["winter", "spring", "summer", "fall"] as const;

/** MAL season bucket for a date — matches AniList's WINTER/SPRING/SUMMER/FALL. */
export function malSeasonFor(date = new Date()): { year: number; season: string } {
  return { year: date.getUTCFullYear(), season: SEASONS[Math.floor(date.getUTCMonth() / 3)] };
}

export async function fetchMalSeason(
  year: number,
  season: string,
  limit = 24,
): Promise<FallbackMedia[]> {
  const json = await malJson(
    `/anime/season/${year}/${season}?sort=anime_num_list_users&limit=${Math.min(limit, 100)}&fields=${LIST_FIELDS}`,
  );
  return mapMalList(json);
}

export type FeaturedStudio = {
  id: string;
  name: string;
  favourites?: number;
  image?: string;
};

/**
 * Top studios by poll votes — a very rough proxy for AniList's "favourite studios".
 * MAL has no "studios by popularity" endpoint, so we extract the unique studios from
 * the top-airing anime and count their appearances.
 */
export async function fetchMalFeaturedStudios(limit = 20): Promise<FeaturedStudio[]> {
  const airing = await fetchMalRanking("airing", 100).catch(() => []);
  if (airing.length === 0) return [];

  const studioCounts = new Map<string, { name: string; count: number }>();
  for (const media of airing) {
    for (const studio of media.studios.nodes) {
      const key = studio.id;
      const current = studioCounts.get(key) ?? { name: studio.name, count: 0 };
      current.count += 1;
      studioCounts.set(key, current);
    }
  }

  return Array.from(studioCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(({ name, count }) => ({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      favourites: count * 10,
    }));
}

/**
 * Relations + recommendations in the AniList `Media` response shape.
 *
 * Characters and voice actors come back empty — MAL's API exposes no cast, so
 * those sections stay hidden rather than showing wrong people.
 */
export async function fetchMalRelated(anilistId: number): Promise<any | null> {
  const malId = await resolveMalIdFromAniList(anilistId);
  if (!malId) return null;

  const row = await malJson(
    `/anime/${malId}?fields=id,related_anime{node{${LIST_FIELDS}},relation_type},recommendations{node{${LIST_FIELDS}}}`,
  );
  if (!row) return null;

  const relatedNodes: any[] = (row.related_anime ?? []).map((e: any) => e?.node).filter(Boolean);
  const recNodes: any[] = (row.recommendations ?? []).map((e: any) => e?.node).filter(Boolean);

  const ids = await resolveAniListIds(
    [...relatedNodes, ...recNodes]
      .map((n) => positive(n.id))
      .filter((id): id is number => id != null),
  );

  const toNode = (node: any) => {
    const id = ids.get(node.id);
    return id ? { ...mapMalNode(id, node), type: "ANIME" } : null;
  };

  return {
    Media: {
      characters: { edges: [] },
      relations: {
        edges: (row.related_anime ?? [])
          .map((edge: any) => {
            const node = edge?.node ? toNode(edge.node) : null;
            return node
              ? {
                  relationType: String(edge.relation_type ?? "OTHER").toUpperCase(),
                  node,
                }
              : null;
          })
          .filter(Boolean),
      },
      recommendations: {
        nodes: recNodes
          .map((node) => {
            const mapped = toNode(node);
            return mapped ? { mediaRecommendation: mapped } : null;
          })
          .filter(Boolean),
      },
    },
  };
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/**
 * A day's airing schedule assembled from MAL's per-anime `broadcast` field.
 *
 * MAL has no airing-schedule endpoint, so this filters the current season by
 * broadcast weekday and rebuilds each slot's timestamp from the JST start time.
 * Episode numbers aren't recoverable this way and come back as 0.
 */
export async function fetchMalScheduleForDate(
  date: Date,
): Promise<Array<{ media: FallbackMedia; airingAt: number }>> {
  const { year, season } = malSeasonFor(date);
  const seasonal = await fetchMalSeason(year, season, 100);
  if (seasonal.length === 0) return [];

  // Broadcast days are JST; read the requested date in that zone.
  const jst = new Date(date.getTime() + 9 * 3600_000);
  const weekday = WEEKDAYS[jst.getUTCDay()];

  const slots: Array<{ media: FallbackMedia; airingAt: number }> = [];
  for (const media of seasonal) {
    if (media.status !== "RELEASING") continue;
    if (media.broadcastDay?.toLowerCase() !== weekday) continue;

    const [hh, mm] = (media.broadcastTime ?? "00:00").split(":").map(Number);
    // JST is UTC+9 year-round, so the UTC instant is simply the JST wall clock
    // shifted back nine hours.
    const airingAt = Math.floor(
      Date.UTC(
        jst.getUTCFullYear(),
        jst.getUTCMonth(),
        jst.getUTCDate(),
        (hh || 0) - 9,
        mm || 0,
      ) / 1000,
    );
    slots.push({ media, airingAt });
  }

  return slots.sort((a, b) => a.airingAt - b.airingAt);
}
