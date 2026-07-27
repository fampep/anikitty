import type { Metadata } from "next";
import AnimeThemesPageClient from "@/components/anime/anime-themes-page-client";
import { getAnimeSeoData } from "@/lib/seo/anime-seo-data";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const numId = parseInt(slug, 10);
  if (Number.isNaN(numId)) return { title: "Themes | AniKitty" };

  try {
    const m = await getAnimeSeoData(numId);
    const title = m?.title.english || m?.title.romaji || "Anime";
    return {
      title: `${title} Themes | AniKitty`,
      description: `Listen to all opening and ending themes for ${title} via AnimeThemes.`,
    };
  } catch {
    return { title: "Themes | AniKitty" };
  }
}

export default async function AnimeThemesPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  return <AnimeThemesPageClient slug={slug} />;
}
