import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";

export type VaRoleCharacter = { id: number; name: string; image: string | null };

/** Normalized media-type buckets for VA filmography tabs. */
export type VaMediaCategory =
  | "tv"
  | "movie"
  | "ova"
  | "ona"
  | "special"
  | "music"
  | "game"
  | "other";

/** Normalized voice-role keys for filter chips. */
export type VaRoleKey = "main" | "supporting" | "background" | "minor" | "cameo" | "unknown";

export type VaRole = {
  role: string | null;
  roleKey: VaRoleKey;
  character: VaRoleCharacter | null;
  anime: {
    id: string;
    name: string;
    english: string | null;
    romaji: string;
    poster: string;
    type: string;
    format: string | null;
    category: VaMediaCategory;
    year: number | null;
    episodes: number | null;
    score: number | null;
    status: string | null;
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
  /** First chunk of credits only — remaining pages via getVoiceActorFilmographyPage. */
  roles: VaRole[];
  rolesPage: number;
  rolesHasNextPage: boolean;
};

export type VoiceActorFilmographyPage = {
  roles: VaRole[];
  page: number;
  hasNextPage: boolean;
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
export const VA_MEDIA_PER_PAGE = 25;
/** Safety cap (~1000 roles) for extremely large filmographies. */
export const VA_MAX_MEDIA_PAGES = 40;

const MEDIA_PER_PAGE = VA_MEDIA_PER_PAGE;
const MAX_MEDIA_PAGES = VA_MAX_MEDIA_PAGES;

/**
 * Filmography sort: POPULARITY_DESC (AniList/TMDB-style — most-known titles first).
 */
const MEDIA_SORT = "POPULARITY_DESC";

const ROLE_RANK: Record<string, number> = {
  MAIN: 0,
  SUPPORTING: 1,
  BACKGROUND: 2,
  MINOR: 3,
  CAMEO: 4,
};

const MEDIA_NODE_FIELDS = `
  id
  type
  title { english romaji }
  coverImage { extraLarge large }
  format
  seasonYear
  startDate { year }
  episodes
  averageScore
  status
`;

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
          node { ${MEDIA_NODE_FIELDS} }
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
          node { ${MEDIA_NODE_FIELDS} }
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
    episodes?: number | null;
    averageScore?: number | null;
    status?: string | null;
  };
};

type CharacterMediaPage = {
  pageInfo?: { hasNextPage?: boolean | null; currentPage?: number | null } | null;
  edges?: StaffEdge[] | null;
};

export const VA_MEDIA_CATEGORY_ORDER: VaMediaCategory[] = [
  "tv",
  "movie",
  "ova",
  "ona",
  "special",
  "music",
  "game",
  "other",
];

export const VA_ROLE_KEY_ORDER: VaRoleKey[] = [
  "main",
  "supporting",
  "background",
  "minor",
  "cameo",
  "unknown",
];

export function formatToVaCategory(format: string | null | undefined): VaMediaCategory {
  switch ((format ?? "").toUpperCase()) {
    case "TV":
    case "TV_SHORT":
      return "tv";
    case "MOVIE":
      return "movie";
    case "OVA":
      return "ova";
    case "ONA":
      return "ona";
    case "SPECIAL":
      return "special";
    case "MUSIC":
      return "music";
    default:
      return "other";
  }
}

export function normalizeVaRoleKey(role: string | null | undefined): VaRoleKey {
  if (!role) return "unknown";
  const key = role.trim().toUpperCase().replace(/\s+/g, "_");
  if (key === "MAIN" || key === "PROTAGONIST") return "main";
  if (key === "SUPPORTING") return "supporting";
  if (key === "BACKGROUND") return "background";
  if (key === "MINOR") return "minor";
  if (key === "CAMEO") return "cameo";
  return "unknown";
}

function roleRank(role: string | null | undefined): number {
  if (!role) return 99;
  return ROLE_RANK[role.toUpperCase()] ?? 50;
}

