"use client";

import { useMemo } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import {
  collectionToSearchParams,
  getCollection,
} from "@/lib/discovery/collections";
import { useGetSearchAnimeResults } from "@/query/search/get-search-results";
import { useT } from "@/providers/i18n-provider";
import {
  AnimeGrid,
  DiscoveryHero,
  DiscoverySection,
  MetaChip,
  TextLink,
} from "@/components/discovery/discovery-shared";
import type { SearchAnimeParams } from "@/types/anime";

export default function CollectionDetailClient({ slug }: { slug: string }) {
  const t = useT();
  const collection = getCollection(slug);

  const searchParams: SearchAnimeParams = useMemo(() => {
    if (!collection) return { q: "", page: 1 };
    return {
      q: "",
      page: 1,
      ...collection.filters,
      sort:
        collection.filters.sort === "popularity"
          ? "most-watched"
          : collection.filters.sort,
    };
  }, [collection]);

  const { data, isLoading } = useGetSearchAnimeResults(searchParams);

  if (!collection) {
    return (
      <Container className="pt-16 pb-24 text-center">
        <p className="text-muted-foreground">{t("discovery.collections.notFound")}</p>
        <Link href={ROUTES.COLLECTIONS} className="text-sm text-primary mt-4 inline-block">
          {t("discovery.collections.all")}
        </Link>
      </Container>
    );
  }

  const filterChips = Object.entries(collection.filters).filter(([, v]) => v);

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={collection.title}
        subtitle={collection.description}
        meta={
          <>
            {filterChips.map(([key, value]) => (
              <MetaChip key={key}>
                {key}: {value}
              </MetaChip>
            ))}
          </>
        }
        actions={
          <TextLink href={`${ROUTES.SEARCH}?${collectionToSearchParams(collection)}`}>
            {t("discovery.collections.openFilters")}
          </TextLink>
        }
      />

      <DiscoverySection
        title={t("discovery.collections.titles")}
        count={data?.totalResults}
      >
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimeGrid items={data?.animes ?? []} empty={t("discovery.empty")} />
        )}
      </DiscoverySection>

      <p className="text-center text-xs text-muted-foreground">
        <Link href={ROUTES.COLLECTIONS} className="underline underline-offset-2">
          {t("discovery.collections.all")}
        </Link>
      </p>
    </Container>
  );
}
