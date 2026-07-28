import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";

export type VaRoleCharacter = { id: number; name: string; image: string | null };

export type VaRole = {
  role: string | null;
  character: VaRoleCharacter | null;
  anime: {
    id: string;
    name: string;
    jname: string;
    poster: string;
    type: string;
    year: number | null;
  };
};

export type VaFuzzyDate = {
  year: number | null;
  month: number | null;
  day: number | null;
};

export type VoiceActorDetail = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  language: string | null;
  description: string | null;
  home: string | null;
  gender: string | null;
  age: number | null;
  birthday: VaFuzzyDate | null;
  favourites: number | null;
  siteUrl: string | null;
  primaryOccupations: string[];
  roles: VaRole[];
};

export type VoiceActorSummary = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  language: string | null;
};

export type VoiceActorSearchResult = {
  results: VoiceActorSummary[];
  hasNextPage: boolean;
  currentPage: number;
};

/** AniList caps nested characterMedia.perPage at 25. */
const MEDIA_PER_PAGE = 25;
/** Safety cap (~1000 roles) for extremely large filmographies. */
const MAX_MEDIA_PAGES = 40;

/**
 * Filmography sort: POPULARITY_DESC (AniList/TMDB-style — most-known titles first).
 * Release-date order was the previous default; popularity is clearer for large credits.
 */
const MEDIA_SORT = "POPULARITY_DESC";

const ROLE_RANK: Record<string, number> = {
  MAIN: 0,
  SUPPORTING: 1,
  BACKGROUND: 2,
};

const STAFF_META_QUERY = `
  query ($id: Int, $page: Int) {
    Staff(id: $id) {
      id
      name { full native }
      image { large }
      languageV2
      description(asHtml: false)
      homeTown
      gender
      age
      dateOfBirth { year month day }
      favourites
      siteUrl
      primaryOccupations
      characterMedia(sort: ${MEDIA_SORT}, page: $page, perPage: ${MEDIA_PER_PAGE}) {
        pageInfo { hasNextPage currentPage }
        edges {
          characterRole
          characters { id name { full } image { large } }
          node {
            id
            type
            title { english romaji }
            coverImage { extraLarge large }
            format
            seasonYear
            startDate { year }
          }
        }
      }
    }
  }
`;

const STAFF_MEDIA_PAGE_QUERY = `
  query ($id: Int, $page: Int) {
    Staff(id: $id) {
      characterMedia(sort: ${MEDIA_SORT}, page: $page, perPage: ${MEDIA_PER_PAGE}) {
        pageInfo { hasNextPage currentPage }
        edges {
          characterRole
          characters { id name { full } image { large } }
          node {
            id
            type
            title { english romaji }
            coverImage { extraLarge large }
            format
            seasonYear
            startDate { year }
          }
        }
      }
    }
  }
`;

type StaffEdge = {
  characterRole?: string | null;
  characters?: Array<{ id: number; name?: { full?: string | null }; image?: { large?: string | null } }>;
  node?: {
    id: number;
    type?: string | null;
    title?: { english?: string | null; romaji?: string | null };
    coverImage?: { extraLarge?: string | null; large?: string | null };
    format?: string | null;
    seasonYear?: number | null;
    startDate?: { year?: number | null } | null;
  };
};

type CharacterMediaPage = {
  pageInfo?: { hasNextPage?: boolean | null; currentPage?: number | null } | null;
  edges?: StaffEdge[] | null;
};

function roleRank(role: string | null | undefined): number {
  if (!role) return 99;
  return ROLE_RANK[role.toUpperCase()] ?? 50;
}

function edgeToRole(edge: StaffEdge): VaRole | null {
  const node = edge.node;
  if (!node || node.type !== "ANIME") return null;
  const character = edge.characters?.[0];
  return {
    role: edge.characterRole ?? null,
    character: character
      ? { id: character.id, name: character.name?.full ?? "", image: character.image?.large ?? null }
      : null,
    anime: {
      id: String(node.id),
      name: toTitle(node.title ?? {}),
      jname: node.title?.romaji ?? "",
      poster: node.coverImage?.extraLarge ?? node.coverImage?.large ?? "",
      type: toFormat(node.format),
      year: node.seasonYear ?? node.startDate?.year ?? null,
    },
  };
}

/** Merge edges; one row per (anime, character). Prefer Main > Supporting > Background. */
function mergeRoleEdges(edges: StaffEdge[]): VaRole[] {
  const best = new Map<string, VaRole>();
  for (const edge of edges) {
    const role = edgeToRole(edge);
    if (!role) continue;
    const key = `${role.anime.id}-${role.character?.id ?? ""}`;
    const existing = best.get(key);
    if (!existing || roleRank(role.role) < roleRank(existing.role)) {
      best.set(key, role);
    }
  }
  return Array.from(best.values());
}

async function fetchCharacterMediaPage(id: number, page: number): Promise<CharacterMediaPage> {
  const data = await queryAniList<{
    Staff?: { characterMedia?: CharacterMediaPage | null } | null;
  }>(STAFF_MEDIA_PAGE_QUERY, { id, page });
  return data.Staff?.characterMedia ?? {};
}

