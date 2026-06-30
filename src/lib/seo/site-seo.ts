import type { Metadata } from "next";

export const APP_NAME = "AniKitty";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.moe";
export const APP_DESCRIPTION = "Free anime streaming. No ads. Sub & dub.";
export const APP_DEFAULT_TITLE = "AniKitty — Free Anime Streaming";

/** Full wordmark for navbar, OG, and UI chrome. */
export const SITE_LOGO = "/anikitty-logo.png";
export const SITE_LOGO_OG = "/og-share.png";
export const SITE_FAVICON = "/favicon.png";
export const SITE_APPLE_ICON = "/icon-192x192.png";

export type PageSeo = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_SEO = {
  landing: {
    title: APP_DEFAULT_TITLE,
    description: APP_DESCRIPTION,
    path: "/",
  },
  home: {
    title: "Home | AniKitty",
    description: "Browse trending anime, continue watching, and new releases.",
    path: "/home",
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
  donate: {
    title: "Support AniKitty | Donate",
    description: "€3/month on Ko-fi for ad-free viewing. Pay with @username in the message, then DM @fampep or tap Activate.",
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
    return `Watch ${animeName} Episode ${epNum} on AniKitty. Free, no ads.`;
  }
  return animeShareDescription(animeName);
}
