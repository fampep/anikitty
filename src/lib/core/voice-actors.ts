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

export type VoiceActorDetail = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  language: string | null;
  description: string | null;
  home: string | null;
  roles: VaRole[];
};

export type VoiceActorSummary = {
  id: number;
  name: string;
  native: string | null;
  image: string | null;
  language: string | null;
};

const STAFF_QUERY = `
  query ($id: Int) {
    Staff(id: $id) {
      id
      name { full native }
      image { large }
      languageV2
      description(asHtml: false)
      homeTown
      characterMedia(sort: START_DATE_DESC, perPage: 50) {
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
  };
};

async function fetchVoiceActor(id: number): Promise<VoiceActorDetail | null> {
  const data = await queryAniList<{
    Staff?: {
      id: number;
      name?: { full?: string | null; native?: string | null };
      image?: { large?: string | null };
      languageV2?: string | null;
      description?: string | null;
      homeTown?: string | null;
      characterMedia?: { edges: StaffEdge[] };
    };
  }>(STAFF_QUERY, { id });

  const s = data.Staff;
  if (!s) return null;

  const seen = new Set<string>();
  const roles: VaRole[] = [];
  for (const edge of s.characterMedia?.edges ?? []) {
    const node = edge.node;
    if (!node || node.type !== "ANIME") continue;
    const character = edge.characters?.[0];
    // One row per (anime, character) pair.
    const key = `${node.id}-${character?.id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    roles.push({
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
        year: node.seasonYear ?? null,
      },
    });
  }

  return {
    id: s.id,
    name: s.name?.full ?? "Unknown",
    native: s.name?.native ?? null,
    image: s.image?.large ?? null,
    language: s.languageV2 ?? null,
    // Keep the raw markdown/HTML — AniListRichText renders it on the client.
    description: (s.description ?? "").trim() || null,
    home: s.homeTown ?? null,
    roles,
  };
}

export const getVoiceActor = unstable_cache(fetchVoiceActor, ["voice-actor-v2"], {
  revalidate: 86400,
});

const SEARCH_QUERY = `
  query ($search: String, $page: Int) {
    Page(page: $page, perPage: 30) {
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

async function fetchVoiceActorSearch(query: string, language: string): Promise<VoiceActorSummary[]> {
  if (!query.trim()) return [];
  const data = await queryAniList<{ Page?: { staff: StaffSearchNode[] } }>(SEARCH_QUERY, {
    search: query.trim(),
    page: 1,
  });

  const lang = language.trim().toLowerCase();
  return (data.Page?.staff ?? [])
    .filter((s) => {
      // Only people who do voice work.
      const occ = (s.primaryOccupations ?? []).map((o) => o.toLowerCase());
      const isVa = occ.length === 0 || occ.some((o) => o.includes("voice") || o.includes("actor"));
      if (!isVa) return false;
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
}

export const searchVoiceActors = unstable_cache(fetchVoiceActorSearch, ["voice-actor-search-v1"], {
  revalidate: 3600,
});
