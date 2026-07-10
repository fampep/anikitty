import { queryAniList, toTitle } from "@/lib/oauth/anilist";

const TITLES_QUERY = `
  query ($ids: [Int], $perPage: Int) {
    Page(perPage: $perPage) {
      media(idIn: $ids, type: ANIME) {
        id
        title { english romaji }
      }
    }
  }
`;

export function parseAnilistId(animeId: string): number | null {
  if (/^\d+$/.test(animeId)) return parseInt(animeId, 10);
  const match = animeId.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);
  return null;
}

export async function fetchAnimeTitles(ids: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (!ids.length) return map;
  try {
    const data = await queryAniList<{
      Page: { media: { id: number; title: { english?: string; romaji?: string } }[] };
    }>(TITLES_QUERY, { ids, perPage: Math.min(ids.length, 50) });
    for (const m of data.Page?.media ?? []) {
      map.set(m.id, toTitle(m.title));
    }
  } catch {
    // titles are optional enrichment
  }
  return map;
}

export function formatAnimeIdLabel(id: string) {
  if (/^\d+$/.test(id)) return `Anime #${id}`;
  return id
    .replace(/-\d+$/, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
