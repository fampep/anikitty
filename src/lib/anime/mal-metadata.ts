import { malApiGet } from "@/lib/anime/mal-api";

const JIKAN_API = "https://api.jikan.moe/v4";

const MAL_DETAIL_FIELDS = [
  "mean",
  "rank",
  "popularity",
  "num_list_users",
  "num_scoring_users",
  "status",
  "rating",
  "broadcast",
  "source",
  "themes",
  "licensors",
  "season",
  "year",
  "media_type",
].join(",");

export type MalAnimeDetails = {
  score: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  scoredBy: number | null;
  status: string | null;
  contentRating: string | null;
  broadcast: string | null;
  source: string | null;
  themes: string[];
  licensors: string[];
  season: string | null;
  url: string;
};

function humanizeMalStatus(value: string): string {
  switch (value) {
    case "finished_airing":
      return "Finished Airing";
    case "currently_airing":
      return "Currently Airing";
    case "not_yet_aired":
      return "Not Yet Aired";
    default:
      return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function humanizeMalContentRating(value: string): string {
  const map: Record<string, string> = {
    g: "G — All Ages",
    pg: "PG — Children",
    pg_13: "PG-13 — Teens 13+",
    r: "R — 17+ (violence & profanity)",
    r_plus: "R+ — Mild Nudity",
    rx: "Rx — Hentai",
  };
  return map[value] ?? value.toUpperCase();
}

function humanizeMalSource(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMalBroadcast(broadcast?: {
  day_of_the_week?: string;
  start_time?: string;
}): string | null {
  if (!broadcast?.day_of_the_week) return null;
  const day =
    broadcast.day_of_the_week.charAt(0).toUpperCase() + broadcast.day_of_the_week.slice(1);
  const time = broadcast.start_time?.slice(0, 5);
  return time ? `${day}s at ${time} (JST)` : day;
}

function formatMalSeason(season?: string, year?: number): string | null {
  if (!season && !year) return null;
  const label = season ? season.charAt(0).toUpperCase() + season.slice(1) : "";
  if (year && label) return `${label} ${year}`;
  return label || (year ? String(year) : null);
}

function namedList(items?: Array<{ name?: string }>): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => item.name?.trim()).filter((name): name is string => !!name);
}

export function formatMalMemberCount(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString();
}

function parseMalApiRow(malId: number, row: Record<string, unknown>): MalAnimeDetails | null {
  if (!row || typeof row !== "object") return null;

  const mean = typeof row.mean === "number" && row.mean > 0 ? row.mean : null;
  const rank = typeof row.rank === "number" && row.rank > 0 ? row.rank : null;
  const popularity = typeof row.popularity === "number" && row.popularity > 0 ? row.popularity : null;
  const members =
    typeof row.num_list_users === "number" && row.num_list_users > 0 ? row.num_list_users : null;
  const scoredBy =
    typeof row.num_scoring_users === "number" && row.num_scoring_users > 0
      ? row.num_scoring_users
      : null;

  const status = typeof row.status === "string" ? humanizeMalStatus(row.status) : null;
  const contentRating =
    typeof row.rating === "string" ? humanizeMalContentRating(row.rating) : null;
  const broadcast =
    row.broadcast && typeof row.broadcast === "object"
      ? formatMalBroadcast(row.broadcast as { day_of_the_week?: string; start_time?: string })
      : null;
  const source = typeof row.source === "string" ? humanizeMalSource(row.source) : null;
  const themes = namedList(row.themes as Array<{ name?: string }> | undefined);
  const licensors = namedList(row.licensors as Array<{ name?: string }> | undefined);
  const season = formatMalSeason(
    typeof row.season === "string" ? row.season : undefined,
    typeof row.year === "number" ? row.year : undefined,
  );

  if (!mean && !rank && !popularity && !members && !themes.length && !licensors.length) {
    return null;
  }

  return {
    score: mean,
    rank,
    popularity,
    members,
    scoredBy,
    status,
    contentRating,
    broadcast,
    source,
    themes,
    licensors,
    season,
    url: `https://myanimelist.net/anime/${malId}`,
  };
}

async function fetchMalFromJikan(malId: number): Promise<MalAnimeDetails | null> {
  try {
    const res = await fetch(`${JIKAN_API}/anime/${malId}`, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const row = data?.data;
    if (!row) return null;

    const themes = Array.isArray(row.themes)
      ? row.themes.map((t: { name?: string }) => t.name).filter(Boolean)
      : [];
    const licensors = Array.isArray(row.licensors)
      ? row.licensors.map((l: { name?: string }) => l.name).filter(Boolean)
      : [];

    return {
      score: typeof row.score === "number" && row.score > 0 ? row.score : null,
      rank: row.rank ?? null,
      popularity: row.popularity ?? null,
      members: row.members ?? null,
      scoredBy: row.scored_by ?? null,
      status: typeof row.status === "string" ? row.status : null,
      contentRating: row.rating ? humanizeMalContentRating(String(row.rating)) : null,
      broadcast: row.broadcast?.string ?? null,
      source: row.source ? humanizeMalSource(String(row.source)) : null,
      themes,
      licensors,
      season: formatMalSeason(row.season?.toLowerCase?.(), row.year),
      url: `https://myanimelist.net/anime/${malId}`,
    };
  } catch {
    return null;
  }
}

/** Rich MAL stats for anime detail pages (official API, Jikan fallback). */
export async function fetchMalAnimeDetails(malId: number): Promise<MalAnimeDetails | null> {
  if (!malId || malId <= 0) return null;

  try {
    const res = await malApiGet(`/anime/${malId}?fields=${MAL_DETAIL_FIELDS}`);
    if (res.ok) {
      const row = (await res.json()) as Record<string, unknown>;
      const parsed = parseMalApiRow(malId, row);
      if (parsed) return parsed;
    }
  } catch {
    // fall through to Jikan
  }

  return fetchMalFromJikan(malId);
}
