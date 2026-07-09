import { malApiGet, malWebGet } from "@/lib/anime/mal-api";

export type EpisodeContentFlags = {
  filler: boolean;
  recap: boolean;
};

type MalEpisodeRow = { number: number; filler: boolean; recap: boolean };

/** Parse filler/recap badges from MAL's public episode list HTML. */
export function parseMalEpisodeListHtml(html: string): MalEpisodeRow[] {
  const rows: MalEpisodeRow[] = [];
  const rowPattern =
    /episode-number[^>]*data-raw="(\d+)"[\s\S]*?episode-title fs12">([\s\S]*?)<\/td>/g;

  let match: RegExpExecArray | null;
  while ((match = rowPattern.exec(html)) !== null) {
    const num = parseInt(match[1], 10);
    if (!num) continue;
    const titleCell = match[2];
    rows.push({
      number: num,
      filler: /icon-episode-type-bg[^>]*>\s*Filler\s*</i.test(titleCell),
      recap: /icon-episode-type-bg[^>]*>\s*Recap\s*</i.test(titleCell),
    });
  }

  return rows;
}

function mergeFlags(
  map: Record<number, EpisodeContentFlags>,
  rows: MalEpisodeRow[],
): void {
  for (const row of rows) {
    map[row.number] = { filler: row.filler, recap: row.recap };
  }
}

/**
 * Official MAL REST `/anime/{id}/episodes` (closed beta for most client IDs).
 * Returns null when the endpoint is unavailable.
 */
async function fetchMalEpisodeFlagsFromApi(
  malId: number,
  maxEpisode: number,
): Promise<Record<number, EpisodeContentFlags> | null> {
  const map: Record<number, EpisodeContentFlags> = {};
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await malApiGet(
      `/anime/${malId}/episodes?limit=${limit}&offset=${offset}`,
    );

    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) break;

    let json: {
      data?: Array<Record<string, unknown>>;
      paging?: { next?: string | null };
    };
    try {
      json = (await res.json()) as typeof json;
    } catch {
      break;
    }

    const batch = json.data ?? [];
    if (!batch.length) break;

    for (const ep of batch) {
      const num =
        typeof ep.episode === "number"
          ? ep.episode
          : typeof ep.number === "number"
            ? ep.number
            : typeof ep.mal_id === "number"
              ? ep.mal_id
              : 0;
      if (num <= 0) continue;

      map[num] = {
        filler: ep.filler === true || ep.is_filler === true,
        recap: ep.recap === true || ep.is_recap === true,
      };
    }

    if (maxEpisode > 0 && Object.keys(map).length >= maxEpisode) break;

    if (json.paging?.next) {
      offset += limit;
      continue;
    }
    if (batch.length < limit) break;
    offset += limit;
    if (offset > 5000) break;
  }

  return Object.keys(map).length > 0 ? map : null;
}

/** MAL website episode list — same filler/recap badges shown on myanimelist.net. */
async function fetchMalEpisodeFlagsFromWebsite(
  malId: number,
  maxEpisode: number,
): Promise<Record<number, EpisodeContentFlags>> {
  const map: Record<number, EpisodeContentFlags> = {};
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const res = await malWebGet(`/anime/${malId}/_/episode?offset=${offset}`);
    if (!res.ok) break;

    const html = await res.text();
    const rows = parseMalEpisodeListHtml(html);
    if (!rows.length) break;

    mergeFlags(map, rows);

    if (maxEpisode > 0 && Object.keys(map).length >= maxEpisode) break;
    if (rows.length < pageSize) break;

    offset += pageSize;
    if (offset > 5000) break;
  }

  return map;
}

/** Episode filler/recap flags keyed by episode number, sourced from MyAnimeList. */
export async function fetchMalEpisodeFlags(
  malId: number,
  maxEpisode = 0,
): Promise<Record<number, EpisodeContentFlags>> {
  if (!malId || malId <= 0) return {};

  try {
    const fromApi = await fetchMalEpisodeFlagsFromApi(malId, maxEpisode);
    if (fromApi) {
      if (maxEpisode > 0) {
        const trimmed: Record<number, EpisodeContentFlags> = {};
        for (const [key, value] of Object.entries(fromApi)) {
          const num = parseInt(key, 10);
          if (num > 0 && num <= maxEpisode) trimmed[num] = value;
        }
        return trimmed;
      }
      return fromApi;
    }

    const fromWeb = await fetchMalEpisodeFlagsFromWebsite(malId, maxEpisode);
    if (maxEpisode > 0) {
      const trimmed: Record<number, EpisodeContentFlags> = {};
      for (const [key, value] of Object.entries(fromWeb)) {
        const num = parseInt(key, 10);
        if (num > 0 && num <= maxEpisode) trimmed[num] = value;
      }
      return trimmed;
    }
    return fromWeb;
  } catch (err) {
    console.error("[mal] episode flags failed:", err);
    return {};
  }
}

/** Treat recap episodes as skippable filler for list filtering. */
export function isSkippableEpisode(flags: EpisodeContentFlags | undefined): boolean {
  if (!flags) return false;
  return flags.filler || flags.recap;
}
