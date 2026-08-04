import type { Metadata } from "next";
import { queryAniList } from "@/lib/oauth/anilist";
import { getBatchStoredAnimeMeta } from "@/lib/anime/anime-metadata-store";
import { watchEpisodeDescription } from "@/lib/seo/site-seo";
import VideoPlayerSection from "@/components/watch/video-player-section";

const META_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      title { english romaji }
      description(asHtml: false)
      coverImage { extraLarge }
      bannerImage
    }
  }
`;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ anime?: string; episode?: string }>;
}): Promise<Metadata> {
  const { anime: animeId, episode } = await searchParams;
  const numId = parseInt(animeId ?? "", 10);

  // Parse episode number from "ep-2" → 2
  const epNum = episode?.startsWith("ep-")
    ? episode.replace("ep-", "")
    : episode ?? null;

  if (isNaN(numId)) {
    return {
      title: "Watch | AniKitty",
      description: "Watch anime free on AniKitty. Ad-free streaming.",
    };
  }

  try {
    let animeName = "Anime";
    let image: string | undefined;
    let isBanner = false;

    const cached = (await getBatchStoredAnimeMeta([numId])).get(numId);
    if (cached?.title || cached?.coverImage || cached?.bannerImage) {
      animeName = cached.titleEnglish || cached.titleRomaji || cached.title || "Anime";
      if (cached.bannerImage) {
        image = cached.bannerImage;
        isBanner = true;
      } else {
        image = cached.coverImage || undefined;
      }
    } else {
      const data = await queryAniList(META_QUERY, { id: numId });
      const m = data?.Media;
      if (!m) return { title: "Watch | AniKitty" };
      animeName = m.title.english || m.title.romaji || "Anime";
      if (m.bannerImage) {
        image = m.bannerImage;
        isBanner = true;
      } else {
        image = m.coverImage?.extraLarge || undefined;
      }
    }

    const title = epNum
      ? `${animeName} — Episode ${epNum} | AniKitty`
      : `${animeName} | AniKitty`;

    const desc = watchEpisodeDescription(animeName, epNum);

    return {
      title,
      description: desc,
      openGraph: {
        type: "website",
        siteName: "AniKitty",
        title,
        description: desc,
        ...(image && {
          images: [{
            url: image,
            width: isBanner ? 1920 : 460,
            height: isBanner ? 1080 : 650,
            alt: animeName,
          }],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description: desc,
        ...(image && { images: [image] }),
      },
    };
  } catch {
    return { title: "Watch | AniKitty" };
  }
}

export default function Page() {
  return <VideoPlayerSection />;
}
