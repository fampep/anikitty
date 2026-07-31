import type { Metadata } from "next";

export const APP_NAME = "AniKitty";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.moe";
export const APP_DESCRIPTION = "Free anime streaming. Sub & dub. Ad-free.";
export const APP_DEFAULT_TITLE = "AniKitty — Free Anime Streaming";

/** Bump when brand assets change so browsers / Google / PWA / embeds refresh. */
export const SITE_ICON_VERSION = "20260729b";

function brandAsset(path: string): string {
  return `${path}?v=${SITE_ICON_VERSION}`;
}

/** Cat-face brand mark for icons, cast, and compact chrome. */
export const SITE_LOGO = brandAsset("/anikitty-logo.png");
/** 1200×630 NightTokyo share card — prefer over dynamic /opengraph-image (year-cached). */
export const SITE_LOGO_OG = brandAsset("/og-share.png");
export const SITE_FAVICON_ICO = brandAsset("/favicon.ico");
export const SITE_FAVICON = brandAsset("/favicon.png");
export const SITE_APPLE_ICON = brandAsset("/apple-touch-icon.png");
/** Sharper mark for Google Search / embeds (48px multiples; prefer over tiny ico). */
export const SITE_ICON = brandAsset("/icon-192x192.png");
export const SITE_ICON_512 = brandAsset("/icon-512x512.png");

/** Cache-bust a dynamic opengraph-image route path. */
export function ogImageRoute(path: string): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  return `${base}?v=${SITE_ICON_VERSION}`;
}

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
    title: "Help Center | AniKitty",
    description: "Search AniKitty help — watching, accounts, watchlists, privacy, and troubleshooting.",
    path: "/faq",
  },
  history: {
    title: "Watch History | AniKitty",
    description:
      "Your viewing history dashboard — continue watching, stats, heatmap, calendar, and every episode you've played.",
    path: "/history",
  },
  dmca: {
    title: "DMCA & Copyright | AniKitty",
    description:
      "AniKitty copyright help center — policy, what we host, DMCA takedown steps, timelines, FAQ, and designated contact.",
    path: "/dmca",
  },
  status: {
    title: "Status | AniKitty",
    description: "Live health of AniKitty streaming proxies — latency, bandwidth, and uptime.",
    path: "/status",
  },
  donate: {
    title: "Support AniKitty | Donate",
    description: "Optional Ko-fi tips support AniKitty and unlock the donator rank.",
    path: "/donate",
  },
} as const satisfies Record<string, PageSeo>;

export function buildPageMetadata(
  page: PageSeo,
  opts?: { ogImagePath?: string },
): Metadata {
  const url = `${APP_URL}${page.path}`;
  const ogImage = opts?.ogImagePath ?? SITE_LOGO_OG;
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
    other: {
      monetag: "f3374b2b42202f0a62f67720001d46e8",
    },
  };
}

export function animeShareDescription(title: string): string {
  return `Watch ${title} free on AniKitty. Sub & dub where available.`;
}

export function watchEpisodeDescription(animeName: string, epNum?: string | null): string {
  if (epNum) {
    return `Watch ${animeName} Episode ${epNum} on AniKitty. Free ad-free streaming.`;
  }
  return animeShareDescription(animeName);
}
