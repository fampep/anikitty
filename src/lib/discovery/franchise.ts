import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";

const CHAIN_TYPES = new Set([
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "ALTERNATIVE",
  "SUMMARY",
  "OTHER",
]);

const MEDIA_FRAGMENT = `
  id
  title { english romaji native }
  coverImage { extraLarge }
  bannerImage
  format
  episodes
  duration
  status
  season
  seasonYear
  averageScore
  popularity
  startDate { year month day }
  endDate { year month day }
  relations {
    edges {
      relationType(version: 2)
      node {
        id
        type
      }
    }
  }
`;

const SEED_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      ${MEDIA_FRAGMENT}
    }
  }
`;

const BATCH_QUERY = `
  query ($ids: [Int]) {
    Page(page: 1, perPage: 50) {
      media(id_in: $ids, type: ANIME) {
        ${MEDIA_FRAGMENT}
      }
    }
  }
`;

export type FranchiseEntry = {
  id: string;
  name: string;
  jname: string;
  poster: string;
  type: string;
  format: string | null;
  episodes: number | null;
  duration: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  score: number | null;
  popularity: number | null;
  startDateKey: number;
  startDate: string | null;
  relationType: string | null;
  isSeed: boolean;
  runtimeMinutes: number | null;
};

export type FranchisePayload = {
  seedId: string;
  title: string;
  banner: string | null;
  poster: string | null;
  entries: FranchiseEntry[];
  chronological: FranchiseEntry[];
  releaseOrder: FranchiseEntry[];
  byFormat: {
    seasons: FranchiseEntry[];
    movies: FranchiseEntry[];
    ovas: FranchiseEntry[];
    specials: FranchiseEntry[];
    other: FranchiseEntry[];
  };
  totalRuntimeMinutes: number;
  totalEpisodes: number;
  entryCount: number;
};

function startDateKey(node: {
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
}): number {
  const y = node?.startDate?.year ?? 0;
  const m = node?.startDate?.month ?? 0;
  const d = node?.startDate?.day ?? 0;
  return y * 10_000 + m * 100 + d;
}

function formatDate(node: {
  startDate?: { year?: number | null; month?: number | null; day?: number | null } | null;
}): string | null {
  const y = node?.startDate?.year;
  if (!y) return null;
  const m = String(node?.startDate?.month ?? 1).padStart(2, "0");
  const d = String(node?.startDate?.day ?? 1).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function runtimeMinutes(node: { episodes?: number | null; duration?: number | null }): number | null {
  const eps = node.episodes ?? 0;
  const dur = node.duration ?? 0;
  if (eps > 0 && dur > 0) return eps * dur;
  if (dur > 0) return dur;
  return null;
}

function mapEntry(
  node: any,
  seedId: number,
  relationType: string | null,
): FranchiseEntry {
  return {
    id: String(node.id),
    name: toTitle(node.title ?? {}),
    jname: node.title?.romaji ?? "",
    poster: node.coverImage?.extraLarge ?? "",
    type: toFormat(node.format),
    format: node.format ?? null,
    episodes: node.episodes ?? null,
    duration: node.duration ?? null,
    status: node.status ?? null,
    season: node.season ?? null,
    seasonYear: node.seasonYear ?? null,
    score: node.averageScore ?? null,
    popularity: node.popularity ?? null,
    startDateKey: startDateKey(node),
    startDate: formatDate(node),
    relationType,
    isSeed: Number(node.id) === seedId,
    runtimeMinutes: runtimeMinutes(node),
  };
}

function bucketFormat(format: string | null | undefined): keyof FranchisePayload["byFormat"] {
  switch (format) {
    case "TV":
    case "TV_SHORT":
      return "seasons";
    case "MOVIE":
      return "movies";
    case "OVA":
    case "ONA":
      return "ovas";
    case "SPECIAL":
    case "MUSIC":
      return "specials";
    default:
      return "other";
  }
}

/**
 * BFS through AniList relation edges to assemble a franchise graph rooted at seedId.
 */
export async function buildFranchise(seedId: number): Promise<FranchisePayload | null> {
  const visited = new Map<number, any>();
  const relationOf = new Map<number, string>();
  const queue: number[] = [seedId];

  // Cap BFS depth/breadth to stay within AniList rate limits.
  const MAX_NODES = 40;

  while (queue.length > 0 && visited.size < MAX_NODES) {
    const batch = queue.splice(0, 25).filter((id) => !visited.has(id));
    if (batch.length === 0) continue;

    let media: any[] = [];
    if (batch.length === 1 && batch[0] === seedId && visited.size === 0) {
      const raw = await queryAniList<{ Media?: any }>(SEED_QUERY, { id: seedId });
      if (!raw.Media) return null;
      media = [raw.Media];
    } else {
      const raw = await queryAniList<{ Page?: { media: any[] } }>(BATCH_QUERY, { ids: batch });
      media = raw.Page?.media ?? [];
    }

    for (const m of media) {
      if (!m?.id || visited.has(m.id)) continue;
      visited.set(m.id, m);
      for (const edge of m.relations?.edges ?? []) {
        const node = edge?.node;
        if (!node?.id || node.type !== "ANIME") continue;
        const rel = String(edge.relationType ?? "OTHER");
        if (!CHAIN_TYPES.has(rel)) continue;
        if (!visited.has(node.id) && !queue.includes(node.id) && visited.size + queue.length < MAX_NODES) {
          queue.push(node.id);
          if (!relationOf.has(node.id)) relationOf.set(node.id, rel);
        }
      }
    }
  }

  if (!visited.has(seedId)) return null;

  const seed = visited.get(seedId);
  const entries = [...visited.values()].map((node) =>
    mapEntry(node, seedId, Number(node.id) === seedId ? "CURRENT" : relationOf.get(node.id) ?? null),
  );

  const chronological = [...entries].sort(
    (a, b) => a.startDateKey - b.startDateKey || (a.seasonYear ?? 0) - (b.seasonYear ?? 0),
  );
  const releaseOrder = chronological;

  const byFormat: FranchisePayload["byFormat"] = {
    seasons: [],
    movies: [],
    ovas: [],
    specials: [],
    other: [],
  };
  for (const e of chronological) {
    byFormat[bucketFormat(e.format)].push(e);
  }

  const totalRuntimeMinutes = entries.reduce((sum, e) => sum + (e.runtimeMinutes ?? 0), 0);
  const totalEpisodes = entries.reduce((sum, e) => sum + (e.episodes ?? 0), 0);

  const enriched = await enrichAnimeListWithAudio(
    entries.map((e) => ({
      id: e.id,
      name: e.name,
      jname: e.jname,
      poster: e.poster,
      episodes: { sub: e.episodes ?? 0, dub: 0 },
      type: e.type,
    })),
  );
  const audioById = new Map(enriched.map((a) => [a.id, a]));

  const withAudio = (list: FranchiseEntry[]) =>
    list.map((e) => {
      const audio = audioById.get(e.id);
      return audio ? { ...e, poster: audio.poster || e.poster } : e;
    });

  return {
    seedId: String(seedId),
    title: toTitle(seed.title ?? {}),
    banner: seed.bannerImage ?? null,
    poster: seed.coverImage?.extraLarge ?? null,
    entries: withAudio(entries),
    chronological: withAudio(chronological),
    releaseOrder: withAudio(releaseOrder),
    byFormat: {
      seasons: withAudio(byFormat.seasons),
      movies: withAudio(byFormat.movies),
      ovas: withAudio(byFormat.ovas),
      specials: withAudio(byFormat.specials),
      other: withAudio(byFormat.other),
    },
    totalRuntimeMinutes,
    totalEpisodes,
    entryCount: entries.length,
  };
}
