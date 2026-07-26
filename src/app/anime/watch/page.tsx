import type { Metadata } from "next";
import { queryAniList } from "@/lib/oauth/anilist";
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
    const data = await queryAniList(META_QUERY, { id: numId });
    const m = data?.Media;
    if (!m) return { title: "Watch | AniKitty" };

    const animeName = m.title.english || m.title.romaji || "Anime";
    const title = epNum
      ? `${animeName} — Episode ${epNum} | AniKitty`
      : `${animeName} | AniKitty`;

    const desc = watchEpisodeDescription(animeName, epNum);

    const image = m.bannerImage || m.coverImage?.extraLarge;

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
            width: m.bannerImage ? 1920 : 460,
            height: m.bannerImage ? 1080 : 650,
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
