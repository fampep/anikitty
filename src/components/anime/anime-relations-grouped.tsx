"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import type { RelatedAnime, Season } from "@/types/anime-details";

const RELATION_ORDER = [
  "PREQUEL",
  "SEQUEL",
  "PARENT",
  "SIDE_STORY",
  "ALTERNATIVE",
  "SPIN_OFF",
  "SUMMARY",
  "ADAPTATION",
  "CHARACTER",
  "OTHER",
] as const;

function relationLabel(type: string, t: (k: string) => string): string {
  const key = `anime.relations.types.${type}`;
  const translated = t(key);
  if (translated !== key) return translated;
  return type
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

type Props = {
  related: RelatedAnime[];
  seasons?: Season[];
  currentId: string;
  currentName?: string;
  currentPoster?: string;
};

export default function AnimeRelationsGrouped({
  related,
  seasons,
  currentId,
  currentName,
  currentPoster,
}: Props) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<string, RelatedAnime[]>();
    for (const item of related) {
      const type = item.relationType || "OTHER";
      const list = map.get(type) ?? [];
      list.push(item);
      map.set(type, list);
    }
    const ordered = RELATION_ORDER.filter((k) => map.has(k));
    const extras = [...map.keys()].filter(
      (k) => !(RELATION_ORDER as readonly string[]).includes(k),
    );
    return [...ordered, ...extras].map((type) => ({ type, items: map.get(type)! }));
  }, [related]);

  const franchise = useMemo(() => {
    const base = (seasons ?? []).filter((s) => s.id);
    if (base.length === 0) return [];
    return base.map((s) => {
      if (s.isCurrent || s.id === currentId) {
        return {
          ...s,
          isCurrent: true,
          name: s.name || currentName || t("anime.relations.current"),
          poster: s.poster || currentPoster || "",
        };
      }
      return s;
    });
  }, [seasons, currentId, currentName, currentPoster, t]);

  return (
    <div className="space-y-10">
      {franchise.length > 1 && (
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">
              {t("anime.relations.franchise")}
            </h3>
            {currentId && (
              <Link
                href={ROUTES.franchise(currentId)}
                className="text-[11px] font-medium text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/80 transition-colors"
              >
                {t("discovery.franchise.viewFull")}
              </Link>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-momentum">
            {franchise.map((s, idx) => (
              <FranchiseCard key={s.id} season={s} index={idx} />
            ))}
          </div>
        </section>
      )}

      {grouped.map(({ type, items }) => (
        <section key={type}>
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-4">
            {relationLabel(type, t)}
            <span className="ml-2 text-muted-foreground/50 dark:text-white/15">{items.length}</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((item) => (
              <RelationCard key={`${type}-${item.id}`} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FranchiseCard({ season, index }: { season: Season; index: number }) {
  const t = useT();
  const inner = (
    <div
      className={cn(
        "relative w-[7.5rem] sm:w-32 shrink-0 rounded-xl overflow-hidden border transition-all",
        season.isCurrent
          ? "border-primary/50 ring-1 ring-primary/30 shadow-[0_0_24px_rgba(255,255,255,0.06)]"
          : "border-border dark:border-white/8 hover:border-white/20",
      )}
    >
      <div className="relative aspect-[2/3] bg-muted/40 dark:bg-white/[0.03]">
        {season.poster ? (
          <Image src={season.poster} alt={season.name} fill className="object-cover" unoptimized sizes="128px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-muted-foreground/50">
            {index + 1}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
        {season.isCurrent && (
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 rounded-md bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5">
            <Check className="w-2.5 h-2.5" />
            {t("anime.relations.current")}
          </span>
        )}
        <div className="absolute bottom-0 inset-x-0 p-2">
          <p className="text-[11px] font-semibold text-white line-clamp-2 leading-tight">{season.name}</p>
          {(season.seasonYear || season.type) && (
            <p className="text-[9px] font-mono text-white/45 mt-0.5">
              {[season.seasonYear, season.type].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (season.isCurrent) return inner;
  return (
    <Link href={`${ROUTES.ANIME_DETAILS}/${season.id}`} className="shrink-0">
      {inner}
    </Link>
  );
}

function RelationCard({ item }: { item: RelatedAnime }) {
  return (
    <Link
      href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
      className="group flex flex-col gap-2 rounded-xl overflow-hidden"
    >
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border dark:border-white/8 group-hover:border-white/20 transition-colors bg-muted/30 dark:bg-white/[0.03]">
        {item.poster ? (
          <Image
            src={item.poster}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized
            sizes="(max-width: 640px) 45vw, 160px"
          />
        ) : null}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="text-[12px] font-medium text-foreground/85 dark:text-white/80 line-clamp-2 group-hover:text-foreground dark:group-hover:text-white transition-colors">
          {item.name}
        </p>
        {item.type && (
          <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/30 mt-0.5">
            {item.type}
            {item.episodes?.sub ? ` · ${item.episodes.sub} eps` : ""}
          </p>
        )}
      </div>
    </Link>
  );
}
