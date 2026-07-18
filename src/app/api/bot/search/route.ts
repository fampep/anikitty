import { authorizeBot } from "@/lib/bot/authorize-bot";
import { queryAniList, toTitle, toFormat } from "@/lib/oauth/anilist";
import { enrichAnimeListWithAudio } from "@/lib/providers/anikoto-availability";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import {
  KITTY_PROVIDER_META,
  type KittyProviderMeta,
} from "@/lib/kitty/kitty-providers";
import { APP_URL } from "@/lib/seo/site-seo";
import { OFFICIAL_DOMAINS } from "@/constants/site-meta";

export const dynamic = "force-dynamic";

const QUERY = `
  query ($search: String, $isAdult: Boolean) {
    Page(page: 1, perPage: 8) {
      media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: $isAdult) {
        id
        title { english romaji }
        coverImage { large }
        format
        episodes
        status
        averageScore
        seasonYear
        nextAiringEpisode { episode airingAt }
      }
    }
  }
`;

function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? APP_URL).replace(/\/$/, "");
}

function animeLinks(anilistId: string) {
  const primary = `${siteBase()}/anime/${anilistId}`;
  const mirrors = OFFICIAL_DOMAINS.map((d) => `${d.href}/anime/${anilistId}`);
  const unique = [...new Set([primary, ...mirrors])];
  return { primary, mirrors: unique.filter((u) => u !== primary) };
}

function providerSummary(meta: KittyProviderMeta) {
  const modes: string[] = [];
  if (meta.supportsSub !== false) modes.push("SUB");
  if (meta.supportsDub) modes.push("DUB");
  if (meta.hardSub) modes.push("HS");
  return {
    id: meta.id,
    label: meta.label,
    modes,
  };
}

function listProviders() {
  return KITTY_PROVIDER_META.map(providerSummary);
}

function emptySearchResponse(q: string) {
  const providers = listProviders();
  return Response.json({
    query: q,
    count: 0,
    results: [],
    providers,
  });
}

export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().slice(0, 120);
  if (!q) {
    return Response.json({ error: "q required" }, { status: 400 });
  }

  const providers = listProviders();

  let media: any[] = [];
  try {
    const raw = await queryAniList(QUERY, {
      search: q,
      isAdult: false,
    });
    media = raw?.Page?.media ?? [];
  } catch (err) {
    // Upstream (AniList) outages should not break Discord /search — empty results + log.
    console.error("Bot search AniList error:", err);
    return emptySearchResponse(q);
  }

  try {
    const base = media.map((m: any) => ({
      id: String(m.id),
      name: toTitle(m.title),
      jname: m.title?.romaji ?? "",
      poster: m.coverImage?.large ?? "",
      type: toFormat(m.format),
      score: m.averageScore ?? null,
      year: m.seasonYear ?? null,
      status: m.status ?? null,
      episodes: {
        sub: airedCountFromAnilist(m.nextAiringEpisode, {
          status: m.status,
          episodes: m.episodes,
        }),
        dub: 0,
      },
    }));

    let enriched = base;
    try {
      enriched = await enrichAnimeListWithAudio(base);
    } catch (err) {
      console.error("Bot search audio enrich error:", err);
    }

    const results = enriched.map((item) => {
      const links = animeLinks(item.id);
      return {
        id: item.id,
        title: item.name,
        romaji: item.jname || null,
        poster: item.poster || null,
        type: item.type || null,
        year: item.year ?? null,
        score: item.score ?? null,
        status: item.status ?? null,
        episodes: {
          sub: item.episodes.sub ?? 0,
          dub: item.episodes.dub ?? 0,
        },
        url: links.primary,
        urls: [links.primary, ...links.mirrors],
        watchUrl: `${siteBase()}/anime/watch?anime=${item.id}`,
        providers,
      };
    });

    return Response.json({
      query: q,
      count: results.length,
      results,
      providers,
    });
  } catch (err) {
    console.error("Bot search error:", err);
    return emptySearchResponse(q);
  }
}
