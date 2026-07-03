"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { getAnimeProgressEntries, useProgressStore } from "@/store/progress-store";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import type { WatchHistory } from "@/hooks/use-get-bookmark";

function mergeEpisodeProgress(
  remote: WatchHistory[],
  local: Array<{ episodeId: string; current: number; duration: number }>,
): WatchHistory[] {
  const byEpisode = new Map<string, WatchHistory>();

  for (const row of remote) {
    if (!row.episodeId) continue;
    byEpisode.set(row.episodeId, row);
  }

  for (const row of local) {
    const prev = byEpisode.get(row.episodeId);
    const current = Math.max(prev?.current ?? 0, row.current);
    const duration = Math.max(prev?.duration ?? 0, row.duration);
    const episodeNumber =
      prev?.episodeNumber ??
      (parseInt(row.episodeId.replace("ep-", ""), 10) || 0);

    byEpisode.set(row.episodeId, {
      id: row.episodeId,
      episodeId: row.episodeId,
      episodeNumber,
      current,
      duration,
      timestamp: duration,
      created: prev?.created ?? "",
    });
  }

  return Array.from(byEpisode.values());
}

export function useEpisodeProgress(animeId: string | null): WatchHistory[] {
  const { auth } = useAuthStore();
  const lastSaved = useProgressStore((s) => s.lastSaved);
  const [remoteEpisodes, setRemoteEpisodes] = useState<WatchHistory[]>([]);

  useEffect(() => {
    if (!auth || !animeId) {
      setRemoteEpisodes([]);
      return;
    }

    anisurgeContinue
      .getByAnime(animeId)
      .then((res: { data?: Array<Record<string, unknown>> }) => {
        const data = res?.data ?? [];
        setRemoteEpisodes(
          data.map((r) => ({
            id: String(r.episodeId ?? ""),
            current: Number(r.currentTime ?? 0),
            duration: Number(r.duration ?? 0),
            timestamp: Number(r.duration ?? 0),
            episodeId: String(r.episodeId ?? ""),
            episodeNumber:
              parseInt(String(r.episodeId ?? "ep-0").replace("ep-", ""), 10) || 0,
            created: String(r.lastUpdated ?? ""),
          })),
        );
      })
      .catch(() => setRemoteEpisodes([]));
  }, [auth, animeId, lastSaved]);

  return useMemo(() => {
    if (!animeId) return [];
    const local = getAnimeProgressEntries(animeId);
    if (!auth) {
      return mergeEpisodeProgress([], local);
    }
    return mergeEpisodeProgress(remoteEpisodes, local);
  }, [animeId, auth, remoteEpisodes, lastSaved]);
}
