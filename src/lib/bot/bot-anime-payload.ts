import { APP_URL } from "@/lib/seo/site-seo";
import { OFFICIAL_DOMAINS } from "@/constants/site-meta";
import {
  KITTY_PROVIDER_META,
  type KittyProviderMeta,
} from "@/lib/kitty/kitty-providers";
import { toTitle, toFormat } from "@/lib/oauth/anilist";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";

export function siteBase(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? APP_URL).replace(/\/$/, "");
}

export function animeLinks(anilistId: string) {
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

export function listProviders() {
  return KITTY_PROVIDER_META.map(providerSummary);
}

type AnilistMedia = {
  id: number;
  title?: { english?: string | null; romaji?: string | null };
  coverImage?: { large?: string | null; extraLarge?: string | null };
  format?: string | null;
  episodes?: number | null;
  status?: string | null;
  averageScore?: number | null;
  seasonYear?: number | null;
  nextAiringEpisode?: { episode: number; airingAt?: number | null } | null;
};

export function toBotAnimeResult(
  m: AnilistMedia,
  opts?: { subEpisodes?: number; dubEpisodes?: number; includeProviders?: boolean },
) {
  const id = String(m.id);
  const links = animeLinks(id);
  const title = toTitle(m.title ?? {});
  const romaji = m.title?.romaji ?? null;
  const sub =
    opts?.subEpisodes ??
    airedCountFromAnilist(m.nextAiringEpisode, {
      status: m.status,
      episodes: m.episodes,
    });

  return {
    id,
    title,
    romaji: romaji && romaji !== title ? romaji : romaji || null,
    poster: m.coverImage?.extraLarge ?? m.coverImage?.large ?? null,
    type: toFormat(m.format) || null,
    year: m.seasonYear ?? null,
    score: m.averageScore ?? null,
    status: m.status ?? null,
    episodes: {
      sub: sub ?? 0,
      dub: opts?.dubEpisodes ?? 0,
    },
    url: links.primary,
    urls: [links.primary, ...links.mirrors],
    watchUrl: `${siteBase()}/anime/watch?anime=${id}`,
    ...(opts?.includeProviders !== false ? { providers: listProviders() } : {}),
  };
}
