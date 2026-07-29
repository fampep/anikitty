import { unstable_cache } from "next/cache";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

const RELATED_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      recommendations(page: 1, perPage: 16) {
        nodes {
          rating
          mediaRecommendation {
            id
            title { english romaji }
            coverImage { extraLarge }
            episodes
            format
            genres
            averageScore
            studios { nodes { name isAnimationStudio } }
          }
        }
      }
      relations {
        edges {
          relationType(version: 2)
          node {
            id
            title { english romaji native }
            coverImage { extraLarge }
            type
            episodes
            format
            status
            season
            seasonYear
            startDate { year month day }
          }
        }
      }
      characters(sort: ROLE, page: 1, perPage: 25) {
        edges {
          role
          node {
            id
            name { full native }
            image { large }
            favourites
          }
          voiceActors {
            id
            name { full native }
            image { large }
            languageV2
          }
        }
      }
      staff(sort: RELEVANCE, page: 1, perPage: 30) {
        edges {
          role
          node {
            id
            name { full native }
            image { large }
            primaryOccupations
          }
        }
      }
    }
  }
`;

type MappedAnime = {
  id: string;
  name: string;
  jname: string;
  poster: string;
  episodes: { sub: number; dub: number };
  type: string;
  duration: string;
  rating: string | null;
  relationType?: string;
  status?: string | null;
  season?: string | null;
  seasonYear?: number | null;
  startDateKey?: number;
  isCurrent?: boolean;
  recommendationRating?: number;
  genres?: string[];
  studios?: string[];
};

function mapAnime(node: any, extra?: Partial<MappedAnime>): MappedAnime | null {
  if (!node?.id) return null;
  return {
    id: String(node.id),
    name: toTitle(node.title ?? {}),
    jname: node.title?.romaji ?? "",
    poster: node.coverImage?.extraLarge ?? "",
    episodes: { sub: node.episodes ?? 0, dub: 0 },
    type: toFormat(node.format),
    duration: "",
    rating: node.averageScore != null ? String((node.averageScore / 10).toFixed(1)) : null,
    ...extra,
  };
}

function startDateSortKey(node: any): number {
  const y = node?.startDate?.year ?? 0;
  const m = node?.startDate?.month ?? 0;
  const d = node?.startDate?.day ?? 0;
  return y * 10_000 + m * 100 + d;
}

async function fetchRelatedPayload(numId: number) {
  const raw = await queryAniList<{ Media?: any }>(RELATED_QUERY, { id: numId });
  const m = raw.Media;
  if (!m) return null;

  const charactersVoiceActors = (m.characters?.edges ?? []).flatMap((edge: any) => {
    const character = {
      id: String(edge.node?.id ?? ""),
      poster: edge.node?.image?.large ?? "",
      name: edge.node?.name?.full ?? "Unknown",
      native: edge.node?.name?.native ?? null,
      cast: edge.role === "MAIN" ? "Main" : edge.role === "SUPPORTING" ? "Supporting" : "Background",
      favourites: typeof edge.node?.favourites === "number" ? edge.node.favourites : null,
    };
    const vas = edge.voiceActors?.length
      ? edge.voiceActors
      : [{ id: "", name: { full: "" }, image: { large: "" }, languageV2: "Japanese" }];

    return vas.map((va: any) => ({
      character,
      voiceActor: {
        id: String(va?.id ?? ""),
        poster: va?.image?.large ?? "",
        name: va?.name?.full ?? "",
        native: va?.name?.native ?? null,
        cast: va?.languageV2 ?? "Japanese",
        language: va?.languageV2 ?? "Japanese",
      },
    }));
  });

  const relationEdges = (m.relations?.edges ?? []).filter(
    (e: any) => e?.node?.type === "ANIME" && e?.node?.id,
  );

  const relatedAnimes = relationEdges
    .map((e: any) =>
      mapAnime(e.node, {
        relationType: String(e.relationType ?? "OTHER"),
        status: e.node.status ?? null,
        season: e.node.season ?? null,
        seasonYear: e.node.seasonYear ?? null,
        startDateKey: startDateSortKey(e.node),
        isCurrent: false,
      }),
    )
    .filter((a: MappedAnime | null): a is MappedAnime => a != null);

  // Chronological franchise chain from prequel/sequel links + current title.
  const chainTypes = new Set(["PREQUEL", "SEQUEL", "PARENT", "SIDE_STORY", "ALTERNATIVE"]);
  const franchiseNodes = new Map<string, any>();
  for (const e of relationEdges) {
    if (!chainTypes.has(String(e.relationType))) continue;
    franchiseNodes.set(String(e.node.id), e.node);
  }
  let seasons: MappedAnime[] = [...franchiseNodes.values()]
    .map((node) =>
      mapAnime(node, {
        relationType: String(
          relationEdges.find((e: any) => String(e.node.id) === String(node.id))?.relationType ??
            "OTHER",
        ),
        season: node.season ?? null,
        seasonYear: node.seasonYear ?? null,
        startDateKey: startDateSortKey(node),
        isCurrent: String(node.id) === String(numId),
      }),
    )
    .filter((a: MappedAnime | null): a is MappedAnime => a != null)
    .sort(
      (a, b) =>
        Number(a.startDateKey ?? 0) - Number(b.startDateKey ?? 0) ||
        String(a.seasonYear ?? 0).localeCompare(String(b.seasonYear ?? 0)),
    );

  // Ensure current anime appears in the franchise strip even with no prequel/sequel peers.
  if (!seasons.some((s) => s.isCurrent)) {
    seasons = [
      ...seasons,
      {
        id: String(numId),
        name: "",
        jname: "",
        poster: "",
        episodes: { sub: 0, dub: 0 },
        type: "",
        duration: "",
        rating: null,
        relationType: "CURRENT",
        isCurrent: true,
        startDateKey: Number.MAX_SAFE_INTEGER / 4,
      },
    ].sort(
      (a, b) =>
        Number(a.startDateKey ?? 0) - Number(b.startDateKey ?? 0) ||
        String(a.seasonYear ?? 0).localeCompare(String(b.seasonYear ?? 0)),
    );
  }

  const mostPopularAnimes = relatedAnimes.slice(0, 5);

  const recommendedAnimes = (m.recommendations?.nodes ?? [])
    .filter((n: any) => n?.mediaRecommendation)
    .map((n: any) => {
      const rec = n.mediaRecommendation;
      const studios = (rec.studios?.nodes ?? [])
        .filter((s: any) => s.isAnimationStudio)
        .map((s: any) => s.name as string);
      return mapAnime(rec, {
        recommendationRating: typeof n.rating === "number" ? n.rating : 0,
        genres: Array.isArray(rec.genres) ? rec.genres : [],
        studios,
      });
    })
    .filter((a: MappedAnime | null): a is MappedAnime => a != null)
    .sort(
      (a: MappedAnime, b: MappedAnime) =>
        Number(b.recommendationRating ?? 0) - Number(a.recommendationRating ?? 0),
    );

  const staff = (m.staff?.edges ?? [])
    .filter((e: any) => e?.node?.id)
    .map((e: any) => ({
      id: String(e.node.id),
      name: e.node.name?.full ?? "Unknown",
      native: e.node.name?.native ?? null,
      poster: e.node.image?.large ?? "",
      role: String(e.role ?? ""),
      occupations: Array.isArray(e.node.primaryOccupations)
        ? e.node.primaryOccupations.filter(Boolean)
        : [],
    }));

  let enrichedRelated = relatedAnimes;
  let enrichedPopular = mostPopularAnimes;
  let enrichedRecommended = recommendedAnimes;
  let enrichedSeasons = seasons;

  try {
    const combined = [
      ...mostPopularAnimes,
      ...relatedAnimes,
      ...recommendedAnimes,
      ...seasons.filter((s) => s.id && s.poster),
    ];
    const uniqueById = new Map(combined.map((a) => [a.id, a]));
    const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
    const byId = new Map(enriched.map((a) => [a.id, a]));
    const pick = <T extends { id: string }>(list: T[]) =>
      list.map((a) => ({ ...a, ...(byId.get(a.id) ?? {}) }));
    enrichedPopular = pick(mostPopularAnimes);
    enrichedRelated = pick(relatedAnimes);
    enrichedRecommended = pick(recommendedAnimes);
    enrichedSeasons = pick(seasons);
  } catch (enrichErr) {
    console.error("Related audio enrich failed:", enrichErr);
  }

  return {
    charactersVoiceActors,
    mostPopularAnimes: enrichedPopular,
    relatedAnimes: enrichedRelated,
    recommendedAnimes: enrichedRecommended,
    seasons: enrichedSeasons,
    staff,
  };
}

const getCachedRelated = unstable_cache(
  fetchRelatedPayload,
  ["anime-details-related-v2"],
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
