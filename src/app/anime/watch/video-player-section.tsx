"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { useProgressStore } from "@/store/progress-store";
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
  Users,
} from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useW2g } from "@/hooks/use-w2g";
import W2gPanel from "@/components/w2g/w2g-panel";
import LoginPopoverButton from "@/components/login-popover-button";

const KittyPlayer = dynamic(() => import("@/components/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

const DEFAULT_PROVIDER: KittyProvider = "Miruro";

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("episode");
  const w2gCode = searchParams.get("w2g");
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

  const w2g = useW2g({
    code: w2gCode,
    animeId: animeSlug,
    episodeId,
    provider,
    audio,
    enabled: !!w2gCode && !!auth,
    onEpisodeChange: (epId) => {
      if (!animeSlug || !w2gCode) return;
      setSelectedEpisode(epId);
      router.push(
        `/anime/watch?anime=${encodeURIComponent(animeSlug)}&episode=${encodeURIComponent(epId)}&w2g=${w2gCode}`,
      );
    },
  });

  const [creatingW2g, setCreatingW2g] = useState(false);

  const handleCreateW2g = async () => {
    if (!auth) {
      toast.error("Sign in to start a watch party");
      return;
    }
    if (!animeSlug || !episodeId) return;
    setCreatingW2g(true);
    try {
      const room = await w2g.createRoom({
        animeId: animeSlug,
        animeTitle: anime?.anime?.info?.name,
        animeThumbnail: anime?.anime?.info?.poster,
        episodeId,
        episodeNumber: parseInt(episodeNo) || 0,
        currentTime: Math.floor(liveTimeRef.current),
      });
      const params = new URLSearchParams(searchParams.toString());
      params.set("w2g", room.code);
      router.replace(`/anime/watch?${params.toString()}`, { scroll: false });
      toast.success(`Room ${room.code} created — share the code!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setCreatingW2g(false);
    }
  };

  const handleLeaveW2g = async () => {
    await w2g.leave();
    const params = new URLSearchParams(searchParams.toString());
    params.delete("w2g");
    router.replace(`/anime/watch?${params.toString()}`, { scroll: false });
  };

  // Episode list for next-episode navigation
  const { data: allEpisodes } = useGetAllEpisodes(animeSlug ?? "");
  const currentEpisodeInfo = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    return allEpisodes.episodes.find((e) => e.episodeId === episodeId);
  }, [allEpisodes, episodeId]);
  const nextEpisode = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    const idx = allEpisodes.episodes.findIndex((e) => e.episodeId === episodeId);
    return idx >= 0 && idx < allEpisodes.episodes.length - 1
      ? allEpisodes.episodes[idx + 1]
      : undefined;
  }, [allEpisodes, episodeId]);

  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisode || !animeSlug) return;
    const isFs = !!document.fullscreenElement;
    if (isFs && playerWrapperRef.current) {
      // Synchronously transfer fullscreen to the persistent wrapper before
      // KittyPlayer (the current fullscreen element) unmounts. This keeps
      // the user in fullscreen through the episode transition.
      playerWrapperRef.current.requestFullscreen().catch(() => {});
    }
    setAutoFullscreen(isFs);
    setSelectedEpisode(nextEpisode.episodeId);
    if (w2g.isHost && w2gCode) {
      w2g.syncEpisode(
        nextEpisode.episodeId,
        nextEpisode.number,
        Math.floor(liveTimeRef.current),
        true,
      );
    }
    router.push(
      `/anime/watch?anime=${animeSlug}&episode=${nextEpisode.episodeId}${w2gCode ? `&w2g=${w2gCode}` : ""}`,
    );
  }, [nextEpisode, animeSlug, setSelectedEpisode, router, w2g, w2gCode]);

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
    if (animeSlug && episodeId && t > 5 && dur > 0) {
      useProgressStore.getState().setProgress(animeSlug, episodeId, t, dur);
    }
  }, [animeSlug, episodeId]);

  // Save on pauses as well as on the 10s interval
  const handleProgress = useCallback((current: number, duration: number) => {
    saveProgress(current, duration);
  }, [saveProgress]);

  // Credits started → mark episode as fully watched
  const handleOutroStart = useCallback((duration: number) => {
    saveProgress(duration, duration);
  }, [saveProgress]);

  // Video ended → also mark as fully watched (covers episodes with no AniSkip data)
  const handleEnded = useCallback(() => {
    const dur = liveDurationRef.current;
    if (dur > 0) saveProgress(dur, dur);
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
    <div className="flex flex-col gap-3">
    <div className="flex flex-col rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60 bg-black">
      {/* Persistent wrapper — fullscreen is held here during episode transitions */}
      <div ref={playerWrapperRef} className="contents">
      <KittyPlayer
        key={`${anilistId}-${episodeNo}-${audio}-${provider}`}
        src={streamData.file}
        poster={anime?.anime?.info?.poster}
        tracks={streamData.tracks ?? []}
        headers={streamData.headers ?? {}}
        skipTimes={skipTimes}
        startTime={
          w2gCode && w2g.isMember && !w2g.isHost && w2g.syncState
            ? w2g.syncState.currentTime
            : startTime
        }
        autoFullscreen={autoFullscreen}
        nextEpisode={nextEpisode ? { id: nextEpisode.episodeId, number: nextEpisode.number, title: nextEpisode.title } : undefined}
        onStart={handleStart}
        onProgress={handleProgress}
        onLiveTime={handleLiveTime}
        onNextEpisode={handleNextEpisode}
        onOutroStart={handleOutroStart}
        onEnded={handleEnded}
        w2g={
          w2gCode && w2g.isMember
            ? {
                isHost: w2g.isHost,
                syncState: w2g.syncState,
                onPlaybackSync: w2g.onPlaybackSync,
              }
            : undefined
        }
      />
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#0a0a0a] border-t border-white/8">

        {/* Left — episode info */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          {episodeNo && (
            <span className="text-[11px] font-bold font-mono text-white/50 bg-white/6 border border-white/10 px-2 py-0.5 rounded-md shrink-0">
              EP {episodeNo}
            </span>
          )}
          {currentEpisodeInfo?.title &&
            currentEpisodeInfo.title.toLowerCase() !== `episode ${episodeNo}` && (
              <span className="text-[12px] font-medium text-white/55 truncate hidden sm:block">
                {currentEpisodeInfo.title}
              </span>
            )}
          {(skipTimes?.intro || skipTimes?.outro) && (
            <span className="text-[10px] font-mono text-white/20 hidden lg:inline shrink-0">
              · chapters
            </span>
          )}
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

        {/* Watch Together */}
        {w2gCode && w2g.isMember ? (
          <span className="text-[10px] font-mono text-violet-300/70 hidden sm:inline">
            Room {w2gCode}
          </span>
        ) : auth ? (
          <button
            type="button"
            onClick={handleCreateW2g}
            disabled={creatingW2g}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 transition-colors disabled:opacity-50"
          >
            {creatingW2g ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Users className="w-3 h-3" />
            )}
            Watch Together
          </button>
        ) : (
          <LoginPopoverButton
            customTrigger={
              <button
                type="button"
                className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-[11px] font-bold border border-white/12 text-white/45 hover:text-white/70 transition-colors"
              >
                <Users className="w-3 h-3" /> Watch Together
              </button>
            }
          />
        )}
      </div>
    </div>

    {w2gCode && w2g.isMember && (
      <W2gPanel
        code={w2gCode}
        isHost={w2g.isHost}
        members={w2g.members}
        messages={w2g.messages}
        loading={w2g.loading}
        onSendMessage={w2g.sendMessage}
        onLeave={handleLeaveW2g}
      />
    )}
    </div>
  );
};

const PlayerSkeleton = ({ dim = false }: { dim?: boolean }) => (
  <div
    className={`relative w-full aspect-video rounded-xl bg-[#030303] border border-white/[0.08] flex flex-col items-center justify-center gap-3 overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] ${dim ? "opacity-40" : ""}`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.08),transparent_60%)] pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
    <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 pointer-events-none">
      <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-600/40 to-violet-400/40 animate-pulse" />
      </div>
      <div className="flex justify-between">
        <div className="h-2 w-16 rounded bg-white/[0.05] animate-pulse" />
        <div className="h-2 w-10 rounded bg-white/[0.05] animate-pulse" />
      </div>
    </div>
    <Loader2 className="w-7 h-7 text-violet-400/50 animate-spin relative z-10" />
    <p className="text-white/30 text-[11px] font-medium tracking-widest uppercase animate-pulse relative z-10">Loading stream</p>
  </div>
);

export default VideoPlayerSection;
