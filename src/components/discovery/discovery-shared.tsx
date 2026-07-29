"use client";

import Link from "next/link";
import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import type { IAnime } from "@/types/anime";
import { cn } from "@/lib/core/utils";

export function DiscoveryHero({
  title,
  subtitle,
  banner,
  meta,
  actions,
}: {
  title: string;
  subtitle?: string;
  banner?: string | null;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border dark:border-white/[0.08] mb-8">
      {banner ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${banner})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
      <div className="relative px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground dark:text-white tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground dark:text-white/50 leading-relaxed">
            {subtitle}
          </p>
        )}
        {meta && <div className="mt-4 flex flex-wrap gap-2">{meta}</div>}
        {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function DiscoverySection({
  title,
  count,
  children,
  className,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4 mb-10", className)}>
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 bg-muted/50 dark:bg-white/40 rounded-full" />
        <h2 className="text-lg font-semibold text-foreground dark:text-white/90">{title}</h2>
        {count != null && (
          <span className="text-xs font-mono text-muted-foreground dark:text-white/30">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

export function AnimeGrid({
  items,
  empty,
}: {
  items: IAnime[];
  empty?: string;
}) {
  if (!items.length) {
    return empty ? (
      <p className="py-8 text-sm text-muted-foreground dark:text-white/35 font-mono">{empty}</p>
    ) : null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((anime) => (
        <AnimeCard
          key={anime.id}
          title={anime.name}
          subTitle={anime.type}
          poster={anime.poster}
          href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
          className="w-full"
          showGenre={false}
          episodeCard
          deferImage
          sub={anime.episodes?.sub}
          dub={anime.episodes?.dub}
          score={anime.score}
          year={anime.year}
          status={anime.status}
        />
      ))}
    </div>
  );
}

export function MetaChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-2.5 py-1 text-[11px] font-mono text-muted-foreground dark:text-white/55">
      {children}
    </span>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg border border-border dark:border-white/12 bg-muted/40 dark:bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground/80 dark:text-white/70 hover:bg-muted dark:hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  );
}
