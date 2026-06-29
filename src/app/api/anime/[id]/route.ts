import { queryAniList, toTitle, toFormat, toStatus, formatPartialDate } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio, getAudioAvailability } from "@/lib/providers/anikoto-availability";

const DETAIL_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { english romaji native }
      description(asHtml: false)
      coverImage { extraLarge large }
      bannerImage
      episodes
      format
      status
      duration
      averageScore
      genres
      synonyms
      season
      seasonYear
      source
      startDate { year month day }
      endDate { year month day }
      nextAiringEpisode { episode }
      studios { nodes { name isAnimationStudio } }
      trailer { id site }
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
  return {
    id: String(node.id),
    name: toTitle(node.title),
    jname: node.title?.romaji ?? "",
    poster: node.coverImage?.extraLarge ?? "",
    episodes: { sub: node.episodes ?? 0, dub: 0 },
    type: toFormat(node.format),
    duration: "",
    rating: null,
  };
}

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
    const raw = await queryAniList(DETAIL_QUERY, { id: numId });
    const m = raw.Media;
    if (!m) return Response.json({ error: "Not found" }, { status: 404 });

    const episodeCount = m.nextAiringEpisode
      ? m.nextAiringEpisode.episode - 1
      : (m.episodes ?? 0);

    const audio = await getAudioAvailability({
      anilistId: numId,
      malId: m.idMal,
      titles: [toTitle(m.title), m.title?.romaji, m.title?.english],
      fallbackSub: episodeCount,
      status: m.status,
    }).catch(() => ({
      sub: episodeCount,
      dub: 0,
      hasSub: episodeCount > 0,
      hasDub: false,
    }));

    const animationStudios = (m.studios?.nodes ?? [])
      .filter((s: any) => s.isAnimationStudio)
      .map((s: any) => s.name);

    const producers = (m.studios?.nodes ?? [])
      .filter((s: any) => !s.isAnimationStudio)
      .map((s: any) => s.name);

    const data = {
      anime: {
        info: {
          id: String(m.id),
          anilistId: m.id,
          malId: m.idMal ?? 0,
          name: toTitle(m.title),
          poster: m.coverImage?.extraLarge ?? "",
          banner: m.bannerImage ?? m.coverImage?.extraLarge ?? "",
          description: (m.description ?? "").replace(/<[^>]*>/g, ""),
          stats: {
            rating: m.averageScore ? `${(m.averageScore / 10).toFixed(1)}/10` : "N/A",
            quality: "HD",
            episodes: { sub: audio.sub || episodeCount, dub: audio.dub },
            type: toFormat(m.format),
            duration: m.duration ? `${m.duration} min` : "N/A",
          },
          promotionalVideos: m.trailer?.site === "youtube"
            ? [{ title: "Trailer", source: `https://youtube.com/watch?v=${m.trailer.id}`, thumbnail: "" }]
            : [],
          charactersVoiceActors: (m.characters?.edges ?? []).map((edge: any) => ({
            character: {
              id: String(edge.node.id),
              poster: edge.node.image?.large ?? "",
              name: edge.node.name.full,
              cast: edge.role === "MAIN" ? "Main" : "Supporting",
            },
            voiceActor: {
              id: String(edge.voiceActors?.[0]?.id ?? ""),
              poster: edge.voiceActors?.[0]?.image?.large ?? "",
              name: edge.voiceActors?.[0]?.name?.full ?? "",
              cast: "Japanese",
            },
          })),
        },
        moreInfo: {
          japanese: m.title?.native ?? "",
          synonyms: (m.synonyms ?? []).join(", "),
          aired: `${formatPartialDate(m.startDate)} to ${formatPartialDate(m.endDate)}`,
          premiered: `${m.season ?? ""} ${m.seasonYear ?? ""}`.trim() || "N/A",
          duration: m.duration ? `${m.duration} min` : "N/A",
          status: toStatus(m.status),
          malscore: "N/A",
          genres: m.genres ?? [],
          studios: animationStudios.join(", "),
          producers,
        },
      },
      seasons: [],
      mostPopularAnimes: (m.relations?.edges ?? [])
        .filter((e: any) => e.node.type === "ANIME")
        .slice(0, 5)
        .map((e: any) => mapAnime(e.node)),
      relatedAnimes: (m.relations?.edges ?? [])
        .filter((e: any) => e.node.type === "ANIME")
        .map((e: any) => mapAnime(e.node)),
      recommendedAnimes: (m.recommendations?.nodes ?? [])
        .filter((n: any) => n.mediaRecommendation)
        .map((n: any) => mapAnime(n.mediaRecommendation)),
    };

    const [mostPopularAnimes, relatedAnimes, recommendedAnimes] = await (async () => {
      const combined = [
        ...data.mostPopularAnimes,
        ...data.relatedAnimes,
        ...data.recommendedAnimes,
      ];
      const uniqueById = new Map(combined.map((a) => [a.id, a]));
      const enriched = await enrichAnimeListWithAudio([...uniqueById.values()]);
      const byId = new Map(enriched.map((a) => [a.id, a]));
      const pick = (list: typeof data.mostPopularAnimes) =>
        list.map((a: (typeof list)[number]) => byId.get(a.id) ?? a);
      return [
        pick(data.mostPopularAnimes),
        pick(data.relatedAnimes),
        pick(data.recommendedAnimes),
      ];
    })();

    return Response.json({
      data: {
        ...data,
        mostPopularAnimes,
        relatedAnimes,
        recommendedAnimes,
      },
    });
  } catch (err) {
    console.error("AniList details error:", err);
    return Response.json({ error: "Failed to fetch anime details" }, { status: 500 });
  }
}
