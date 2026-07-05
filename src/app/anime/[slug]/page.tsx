import type { Metadata } from "next";
import { animeShareDescription } from "@/lib/seo/site-seo";
import { getAnimeSeoData, buildAnimeJsonLd } from "@/lib/seo/anime-seo-data";
import AnimeDetail from "@/components/anime/anime-detail";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const numId = parseInt(slug, 10);
  if (isNaN(numId)) return { title: "Anime | AniKitty" };

  try {
    const m = await getAnimeSeoData(numId);
    if (!m) return { title: "Anime | AniKitty" };

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
  const numId = parseInt(slug, 10);
  const seo = Number.isNaN(numId) ? null : await getAnimeSeoData(numId);

  return (
    <>
      {seo && (
        <script
          type="application/ld+json"
          // Structured data for search engines (TVSeries / Movie rich results).
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildAnimeJsonLd(numId, seo)) }}
        />
      )}
      <AnimeDetail slug={slug} />
    </>
  );
}
