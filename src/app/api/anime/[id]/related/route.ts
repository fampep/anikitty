import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

const RELATED_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      recommendations(page: 1, perPage: 12) {
        nodes {
          mediaRecommendation {
            id title { english romaji } coverImage { extraLarge } episodes format
          }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id title { english romaji } coverImage { extraLarge } type episodes format
          }
        }
      }
      characters(sort: ROLE, page: 1, perPage: 12) {
        edges {
          role
          node { id name { full } image { large } }
          voiceActors(language: JAPANESE) { id name { full } image { large } }
        }
      }
    }
  }
`;

function mapAnime(node: any) {
  if (!node?.id) return null;
  return {
    id: String(node.id),
    name: toTitle(node.title ?? {}),
    jname: node.title?.romaji ?? "",
    poster: node.coverImage?.extraLarge ?? "",
    episodes: { sub: node.episodes ?? 0, dub: 0 },
    type: toFormat(node.format),
    duration: "",
    rating: null,
  };
}

async function fetchRelatedPayload(numId: number) {
  const raw = await queryAniList<{ Media?: any }>(RELATED_QUERY, { id: numId });
  const m = raw.Media;
  if (!m) return null;

  const charactersVoiceActors = (m.characters?.edges ?? []).map((edge: any) => ({
    character: {
      id: String(edge.node?.id ?? ""),
      poster: edge.node?.image?.large ?? "",
      name: edge.node?.name?.full ?? "Unknown",
      cast: edge.role === "MAIN" ? "Main" : "Supporting",
    },
    voiceActor: {
      id: String(edge.voiceActors?.[0]?.id ?? ""),
      poster: edge.voiceActors?.[0]?.image?.large ?? "",
      name: edge.voiceActors?.[0]?.name?.full ?? "",
      cast: "Japanese",
    },
  }));

  const relatedAnimes = (m.relations?.edges ?? [])
    .filter((e: any) => e?.node?.type === "ANIME")
    .map((e: any) => mapAnime(e.node))
    .filter(Boolean);

  const mostPopularAnimes = relatedAnimes.slice(0, 5);

  const recommendedAnimes = (m.recommendations?.nodes ?? [])
    .filter((n: any) => n?.mediaRecommendation)
    .map((n: any) => mapAnime(n.mediaRecommendation))
    .filter(Boolean);

  let enrichedRelated = relatedAnimes;
  let enrichedPopular = mostPopularAnimes;
  let enrichedRecommended = recommendedAnimes;

  try {
    const combined = [...mostPopularAnimes, ...relatedAnimes, ...recommendedAnimes];
    const uniqueById = new Map(combined.map((a) => [a.id, a]));
    const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
    const byId = new Map(enriched.map((a) => [a.id, a]));
    const pick = <T extends { id: string }>(list: T[]) =>
      list.map((a) => byId.get(a.id) ?? a);
    enrichedPopular = pick(mostPopularAnimes);
    enrichedRelated = pick(relatedAnimes);
    enrichedRecommended = pick(recommendedAnimes);
  } catch (enrichErr) {
    console.error("Related audio enrich failed:", enrichErr);
  }

  return {
    charactersVoiceActors,
    mostPopularAnimes: enrichedPopular,
    relatedAnimes: enrichedRelated,
    recommendedAnimes: enrichedRecommended,
  };
}

const getCachedRelated = unstable_cache(
  fetchRelatedPayload,
  ["anime-details-related-v1"],
  { revalidate: 3600 },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  try {
    const data = await getCachedRelated(numId);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("AniList related error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to fetch related anime data") },
      { status: 500 },
    );
  }
}
