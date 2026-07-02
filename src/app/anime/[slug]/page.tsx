import type { Metadata } from "next";
import { queryAniList } from "@/lib/oauth/anilist";
import { isBlockedAnime } from "@/lib/anime/content-policy";
import { animeShareDescription } from "@/lib/seo/site-seo";
import AnimeDetail from "@/components/anime/anime-detail";

const META_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      isAdult
      format
      genres
      title { english romaji }
      description(asHtml: false)
      coverImage { extraLarge color }
      bannerImage
      averageScore
      episodes
      status
    }
  }
`;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const numId = parseInt(slug, 10);
  if (isNaN(numId)) return { title: "Anime | AniKitty" };

  try {
    const data = await queryAniList(META_QUERY, { id: numId });
    const m = data?.Media;
    if (!m || isBlockedAnime(m)) return { title: "Not Found | AniKitty" };

    const title  = m.title.english || m.title.romaji || "Anime";
    const desc   = animeShareDescription(title);

    // Banner (wide) preferred for embeds, poster as fallback
    const image  = m.bannerImage || m.coverImage?.extraLarge;
    const pageTitle = `${title} | AniKitty`;

    return {
      title: pageTitle,
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
            alt: title,
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
    return { title: "Anime | AniKitty" };
  }
}

export default async function Page(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return <AnimeDetail slug={slug} />;
}
