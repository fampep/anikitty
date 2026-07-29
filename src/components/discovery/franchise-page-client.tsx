"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import {
  AnimeGrid,
  DiscoveryHero,
  DiscoverySection,
  MetaChip,
  TextLink,
} from "@/components/discovery/discovery-shared";
import type { FranchisePayload } from "@/lib/discovery/franchise";
import { cn } from "@/lib/core/utils";

function formatRuntime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export default function FranchisePageClient({ id }: { id: string }) {
  const t = useT();
  const [data, setData] = useState<FranchisePayload | null>(null);
  const [error, setError] = useState(false);
  const [order, setOrder] = useState<"chrono" | "release">("chrono");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/franchise/${id}`);
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
  }, [id]);

  if (loading) {
    return (
      <Container className="pt-10 pb-24">
        <div className="h-48 rounded-2xl bg-muted/40 dark:bg-white/5 animate-pulse mb-8" />
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[2/3] rounded-xl bg-muted/30 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="pt-16 pb-24 text-center">
        <p className="text-muted-foreground">{t("discovery.franchise.loadError")}</p>
        <Link href={ROUTES.HOME} className="text-sm text-primary mt-4 inline-block">
          {t("common.backHome")}
        </Link>
      </Container>
    );
  }

  const timeline = order === "chrono" ? data.chronological : data.releaseOrder;

  return (
    <Container className="pt-8 pb-24">
      <DiscoveryHero
        title={data.title}
        subtitle={t("discovery.franchise.subtitle")}
        banner={data.banner || data.poster}
        meta={
          <>
            <MetaChip>
              {t("discovery.franchise.entries", { count: data.entryCount })}
            </MetaChip>
            <MetaChip>
              {t("discovery.franchise.episodes", { count: data.totalEpisodes })}
            </MetaChip>
            {data.totalRuntimeMinutes > 0 && (
              <MetaChip>
                {t("discovery.franchise.runtime", {
                  time: formatRuntime(data.totalRuntimeMinutes),
                })}
              </MetaChip>
            )}
          </>
        }
        actions={
          <>
            <TextLink href={`${ROUTES.ANIME_DETAILS}/${data.seedId}`}>
              {t("discovery.franchise.openSeed")}
            </TextLink>
            <button
              type="button"
              onClick={() => setOrder("chrono")}
              className={cn(
                "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                order === "chrono"
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-border dark:border-white/12 text-muted-foreground hover:bg-white/5",
              )}
            >
              {t("discovery.franchise.chronological")}
            </button>
            <button
              type="button"
              onClick={() => setOrder("release")}
              className={cn(
                "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                order === "release"
                  ? "border-white/25 bg-white/10 text-white"
                  : "border-border dark:border-white/12 text-muted-foreground hover:bg-white/5",
              )}
            >
              {t("discovery.franchise.releaseOrder")}
            </button>
          </>
        }
      />

      <DiscoverySection title={t("discovery.franchise.timeline")} count={timeline.length}>
        <div className="relative pl-4 border-l border-border dark:border-white/10 space-y-4">
          {timeline.map((entry, idx) => (
            <Link
              key={entry.id}
              href={`${ROUTES.ANIME_DETAILS}/${entry.id}`}
              className="group flex gap-4 -ml-[5px]"
            >
              <span
                className={cn(
                  "mt-2 h-2.5 w-2.5 rounded-full shrink-0 ring-4 ring-background",
                  entry.isSeed ? "bg-white" : "bg-white/35",
                )}
              />
              <div className="flex gap-3 flex-1 min-w-0 pb-2">
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted/40">
                  {entry.poster && (
                    <Image src={entry.poster} alt={entry.name} fill className="object-cover" unoptimized sizes="56px" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
                    {idx + 1}. {[entry.type, entry.seasonYear, entry.startDate].filter(Boolean).join(" · ")}
                  </p>
                  <p className="text-sm font-semibold text-foreground dark:text-white/90 group-hover:text-white transition-colors line-clamp-2">
                    {entry.name}
                    {entry.isSeed ? ` · ${t("discovery.franchise.youAreHere")}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-white/40 mt-0.5">
                    {[
                      entry.episodes ? `${entry.episodes} eps` : null,
                      entry.runtimeMinutes ? formatRuntime(entry.runtimeMinutes) : null,
                      entry.score ? `${(entry.score / 10).toFixed(1)}★` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </DiscoverySection>

      {data.byFormat.seasons.length > 0 && (
        <DiscoverySection title={t("discovery.franchise.seasons")} count={data.byFormat.seasons.length}>
          <AnimeGrid items={data.byFormat.seasons as any} />
        </DiscoverySection>
      )}
      {data.byFormat.ovas.length > 0 && (
        <DiscoverySection title={t("discovery.franchise.ovas")} count={data.byFormat.ovas.length}>
          <AnimeGrid items={data.byFormat.ovas as any} />
        </DiscoverySection>
      )}
      {data.byFormat.movies.length > 0 && (
        <DiscoverySection title={t("discovery.franchise.movies")} count={data.byFormat.movies.length}>
          <AnimeGrid items={data.byFormat.movies as any} />
        </DiscoverySection>
      )}
      {data.byFormat.specials.length > 0 && (
        <DiscoverySection title={t("discovery.franchise.specials")} count={data.byFormat.specials.length}>
          <AnimeGrid items={data.byFormat.specials as any} />
        </DiscoverySection>
      )}
    </Container>
  );
}
