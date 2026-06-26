import type { Metadata } from "next";
import { queryAniList } from "@/lib/anilist";
import VideoPlayerSection from "./video-player-section";

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
      description: "Stream anime with no ads ~ nya~",
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

    const desc = epNum
      ? `Watch ${animeName} Episode ${epNum} on AniKitty. Stream for free with no ads.`
      : `Watch ${animeName} on AniKitty. Stream for free with no ads.`;

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
