import type { Metadata } from "next";

export const APP_NAME = "AniKitty";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.moe";
export const APP_DESCRIPTION = "Free anime streaming. Sub & dub. Player stays ad-free.";
export const APP_DEFAULT_TITLE = "AniKitty — Free Anime Streaming";

/** Bump when brand assets change so browsers / PWA / OG refresh the icon. */
export const SITE_ICON_VERSION = "20260721b";

function brandAsset(path: string): string {
  return `${path}?v=${SITE_ICON_VERSION}`;
}

/** Full wordmark / brand mark for navbar, cast, and UI chrome. */
export const SITE_LOGO = brandAsset("/anikitty-logo.png");
export const SITE_LOGO_OG = brandAsset("/og-share.png");
export const SITE_FAVICON = brandAsset("/favicon.png");
export const SITE_APPLE_ICON = brandAsset("/apple-touch-icon.png");
/** Sharper mark for OG cards / embeds (prefer over tiny favicon). */
export const SITE_ICON = brandAsset("/icon-192x192.png");

export type PageSeo = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_SEO = {
  landing: {
    title: APP_DEFAULT_TITLE,
    description: "Free anime streaming with sub & dub, community features, and a built-in player. No subscriptions.",
    path: "/",
  },
  home: {
    title: "Home | AniKitty",
    description: "Featured anime, continue watching, and quick links to browse the catalog.",
    path: "/home",
  },
  new: {
    title: "New Releases | AniKitty",
    description: "Latest episode releases and recently added anime.",
    path: "/new",
  },
  community: {
    title: "Community | AniKitty",
    description: "Latest comments from the AniKitty community.",
    path: "/community",
  },
  subtitles: {
    title: "Subtitle Library | AniKitty",
    description: "Browse cached anime subtitles. Download tracks and see library stats.",
    path: "/subtitles",
  },
  forum: {
    title: "Forum | AniKitty",
    description: "Discuss anime, share recommendations, and join the community.",
    path: "/forum",
  },
  chat: {
    title: "Live Chat | AniKitty",
    description: "Real-time chat with other AniKitty users while you browse.",
    path: "/chat",
  },
  messages: {
    title: "Messages | AniKitty",
    description: "Private messages between AniKitty users.",
    path: "/messages",
  },
  schedule: {
    title: "Schedule | AniKitty",
    description: "See what anime is airing today.",
    path: "/schedule",
  },
  trending: {
    title: "Trending | AniKitty",
    description: "Popular and upcoming anime on AniKitty.",
    path: "/trending",
  },
  search: {
    title: "Search | AniKitty",
    description: "Search the AniKitty anime catalog.",
    path: "/search",
  },
  watchTogether: {
    title: "Watch Together | AniKitty",
    description: "Watch anime in sync with friends using a room code.",
    path: "/watch-together",
  },
  faq: {
    title: "FAQ | AniKitty",
    description: "How AniKitty works — streaming, accounts, and privacy.",
    path: "/faq",
  },
  history: {
    title: "My List | AniKitty",
    description: "Your anime list — watching, completed, plan to watch, on hold, and dropped — plus recent episode history.",
    path: "/history",
  },
  dmca: {
    title: "DMCA & Copyright | AniKitty",
    description: "How to file a DMCA / copyright takedown request for content on AniKitty.",
    path: "/dmca",
  },
  status: {
    title: "Status | AniKitty",
    description: "Live health of AniKitty streaming proxies — latency, bandwidth, and uptime.",
    path: "/status",
  },
  donate: {
    title: "Support AniKitty | Donate",
    description: "We're sorry about the ads — they help afford running costs. Optional Ko-fi tips support the site and grant the donator badge.",
    path: "/donate",
  },
} as const satisfies Record<string, PageSeo>;

export function buildPageMetadata(
  page: PageSeo,
  opts?: { ogImagePath?: string },
): Metadata {
  const url = `${APP_URL}${page.path}`;
  const ogImage = opts?.ogImagePath ?? "/opengraph-image";
  const shareTitle = page.title.replace(/ \| AniKitty$/, "");

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      url,
      title: shareTitle,
      description: page.description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${shareTitle} — ${APP_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: page.description,
      images: [ogImage],
    },
  };
}

export function animeShareDescription(title: string): string {
  return `Watch ${title} free on AniKitty. Sub & dub where available.`;
}

export function watchEpisodeDescription(animeName: string, epNum?: string | null): string {
  if (epNum) {
    return `Watch ${animeName} Episode ${epNum} on AniKitty. Free streaming — player stays ad-free.`;
  }
  return animeShareDescription(animeName);
}
