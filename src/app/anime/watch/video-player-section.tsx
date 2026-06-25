"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { anisurgeContinue } from "@/lib/anisurge";
import dynamic from "next/dynamic";
import {
  useGetKittyStream,
  KITTY_PROVIDERS,
  KittyProvider,
} from "@/query/get-kitty-stream";
import { useSkipTimes } from "@/query/use-aniskip";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import {
  Captions,
  Mic,
  Loader2,
  AlertCircle,
  Cat,
  Server,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const KittyPlayer = dynamic(() => import("@/components/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

const DEFAULT_PROVIDER: KittyProvider = "Miruro";

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("episode");
  const { selectedEpisode, anime, setSelectedEpisode } = useAnimeStore();

  const { preferDub, setPreferDub } = useSettingsStore();

  const [provider, setProvider] = useState<KittyProvider>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyProvider");
      if (saved && KITTY_PROVIDERS.includes(saved as KittyProvider))
        return saved as KittyProvider;
    }
    return DEFAULT_PROVIDER;
  });

  const audio: "sub" | "dub" = preferDub ? "dub" : "sub";
  const anilistId = anime?.anime?.info?.anilistId;
  const malId     = anime?.anime?.info?.malId;

  const episodeNo = selectedEpisode?.startsWith("ep-")
    ? selectedEpisode.replace("ep-", "")
    : selectedEpisode ?? "";

  // ── Resume position ──────────────────────────────────────────────
  const [startTime, setStartTime] = useState(0);

  // Live position tracking — updated every timeupdate event (no re-render)
  const liveTimeRef = useRef(0);
  const liveDurationRef = useRef(0);

  // ── Progress tracking ────────────────────────────────────────────
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({ populate: false });
  const bookmarkIdRef = useRef<string | null>(null);
  const watchedIdRef  = useRef<string | null>(null);

  const animeSlug = anime?.anime?.info?.id ?? null;

  // Episode list for next-episode navigation
  const { data: allEpisodes } = useGetAllEpisodes(animeSlug ?? "");
  const nextEpisode = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    const idx = allEpisodes.episodes.findIndex((e) => e.episodeId === episodeId);
    return idx >= 0 && idx < allEpisodes.episodes.length - 1
      ? allEpisodes.episodes[idx + 1]
      : undefined;
  }, [allEpisodes, episodeId]);

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisode || !animeSlug) return;
    setSelectedEpisode(nextEpisode.episodeId);
    router.push(`/anime/watch?anime=${animeSlug}&episode=${nextEpisode.episodeId}`);
  }, [nextEpisode, animeSlug, setSelectedEpisode, router]);

  // Reset refs when episode changes so we don't cross-contaminate
  useEffect(() => {
    bookmarkIdRef.current = null;
    watchedIdRef.current = null;
    liveTimeRef.current = 0;
    liveDurationRef.current = 0;
  }, [episodeId]);

  // Fetch saved resume position (only when episode actually changes)
  useEffect(() => {
    setStartTime(0);
    if (!auth || !animeSlug || !episodeId) return;
    anisurgeContinue.getEpisode(animeSlug, episodeId)
      .then((r: any) => {
        const t = r?.currentTime ?? 0;
        const dur = r?.duration ?? 0;
        if (t > 10 && (dur <= 0 || t < dur - 30)) setStartTime(t);
      })
      .catch(() => {});
  }, [auth, animeSlug, episodeId]);

  const handleStart = useCallback(async () => {
    if (!auth || !anime?.anime?.info) return;
    const { id: slug, name, poster } = anime.anime.info;
    // Add to watchlist silently — doesn't gate progress saving
    createOrUpdateBookMark(slug, name, poster, "watching", false)
      .then((bId) => { bookmarkIdRef.current = bId; })
      .catch(() => {});
  }, [auth, anime, createOrUpdateBookMark]);

  // Save progress directly — watchlist entry is not required
  const saveProgress = useCallback(async (current: number, duration: number) => {
    if (!auth || !episodeId || !episodeNo || !animeSlug) return;
    if (!current || !duration) return;
    watchedIdRef.current = await syncWatchProgress(
      animeSlug,
      watchedIdRef.current,
      {
        episodeId,
        episodeNumber: parseInt(episodeNo) || 0,
        current,
        duration,
        language: audio,
        server: provider,
      },
    );
  }, [auth, episodeId, episodeNo, audio, provider, animeSlug, syncWatchProgress]);

  // Track live position in ref (fires every timeupdate — no state update)
  const handleLiveTime = useCallback((t: number, dur: number) => {
    liveTimeRef.current = t;
    liveDurationRef.current = dur;
  }, []);

  // Save on pauses as well as on the 10s interval
  const handleProgress = useCallback((current: number, duration: number) => {
    saveProgress(current, duration);
  }, [saveProgress]);

  // Save progress on tab close / navigation away
  useEffect(() => {
    const onUnload = () => {
      const t = liveTimeRef.current;
      const dur = liveDurationRef.current;
      if (t > 5 && dur > 0) {
        saveProgress(t, dur);
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveProgress]);

  const {
    data: streamData,
    isLoading,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(anilistId, episodeNo || undefined, audio, provider);

  const { data: skipTimes } = useSkipTimes(
    streamData?.tracks,
    streamData?.file,
    streamData?.headers?.Referer ?? streamData?.headers?.referer ?? "",
    malId,
    anilistId,
    parseInt(episodeNo) || undefined,
  );

  // Change provider but resume from current position, not original start
  const handleProviderChange = (p: KittyProvider) => {
    const t = liveTimeRef.current;
    if (t > 5) setStartTime(t);
    setProvider(p);
    localStorage.setItem("kittyProvider", p);
  };

  // Change audio track and resume from current position
  const handleAudioChange = (dub: boolean) => {
    const t = liveTimeRef.current;
    if (t > 5) setStartTime(t);
    setPreferDub(dub);
  };

  if (!episodeId && !selectedEpisode) {
    return (
      <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10">
        <Cat className="text-white/20 w-12 h-12" />
        <p className="text-white/30 text-sm font-mono">select an episode to start watching</p>
      </div>
    );
  }

  if (isLoading) return <PlayerSkeleton />;

  const upstreamError = (streamError as any)?.response?.data?.error as string | undefined;

  if (streamError || !streamData?.file) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton dim />
        <Alert className="border-white/10 bg-white/5 rounded-xl">
          <AlertCircle className="h-4 w-4 text-white/60" />
          <AlertTitle className="text-white/80 font-semibold">
            Stream unavailable on {provider}
          </AlertTitle>
          <AlertDescription className="text-white/40 text-xs mt-1">
            {upstreamError ?? streamData?.error ?? "This provider couldn't find the stream. Try a different one below."}
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-1.5">
          {KITTY_PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                p === provider
                  ? "bg-white/15 border-white/30 text-white"
                  : "bg-transparent border-white/10 text-white/40 hover:border-white/25 hover:text-white/70"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-white/15 text-white/60 hover:bg-white/10 w-fit text-xs"
          onClick={() => retryStream()}
        >
          Retry with {provider}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl overflow-hidden ring-1 ring-white/10">
      <KittyPlayer
        key={`${anilistId}-${episodeNo}-${audio}-${provider}`}
        src={streamData.file}
        poster={anime?.anime?.info?.poster}
        tracks={streamData.tracks ?? []}
        headers={streamData.headers ?? {}}
        skipTimes={skipTimes}
        startTime={startTime}
        nextEpisode={nextEpisode ? { id: nextEpisode.episodeId, number: nextEpisode.number, title: nextEpisode.title } : undefined}
        onStart={handleStart}
        onProgress={handleProgress}
        onLiveTime={handleLiveTime}
        onNextEpisode={handleNextEpisode}
      />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#0a0a0a] border-t border-white/8">

        {/* Left — episode info */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          {episodeNo && (
            <span className="text-[11px] font-bold font-mono text-white/50 bg-white/6 border border-white/10 px-2 py-0.5 rounded-md shrink-0">
              EP {episodeNo}
            </span>
          )}
          {(skipTimes?.intro || skipTimes?.outro) && (
            <span className="text-[10px] font-mono text-white/25 hidden sm:inline shrink-0">
              · chapters
            </span>
          )}
          <span className="text-[10px] font-mono text-white/15 hidden sm:inline truncate">
            kittyapi.buzz
          </span>
        </div>

        {/* Provider selector */}
        <div className="flex items-center gap-1.5">
          <Server className="w-3 h-3 text-white/25 shrink-0" />
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as KittyProvider)}
            className="bg-[#111] border border-white/12 text-white/55 text-[11px] font-mono rounded-lg px-2 py-1 cursor-pointer hover:border-white/25 hover:text-white/75 focus:outline-none focus:border-white/25 transition-all appearance-none"
          >
            {KITTY_PROVIDERS.map((p) => (
              <option key={p} value={p} className="bg-[#111]">{p}</option>
            ))}
          </select>
        </div>

        {/* Sub / Dub toggle */}
        <div className="flex items-center rounded-lg overflow-hidden border border-white/12 bg-white/[0.03]">
          <button
            className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold transition-all ${
              !preferDub
                ? "bg-white text-black"
                : "text-white/35 hover:text-white/60 hover:bg-white/6"
            }`}
            onClick={() => handleAudioChange(false)}
          >
            <Captions className="w-3 h-3" /> SUB
          </button>
          <div className="w-px h-4 bg-white/12" />
          <button
            className={`flex items-center gap-1 h-7 px-2.5 text-[11px] font-bold transition-all ${
              preferDub
                ? "bg-white text-black"
                : "text-white/35 hover:text-white/60 hover:bg-white/6"
            }`}
            onClick={() => handleAudioChange(true)}
          >
            <Mic className="w-3 h-3" /> DUB
          </button>
        </div>
      </div>
    </div>
  );
};

const PlayerSkeleton = ({ dim = false }: { dim?: boolean }) => (
  <div
    className={`w-full aspect-video rounded-xl bg-black border border-white/10 flex flex-col items-center justify-center gap-3 ${dim ? "opacity-40" : ""}`}
  >
    <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
    <p className="text-white/20 text-[11px] font-mono tracking-widest animate-pulse">fetching stream...</p>
  </div>
);

export default VideoPlayerSection;