function edgeToRole(edge: StaffEdge): VaRole | null {
  const node = edge.node;
  // Voice credits are almost always ANIME; keep manga/etc. out of filmography tabs.
  if (!node || node.type !== "ANIME") return null;
  const character = edge.characters?.[0];
  const english = node.title?.english?.trim() || null;
  const romaji = node.title?.romaji?.trim() || "";
  const format = node.format ?? null;
  return {
    role: edge.characterRole ?? null,
    roleKey: normalizeVaRoleKey(edge.characterRole),
    character: character
      ? { id: character.id, name: character.name?.full ?? "", image: character.image?.large ?? null }
      : null,
    anime: {
      id: String(node.id),
      name: toTitle(node.title ?? {}),
      english,
      romaji,
      poster: node.coverImage?.extraLarge ?? node.coverImage?.large ?? "",
      type: toFormat(node.format),
      format,
      category: formatToVaCategory(format),
      year: node.seasonYear ?? node.startDate?.year ?? null,
      episodes: typeof node.episodes === "number" ? node.episodes : null,
      score: typeof node.averageScore === "number" ? node.averageScore : null,
      status: node.status ?? null,
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

/** Deduplicate roles across paginated fetches (same preference rules as mergeRoleEdges). */
export function mergeVaRoles(existing: VaRole[], incoming: VaRole[]): VaRole[] {
  const best = new Map<string, VaRole>();
  for (const role of [...existing, ...incoming]) {
    const key = `${role.anime.id}-${role.character?.id ?? ""}`;
    const prev = best.get(key);
    if (!prev || roleRank(role.role) < roleRank(prev.role)) {
      best.set(key, role);
    }
  }
  return Array.from(best.values());
}

export function vaRoleDedupeKey(role: VaRole): string {
  return `${role.anime.id}-${role.character?.id ?? ""}`;
}

async function fetchCharacterMediaPage(id: number, page: number): Promise<CharacterMediaPage> {
  const data = await queryAniList<{
    Staff?: { characterMedia?: CharacterMediaPage | null } | null;
  }>(STAFF_MEDIA_PAGE_QUERY, { id, page });
  return data.Staff?.characterMedia ?? {};
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

  const media = s.characterMedia ?? {};
  const roles = mergeRoleEdges(media.edges ?? []);
  const rolesPage = media.pageInfo?.currentPage ?? 1;
  const rolesHasNextPage =
    media.pageInfo?.hasNextPage === true && rolesPage < MAX_MEDIA_PAGES;

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
    rolesPage,
    rolesHasNextPage,
  };
}

export const getVoiceActor = unstable_cache(fetchVoiceActor, ["voice-actor-v5"], {
  revalidate: 86400,
});

async function fetchVoiceActorFilmographyPage(
  id: number,
  page: number,
): Promise<VoiceActorFilmographyPage> {
  const safePage = Math.max(1, Math.min(MAX_MEDIA_PAGES, Math.floor(page) || 1));
  const media = await fetchCharacterMediaPage(id, safePage);
  const roles = mergeRoleEdges(media.edges ?? []);
  const currentPage = media.pageInfo?.currentPage ?? safePage;
  const hasNextPage =
    media.pageInfo?.hasNextPage === true && currentPage < MAX_MEDIA_PAGES;

  return {
    roles,
    page: currentPage,
    hasNextPage,
  };
}

export const getVoiceActorFilmographyPage = unstable_cache(
  fetchVoiceActorFilmographyPage,
  ["voice-actor-filmography-v2"],
  { revalidate: 86400 },
);

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

export function formatVaStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  switch (status.toUpperCase()) {
    case "FINISHED":
      return "Finished";
    case "RELEASING":
      return "Airing";
    case "NOT_YET_RELEASED":
      return "Upcoming";
    case "CANCELLED":
      return "Cancelled";
    case "HIATUS":
      return "Hiatus";
    default:
      return status;
  }
}
