"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useProgressStore } from "@/store/progress-store";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import type { WatchHistory } from "@/hooks/use-get-bookmark";

export function useEpisodeProgress(animeId: string | null): WatchHistory[] {
  const { auth } = useAuthStore();
  const lastSaved = useProgressStore((s) => s.lastSaved);
  const [episodes, setEpisodes] = useState<WatchHistory[]>([]);

  useEffect(() => {
    if (!auth || !animeId) { setEpisodes([]); return; }

    anisurgeContinue.getByAnime(animeId)
      .then((res: any) => {
        const data: any[] = res?.data ?? [];
        setEpisodes(
          data.map((r: any) => ({
            id: r.episodeId ?? "",
            current: r.currentTime ?? 0,
            duration: r.duration ?? 0,
            timestamp: r.duration ?? 0,
            episodeId: r.episodeId ?? "",
            episodeNumber: parseInt((r.episodeId ?? "ep-0").replace("ep-", ""), 10) || 0,
            created: r.lastUpdated ?? "",
          })),
        );
      })
      .catch(() => setEpisodes([]));
  }, [auth, animeId, lastSaved]);

  return episodes;
}
