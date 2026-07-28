"use client";

import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { getRecentlyViewed } from "@/lib/core/recently-viewed";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import { useT } from "@/providers/i18n-provider";
import type { IAnime } from "@/types/anime";
import HomeCompactPoster from "./home-compact-poster";
import { HomeScrollRail, HomeSectionLink } from "./home-shared";

type Seed = { id: string; name: string };

export default function HomeBecauseYouWatched() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const [seed, setSeed] = useState<Seed | null>(null);
  const [items, setItems] = useState<IAnime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolveSeed(): Promise<Seed | null> {
      if (auth?.id) {
        try {
          const res = await anisurgeContinue.get(true, 1);
          const row = res?.data?.[0];
          if (row?.animeId) {
            const title =
              row.anime?.title?.english ??
              row.anime?.title?.user_preferred ??
              row.anime?.title?.romaji ??
              String(row.animeId);
            return { id: String(row.animeId), name: title };
          }
        } catch {
          /* fall through */
        }
      }
      const recent = getRecentlyViewed()[0];
      if (recent) return { id: recent.id, name: recent.name };
      return null;
    }

    (async () => {
      setLoading(true);
      const nextSeed = await resolveSeed();
      if (cancelled) return;
      if (!nextSeed) {
        setSeed(null);
        setItems([]);
        setLoading(false);
        return;
      }
      setSeed(nextSeed);
      try {
        const res = await fetch(`/api/anime/${nextSeed.id}/related`);
        if (!res.ok) throw new Error("related failed");
        const json = await res.json();
        const recommended = (json?.data?.recommendedAnimes ?? json?.recommendedAnimes ?? []) as IAnime[];
        const related = (json?.data?.relatedAnimes ?? json?.relatedAnimes ?? []) as IAnime[];
        const merged = [...recommended, ...related]
          .filter((a) => a?.id && a.id !== nextSeed.id)
          .filter((a, i, arr) => arr.findIndex((x) => x.id === a.id) === i)
          .slice(0, 12);
        if (!cancelled) setItems(merged);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth?.id]);

  if (loading) {
    return (
      <Container className="flex flex-col gap-4 py-2">
        <div className="h-7 w-56 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-36 aspect-[1/1.4] rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (!seed || items.length === 0) return null;

  return (
    <Container id="because-you-watched" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={`${ROUTES.ANIME_DETAILS}/${seed.id}`}
        title={t("home.becauseYouWatched", { title: seed.name })}
        icon={<Clapperboard className="w-4 h-4" />}
        compact
      />
      <HomeScrollRail>
        {items.map((anime) => (
          <HomeCompactPoster key={anime.id} anime={anime} />
        ))}
      </HomeScrollRail>
    </Container>
  );
}
