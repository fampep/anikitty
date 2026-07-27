"use client";

import Link from "next/link";
import { useGetAnimeDetails } from "@/query/anime/get-anime-details";
import AnimeThemesBrowser from "@/components/anime/anime-themes-browser";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

export default function AnimeThemesPageClient({ slug }: { slug: string }) {
  const t = useT();
  const { data, isLoading, isError } = useGetAnimeDetails(slug);
  const info = data?.anime?.info;
  const anilistId = info?.anilistId;

  if (isLoading) {
    return (
      <Container className="pt-10">
        <div className="h-8 w-48 rounded-lg bg-muted/40 animate-pulse mb-6" />
        <div className="aspect-video rounded-2xl bg-muted/40 animate-pulse" />
      </Container>
    );
  }

  if (isError || !info || !anilistId) {
    return (
      <Container className="pt-10 space-y-3">
        <p className="text-sm text-muted-foreground">{t("anime.themesUnavailable")}</p>
        <Link href={`${ROUTES.ANIME_DETAILS}/${slug}`} className="text-sm text-primary hover:underline">
          {t("anime.themesBackToAnime")}
        </Link>
      </Container>
    );
  }

  return (
    <AnimeThemesBrowser
      slug={slug}
      anilistId={anilistId}
      animeTitle={info.name}
    />
  );
}
