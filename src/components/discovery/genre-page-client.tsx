"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import {
  AnimeGrid,
  DiscoveryHero,
  DiscoverySection,
  TextLink,
} from "@/components/discovery/discovery-shared";
import { getGenreMeta } from "@/lib/discovery/genres";
import type { GenreHubPayload } from "@/lib/discovery/hubs";

export default function GenrePageClient({ slug }: { slug: string }) {
  const t = useT();
  const meta = getGenreMeta(slug);
  const adult = useSettingsStore((s) => s.showAdultContent);
  const [data, setData] = useState<GenreHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/genre/${encodeURIComponent(slug)}${adult ? "?adult=1" : ""}`);
        if (!res.ok) throw new Error("failed");
        const json = await res.json();
        if (!cancelled) setData(json.data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, adult]);

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={meta.name}
        subtitle={meta.description}
        actions={
          <TextLink href={`${ROUTES.SEARCH}?genres=${meta.slug}`}>
            {t("discovery.genre.browseAll")}
          </TextLink>
        }
      />

      {loading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-muted-foreground py-12 text-center">{t("discovery.genre.loadError")}</p>
      )}

      {data && !loading && (
        <>
          <DiscoverySection title={t("discovery.genre.trending")} count={data.trending.length}>
            <AnimeGrid items={data.trending} empty={t("discovery.empty")} />
          </DiscoverySection>
          <DiscoverySection title={t("discovery.genre.highestRated")} count={data.highestRated.length}>
            <AnimeGrid items={data.highestRated} empty={t("discovery.empty")} />
          </DiscoverySection>
          <DiscoverySection title={t("discovery.genre.newReleases")} count={data.newReleases.length}>
            <AnimeGrid items={data.newReleases} empty={t("discovery.empty")} />
          </DiscoverySection>
          <DiscoverySection title={t("discovery.genre.hiddenGems")} count={data.hiddenGems.length}>
            <AnimeGrid items={data.hiddenGems} empty={t("discovery.empty")} />
          </DiscoverySection>
          <DiscoverySection title={t("discovery.genre.upcoming")} count={data.upcoming.length}>
            <AnimeGrid items={data.upcoming} empty={t("discovery.empty")} />
          </DiscoverySection>
        </>
      )}

      {!loading && !data && !error && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href={ROUTES.SEARCH} className="underline">
            {t("discovery.genre.browseAll")}
          </Link>
        </p>
      )}
    </Container>
  );
}
