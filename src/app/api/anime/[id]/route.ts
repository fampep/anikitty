import { queryAniList, toTitle, toFormat, toStatus, formatPartialDate } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio, getAudioAvailability } from "@/lib/providers/anikoto-availability";

export const revalidate = 3600;

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
      nextAiringEpisode { episode airingAt }
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

const MINIMAL_DETAIL_QUERY = `
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
      nextAiringEpisode { episode airingAt }
      studios { nodes { name isAnimationStudio } }
      trailer { id site }
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  if (isNaN(numId)) {
    return Response.json({ error: "Invalid anime id" }, { status: 400 });
  }

  const cacheHeaders = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  };

  try {
    let raw: { Media?: any };
    try {
      raw = await queryAniList(DETAIL_QUERY, { id: numId });
    } catch (primaryErr) {
      console.error("Anime detail primary query failed:", primaryErr);
      raw = await queryAniList(MINIMAL_DETAIL_QUERY, { id: numId });
    }
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

    const SOURCE_LABELS: Record<string, string> = {
      ORIGINAL: "Original",
      MANGA: "Manga",
      LIGHT_NOVEL: "Light Novel",
      VISUAL_NOVEL: "Visual Novel",
      VIDEO_GAME: "Video Game",
      NOVEL: "Novel",
      DOUJINSHI: "Doujinshi",
      ANIME: "Anime",
      WEB_NOVEL: "Web Novel",
      LIVE_ACTION: "Live Action",
      GAME: "Game",
      COMIC: "Comic",
      MULTIMEDIA_PROJECT: "Multimedia Project",
      PICTURE_BOOK: "Picture Book",
      OTHER: "Other",
    };

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
          nextAiringEpisode:
            m.nextAiringEpisode?.airingAt && m.nextAiringEpisode?.episode
              ? {
                  episode: m.nextAiringEpisode.episode,
                  airingAt: m.nextAiringEpisode.airingAt,
                }
              : null,
          promotionalVideos: m.trailer?.site === "youtube" && m.trailer.id
            ? [{
                title: "Trailer",
                source: `https://www.youtube.com/embed/${m.trailer.id}`,
                thumbnail: "",
              }]
            : [],
          charactersVoiceActors: (m.characters?.edges ?? []).map((edge: any) => ({
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
          source: m.source ? (SOURCE_LABELS[m.source] ?? m.source) : null,
          genres: m.genres ?? [],
          studios: animationStudios.join(", "),
          producers,
        },
      },
      seasons: [],
      mostPopularAnimes: (m.relations?.edges ?? [])
        .filter((e: any) => e?.node?.type === "ANIME")
        .slice(0, 5)
        .map((e: any) => mapAnime(e.node))
        .filter(Boolean),
      relatedAnimes: (m.relations?.edges ?? [])
        .filter((e: any) => e?.node?.type === "ANIME")
        .map((e: any) => mapAnime(e.node))
        .filter(Boolean),
      recommendedAnimes: (m.recommendations?.nodes ?? [])
        .filter((n: any) => n?.mediaRecommendation)
        .map((n: any) => mapAnime(n.mediaRecommendation))
        .filter(Boolean),
    };

    let mostPopularAnimes = data.mostPopularAnimes;
    let relatedAnimes = data.relatedAnimes;
    let recommendedAnimes = data.recommendedAnimes;

    try {
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
      [mostPopularAnimes, relatedAnimes, recommendedAnimes] = [
        pick(data.mostPopularAnimes),
        pick(data.relatedAnimes),
        pick(data.recommendedAnimes),
      ];
    } catch (enrichErr) {
      console.error("Audio enrich failed:", enrichErr);
    }

    return Response.json({
      data: {
        ...data,
        mostPopularAnimes,
        relatedAnimes,
        recommendedAnimes,
      },
    }, { headers: cacheHeaders });
  } catch (err) {
    console.error("AniList details error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch anime details";
    return Response.json({ error: message }, { status: 500 });
  }
}
