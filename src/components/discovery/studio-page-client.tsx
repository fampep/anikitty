"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { useSettingsStore } from "@/store/settings-store";
import {
  AnimeGrid,
  DiscoveryHero,
  DiscoverySection,
  MetaChip,
  TextLink,
} from "@/components/discovery/discovery-shared";
import type { StudioPayload } from "@/lib/discovery/studio";
import { ExternalLink } from "lucide-react";

export default function StudioPageClient({ id }: { id: string }) {
  const t = useT();
  const adult = useSettingsStore((s) => s.showAdultContent);
  const [data, setData] = useState<StudioPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/studio/${id}${adult ? "?adult=1" : ""}`);
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
  }, [id, adult]);

  if (loading) {
    return (
      <Container className="pt-10 pb-24">
        <div className="h-48 rounded-2xl bg-muted/40 dark:bg-white/5 animate-pulse" />
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="pt-16 pb-24 text-center">
        <p className="text-muted-foreground">{t("discovery.studio.loadError")}</p>
        <Link href={ROUTES.HOME} className="text-sm text-primary mt-4 inline-block">
          {t("common.backHome")}
        </Link>
      </Container>
    );
  }

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={data.name}
        subtitle={t("discovery.studio.subtitle")}
        banner={data.banner}
        meta={
          <>
            {data.foundedYear && (
              <MetaChip>
                {t("discovery.studio.founded", { year: data.foundedYear })}
              </MetaChip>
            )}
            {data.location && <MetaChip>{data.location}</MetaChip>}
            <MetaChip>
              {t("discovery.studio.productions", { count: data.totalProductions })}
            </MetaChip>
            {data.averageScore != null && (
              <MetaChip>
                {t("discovery.studio.avgScore", {
                  score: (data.averageScore / 10).toFixed(1),
                })}
              </MetaChip>
            )}
            {data.favourites != null && (
              <MetaChip>{data.favourites.toLocaleString()} ★</MetaChip>
            )}
          </>
        }
        actions={
          <>
            {data.siteUrl && (
              <a
                href={data.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/80 dark:text-white/70 hover:bg-muted dark:hover:bg-white/10 transition-colors"
              >
                {t("discovery.studio.website")}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <TextLink href={`${ROUTES.SEARCH}?studio=${data.id}`}>
              {t("discovery.studio.browseAll")}
            </TextLink>
          </>
        }
      />

      {data.logo && (
        <div className="mb-8 flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-border dark:border-white/10">
            <Image src={data.logo} alt={data.name} fill className="object-cover" unoptimized sizes="64px" />
          </div>
          <p className="text-xs text-muted-foreground dark:text-white/40 font-mono uppercase tracking-widest">
            {t("discovery.studio.logoHint")}
          </p>
        </div>
      )}

      {data.history.length > 0 && (
        <DiscoverySection title={t("discovery.studio.history")}>
          <div className="flex flex-wrap gap-2">
            {data.history.map((h) => (
              <MetaChip key={h.year}>
                {h.year}: {h.count}
              </MetaChip>
            ))}
          </div>
        </DiscoverySection>
      )}

      <DiscoverySection title={t("discovery.studio.popular")} count={data.popular.length}>
        <AnimeGrid items={data.popular} empty={t("discovery.empty")} />
      </DiscoverySection>

      <DiscoverySection title={t("discovery.studio.highestRated")} count={data.highestRated.length}>
        <AnimeGrid items={data.highestRated} empty={t("discovery.empty")} />
      </DiscoverySection>

      <DiscoverySection title={t("discovery.studio.upcoming")} count={data.upcoming.length}>
        <AnimeGrid items={data.upcoming} empty={t("discovery.empty")} />
      </DiscoverySection>

      {data.staff.length > 0 && (
        <DiscoverySection title={t("discovery.studio.staff")} count={data.staff.length}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-border dark:border-white/8 p-2.5"
              >
                <div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted/40 shrink-0">
                  {s.image && (
                    <Image src={s.image} alt={s.name} fill className="object-cover" unoptimized sizes="40px" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{s.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground line-clamp-1">{s.role}</p>
                </div>
              </div>
            ))}
          </div>
        </DiscoverySection>
      )}
    </Container>
  );
}