/** Load remaining filmography pages in small parallel batches (avoids duplicate work via queryAniList cache). */
async function fetchAllCharacterMedia(id: number, firstPage: CharacterMediaPage | undefined): Promise<StaffEdge[]> {
  const edges: StaffEdge[] = [...(firstPage?.edges ?? [])];
  let hasNext = firstPage?.pageInfo?.hasNextPage === true;
  let page = (firstPage?.pageInfo?.currentPage ?? 1) + 1;
  const batchSize = 3;

  while (hasNext && page <= MAX_MEDIA_PAGES) {
    const batchPages: number[] = [];
    for (let i = 0; i < batchSize && page + i <= MAX_MEDIA_PAGES; i++) {
      batchPages.push(page + i);
    }

    const results = await Promise.all(batchPages.map((p) => fetchCharacterMediaPage(id, p)));
    hasNext = false;
    for (const media of results) {
      edges.push(...(media.edges ?? []));
      hasNext = media.pageInfo?.hasNextPage === true;
    }
    page += batchPages.length;
  }

  return edges;
}

async function fetchVoiceActor(id: number): Promise<VoiceActorDetail | null> {
  const data = await queryAniList<{
    Staff?: {
      id: number;
      name?: { full?: string | null; native?: string | null };
      image?: { large?: string | null };
      languageV2?: string | null;
      description?: string | null;
      homeTown?: string | null;
      gender?: string | null;
      age?: number | null;
      dateOfBirth?: { year?: number | null; month?: number | null; day?: number | null } | null;
      favourites?: number | null;
      siteUrl?: string | null;
      primaryOccupations?: string[] | null;
      characterMedia?: CharacterMediaPage | null;
    } | null;
  }>(STAFF_META_QUERY, { id, page: 1 });

  const s = data.Staff;
  if (!s) return null;

  const allEdges = await fetchAllCharacterMedia(id, s.characterMedia ?? undefined);
  const roles = mergeRoleEdges(allEdges);

  const dob = s.dateOfBirth;
  const birthday =
    dob && (dob.year || dob.month || dob.day)
      ? {
          year: dob.year ?? null,
          month: dob.month ?? null,
          day: dob.day ?? null,
        }
      : null;

  return {
    id: s.id,
    name: s.name?.full ?? "Unknown",
    native: s.name?.native ?? null,
    image: s.image?.large ?? null,
    language: s.languageV2 ?? null,
    description: (s.description ?? "").trim() || null,
    home: s.homeTown ?? null,
    gender: s.gender ?? null,
    age: typeof s.age === "number" ? s.age : null,
    birthday,
    favourites: typeof s.favourites === "number" ? s.favourites : null,
    siteUrl: s.siteUrl ?? null,
    primaryOccupations: s.primaryOccupations ?? [],
    roles,
  };
}

export const getVoiceActor = unstable_cache(fetchVoiceActor, ["voice-actor-v3"], {
  revalidate: 86400,
});

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { hasNextPage currentPage }
      staff(search: $search, sort: SEARCH_MATCH) {
        id
        name { full native }
        image { large }
        languageV2
        primaryOccupations
      }
    }
  }
`;

type StaffSearchNode = {
  id: number;
  name?: { full?: string | null; native?: string | null };
  image?: { large?: string | null };
  languageV2?: string | null;
  primaryOccupations?: string[] | null;
};

function isVoiceOccupation(occupations: string[] | null | undefined): boolean {
  const occ = (occupations ?? []).map((o) => o.toLowerCase());
  // Empty occupations: include (AniList often omits them for known VAs).
  if (occ.length === 0) return true;
  return occ.some((o) => o.includes("voice") || o.includes("actor") || o.includes("seiyuu"));
}

async function fetchVoiceActorSearch(
  query: string,
  language: string,
  page = 1,
  perPage = 30,
): Promise<VoiceActorSearchResult> {
  if (!query.trim()) {
    return { results: [], hasNextPage: false, currentPage: page };
  }

  const data = await queryAniList<{
    Page?: {
      pageInfo?: { hasNextPage?: boolean | null; currentPage?: number | null } | null;
      staff?: StaffSearchNode[] | null;
    } | null;
  }>(SEARCH_QUERY, {
    search: query.trim(),
    page,
    perPage,
  });

  const lang = language.trim().toLowerCase();
  const results = (data.Page?.staff ?? [])
    .filter((s) => {
      if (!isVoiceOccupation(s.primaryOccupations)) return false;
      if (lang && (s.languageV2 ?? "").toLowerCase() !== lang) return false;
      return true;
    })
    .map((s) => ({
      id: s.id,
      name: s.name?.full ?? "Unknown",
      native: s.name?.native ?? null,
      image: s.image?.large ?? null,
      language: s.languageV2 ?? null,
    }));

  return {
    results,
    hasNextPage: data.Page?.pageInfo?.hasNextPage === true,
    currentPage: data.Page?.pageInfo?.currentPage ?? page,
  };
}

export const searchVoiceActors = unstable_cache(fetchVoiceActorSearch, ["voice-actor-search-v2"], {
  revalidate: 3600,
});

/** Format AniList fuzzy birthday for display (e.g. "Jan 15, 1984"). */
export function formatVaBirthday(date: VaFuzzyDate | null | undefined): string | null {
  if (!date || (!date.year && !date.month && !date.day)) return null;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const parts: string[] = [];
  if (date.month && date.month >= 1 && date.month <= 12) {
    parts.push(months[date.month - 1]!);
    if (date.day) parts.push(String(date.day) + (date.year ? "," : ""));
  } else if (date.day) {
    parts.push(String(date.day));
  }
  if (date.year) parts.push(String(date.year));
  return parts.join(" ") || null;
}
