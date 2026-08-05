import { useAuthStore } from "@/store/auth-store";
import { useAnimeStore } from "@/store/anime-store";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  accountWatchlist,
  accountProgress,
  statusToFolder,
  folderToStatus,
} from "@/lib/oauth/account";
import { useProgressStore } from "@/store/progress-store";
import { useWatchlistStore } from "@/store/watchlist-store";

type Props = {
  animeID?: string;
  status?: string;
  page?: number;
  per_page?: number;
  populate?: boolean;
};

export type WatchHistory = {
  id: string;
  current: number;
  duration?: number;
  timestamp: number;
  episodeId: string;
  episodeNumber: number;
  created: string;
};

export type Bookmark = {
  id: string;
  user: string;
  animeId: string;
  thumbnail: string;
  animeTitle: string;
  status: string;
  created: string;
  rewatchCount?: number;
  score?: number | null;
  expand: {
    watchHistory: WatchHistory[];
  };
};

function mapItem(item: any): Bookmark {
  const animeData = item.anime ?? {};
  const title =
    animeData?.title?.english ??
    animeData?.title?.user_preferred ??
    animeData?.title?.romaji ??
    item.animeId;
  const poster =
    animeData?.cover_image?.large ??
    animeData?.cover_image?.extra_large ??
    animeData?.poster ??
    "";

  return {
    id: item.animeId,
    user: "",
    animeId: item.animeId,
    thumbnail: poster,
    animeTitle: title,
    status: folderToStatus(item.folder ?? "WATCHING"),
    created: item.addedAt ?? "",
    rewatchCount: item.rewatchCount ?? 0,
    score: item.score ?? null,
    expand: { watchHistory: [] },
  };
}

function useBookMarks({ animeID, status, page = 1, per_page = 20, populate = true }: Props) {
  const { auth } = useAuthStore();
  const { anime: animeData } = useAnimeStore();
  const watchlistVersion = useWatchlistStore((s) => s.version);

  const [bookmarks, setBookmarks] = useState<Bookmark[] | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    if (!populate || !auth) {
      setIsLoading(false);
      setBookmarks(null);
      initialLoadRef.current = true;
      return;
    }

    const offset = (page - 1) * per_page;
    const folder = status ? statusToFolder(status) : undefined;

    const fetch = async () => {
      try {
        if (initialLoadRef.current) setIsLoading(true);
        const res = await accountWatchlist.get(folder, per_page, offset);
        const results: any[] = res?.results ?? [];

        // If filtering by animeID, narrow the results
        const filtered = animeID
          ? results.filter((r: any) => r.animeId === animeID)
          : results;

        if (filtered.length === 0) {
          setBookmarks(null);
        } else {
          setBookmarks(filtered.map(mapItem));
          const total = res?.total ?? filtered.length;
          setTotalPages(Math.ceil(total / per_page));
        }
      } catch (e) {
        console.error("useBookMarks fetch error:", e);
        if (initialLoadRef.current) setBookmarks(null);
      } finally {
        setIsLoading(false);
        initialLoadRef.current = false;
      }
    };

    fetch();
  }, [animeID, status, page, per_page, auth, populate, watchlistVersion]);

  const createOrUpdateBookMark = async (
    animeId: string,
    animeTitle: string,
    animeThumbnail: string,
    status: string,
    showToast = true,
    meta?: { anilistId?: number; malId?: number },
  ): Promise<string | null> => {
    if (!auth) return null;
    try {
      const folder = statusToFolder(status);
      const anilistId = meta?.anilistId ?? animeData?.anime?.info?.anilistId;
      const malId = meta?.malId ?? animeData?.anime?.info?.malId;

      await accountWatchlist.add({
        animeId,
        folder,
        ...(anilistId ? { anilistId } : {}),
        ...(malId ? { malId } : {}),
        ...(animeTitle ? { animeTitle } : {}),
        ...(animeThumbnail ? { animeThumbnail } : {}),
      });

      if (showToast) toast.success("List updated");
      useWatchlistStore.getState().bump();
      return animeId;
    } catch (e: any) {
      if (showToast) toast.error(e?.body?.error ?? "Failed to update list");
      return null;
    }
  };

  const syncWatchProgress = async (
    animeId: string | null,
    _watchedRecordId: string | null,
    episodeData: {
      episodeId: string;
      episodeNumber: number;
      totalEpisodes?: number;
      current: number;
      duration: number;
      language?: "sub" | "dub";
      server?: string;
    },
    /** keepalive for saves during page teardown. */
    opts?: { keepalive?: boolean },
  ): Promise<null> => {
    if (!auth || !animeId) return null;
    if (episodeData.current < 10 || episodeData.duration <= 0) return null;

    const anilistId = animeData?.anime?.info?.anilistId;
    const malId = animeData?.anime?.info?.malId;

    const infoTitle = animeData?.anime?.info?.name ?? undefined;
    const infoPoster = animeData?.anime?.info?.poster ?? undefined;
    // Auto-complete guard: a scheduled next episode proves the series is still
    // airing, so the server must not treat the latest aired episode as the last.
    const animeStatus = animeData?.anime?.moreInfo?.status ?? undefined;
    const hasNextEpisode = Boolean(animeData?.anime?.info?.nextAiringEpisode);

    try {
      await accountProgress.save(
        {
          animeId,
          ...(anilistId ? { anilistId } : {}),
          ...(malId ? { malId } : {}),
          episodeId: episodeData.episodeId,
          episodeNumber: episodeData.episodeNumber,
          ...(episodeData.totalEpisodes ? { totalEpisodes: episodeData.totalEpisodes } : {}),
          currentTime: Math.round(episodeData.current),
          duration: Math.round(episodeData.duration),
          language: episodeData.language ?? "sub",
          server: episodeData.server ?? "default",
          ...(infoTitle ? { animeTitle: infoTitle } : {}),
          ...(infoPoster ? { animeThumbnail: infoPoster } : {}),
          ...(animeStatus ? { animeStatus } : {}),
          hasNextEpisode,
        },
        opts,
      );
      useProgressStore.getState().notify();
    } catch (e) {
      console.error("syncWatchProgress error:", e);
    }
    return null;
  };

  return { bookmarks, syncWatchProgress, createOrUpdateBookMark, totalPages, isLoading };
}

export default useBookMarks;
