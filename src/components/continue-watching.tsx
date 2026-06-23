"use client";

import React, { useEffect, useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { History } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { anisurgeContinue } from "@/lib/anisurge";
import { WatchHistory } from "@/hooks/use-get-bookmark";

interface ContinueItem {
  id: string;
  name: string;
  poster: string;
  episodeId: string;
  watchDetail: WatchHistory;
}

type Props = { loading: boolean };

const ContinueWatching = ({ loading }: Props) => {
  const { auth } = useAuthStore();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setItems([]);
      setFetched(true);
      return;
    }

    setError(null);
    anisurgeContinue
      .get(true, 14)
      .then((res) => {
        const data: any[] = res?.data ?? [];
        setItems(
          data.map((r) => {
            const animeData = r.anime ?? {};
            const title =
              animeData?.title?.english ??
              animeData?.title?.user_preferred ??
              animeData?.title?.romaji ??
              r.animeId;
            const poster =
              animeData?.cover_image?.large ??
              animeData?.cover_image?.extra_large ??
              animeData?.poster ??
              "";

            const episodeNumber = parseInt((r.episodeId ?? "ep-0").replace("ep-", ""), 10) || 0;

            return {
              id: r.animeId,
              name: title,
              poster,
              episodeId: r.episodeId,
              watchDetail: {
                id: r.animeId,
                current: r.currentTime ?? 0,
                timestamp: r.duration ?? 0,
                episodeId: r.episodeId ?? "",
                episodeNumber,
                created: r.lastUpdated ?? "",
              },
            };
          }),
        );
      })
      .catch((e: any) => {
        console.error("[ContinueWatching]", e);
        setError(e?.message ?? "Failed to load watch history");
        setItems([]);
      })
      .finally(() => setFetched(true));
  }, [auth]);

  if (loading || !fetched) return <LoadingSkeleton />;
  if (error) return (
    <Container className="py-6">
      <p className="text-white/35 text-sm font-mono">Watch history unavailable: {error}</p>
    </Container>
  );
  if (!items.length) return null;

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 bg-white/35 shrink-0" />
        <History className="text-white/45 w-4 h-4" />
        <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Continue Watching
        </h5>
      </div>

      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
        {items.map((item, idx) => (
          <BlurFade key={item.id} delay={idx * 0.04} inView>
            <AnimeCard
              title={item.name}
              poster={item.poster}
              className="w-full"
              href={`${ROUTES.WATCH}?anime=${item.id}&episode=${item.episodeId}`}
              watchDetail={item.watchDetail}
            />
          </BlurFade>
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => (
  <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
    <div className="flex items-center gap-3">
      <div className="w-0.5 h-5 bg-white/20 animate-pulse" />
      <div className="h-6 w-44 animate-pulse bg-white/8 rounded" />
    </div>
    <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="rounded-xl h-[15.625rem] md:h-[18.75rem] animate-pulse bg-white/8" />
      ))}
    </div>
  </Container>
);

export default ContinueWatching;
