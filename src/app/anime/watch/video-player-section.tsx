"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  MIRURO_PIPE_PROVIDERS,
  type MiruroPipeProviderId,
} from "@/lib/miruro-api";
import { isSubtitleTrack } from "@/lib/subtitle-track-utils";
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
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import WatchDownloadPanel from "@/components/watch-download-panel";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SubtitleSettingsPanel from "@/components/subtitle-settings-panel";
import { toast } from "sonner";
import { useW2g } from "@/hooks/use-w2g";
import W2gPanel from "@/components/w2g/w2g-panel";
import LoginPopoverButton from "@/components/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import { isAnime4KSupported } from "@/hooks/use-anime4k-upscaler";
import type { Anime4KMode } from "@/store/settings-store";

const KittyPlayer = dynamic(() => import("@/components/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

const DEFAULT_PROVIDER: KittyProvider = "Miruro";

const VideoPlayerSection = () => {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("episode");
  const w2gCode = searchParams.get("w2g");
  const { selectedEpisode, anime, setSelectedEpisode } = useAnimeStore();

  const { preferDub, setPreferDub, anime4kEnabled, setAnime4kEnabled, anime4kMode, setAnime4kMode } =
    useSettingsStore();

  const [provider, setProvider] = useState<KittyProvider>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyProvider");
      if (saved && KITTY_PROVIDERS.includes(saved as KittyProvider))
        return saved as KittyProvider;
    }
    return DEFAULT_PROVIDER;
  });

  const [miruroPipe, setMiruroPipe] = useState<MiruroPipeProviderId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("miruroPipe");
      if (saved && MIRURO_PIPE_PROVIDERS.some((p) => p.id === saved)) {
        return saved as MiruroPipeProviderId;
      }
    }
    return DEFAULT_MIRURO_PIPE_PROVIDER;
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
      toast.error(t("watch.w2gSignIn"));
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
      toast.success(t("watch.w2gRoomCreated", { code: room.code }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("watch.w2gCreateFailed"));
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
      useProgressStore.getState().flush();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [saveProgress]);

  const {
    data: streamData,
    isLoading,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(
    anilistId,
    episodeNo || undefined,
    audio,
    provider,
    provider === "Miruro" ? miruroPipe : null,
  );

  const loadingThumbnail =
    currentEpisodeInfo?.image ?? anime?.anime?.info?.poster ?? null;

  const { data: aniSkipTimes } = useSkipTimes(
    streamData?.tracks,
    streamData?.file,
    streamData?.headers?.Referer ?? streamData?.headers?.referer ?? "",
    malId,
    anilistId,
    parseInt(episodeNo) || undefined,
  );

  const skipTimes = useMemo(() => {
    const fromMiruro = streamData?.skipTimes;
    if (fromMiruro?.intro || fromMiruro?.outro) {
      return {
        intro: fromMiruro.intro ?? aniSkipTimes?.intro,
        outro: fromMiruro.outro ?? aniSkipTimes?.outro,
      };
    }
    return aniSkipTimes;
  }, [streamData?.skipTimes, aniSkipTimes]);

  // Change provider but resume from current position, not original start
  const handleProviderChange = (p: KittyProvider) => {
    const t = liveTimeRef.current;
    if (t > 5) setStartTime(t);
    setProvider(p);
    localStorage.setItem("kittyProvider", p);
  };

  const handleMiruroPipeChange = (pipe: MiruroPipeProviderId) => {
    const t = liveTimeRef.current;
    if (t > 5) setStartTime(t);
    setMiruroPipe(pipe);
    localStorage.setItem("miruroPipe", pipe);
  };

  // Change audio track and resume from current position
  const handleAudioChange = (dub: boolean) => {
    const t = liveTimeRef.current;
    if (t > 5) setStartTime(t);
    setPreferDub(dub);
  };

  const handleAnime4kToggle = () => {
    if (!anime4kEnabled && !isAnime4KSupported()) {
      toast.error(t("watch.anime4kUnsupported"));
      return;
    }
    setAnime4kEnabled(!anime4kEnabled);
  };

  if (!episodeId && !selectedEpisode) {
    return (
      <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10">
        <Cat className="text-white/20 w-12 h-12" />
        <p className="text-white/30 text-sm font-mono">{t("watch.selectEpisode")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <PlayerSkeleton
        label={t("watch.loadingStream")}
        thumbnail={loadingThumbnail}
      />
    );
  }

  const upstreamError = (streamError as any)?.response?.data?.error as string | undefined;

  const subtitleTracks = (streamData?.tracks ?? []).filter(isSubtitleTrack);

  if (streamError || !streamData?.file) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton dim label={t("watch.loadingStream")} thumbnail={loadingThumbnail} />
        <Alert className="border-white/10 bg-white/5 rounded-xl">
          <AlertCircle className="h-4 w-4 text-white/60" />
          <AlertTitle className="text-white/80 font-semibold">
            {t("watch.streamUnavailable", { provider })}
          </AlertTitle>
          <AlertDescription className="text-white/40 text-xs mt-1">
            {upstreamError ?? streamData?.error ?? t("watch.streamNotFound")}
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
          {t("watch.retryWith", { provider })}
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
        key={`${anilistId}-${episodeNo}-${audio}-${provider}-${miruroPipe}`}
        src={streamData.file}
        poster={currentEpisodeInfo?.image ?? anime?.anime?.info?.poster}
        tracks={streamData.tracks ?? []}
        headers={streamData.headers ?? {}}
        preferSubtitles={!preferDub || subtitleTracks.length > 0}
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
      <div className="px-3 py-3 bg-gradient-to-b from-[#0a0a0a] to-[#070707] border-t border-white/8 space-y-2.5">
        {/* Row 1 — stream source */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-auto min-w-0">
            <Server className="w-3.5 h-3.5 text-violet-400/50 shrink-0" />
            <Select value={provider} onValueChange={(v) => handleProviderChange(v as KittyProvider)}>
              <SelectTrigger className="h-8 w-[min(100%,130px)] text-[11px] font-mono bg-white/[0.04] border-white/12 text-white/70 hover:bg-white/[0.07]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0e0e0e] border-white/10">
                <SelectGroup>
                  {KITTY_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p} className="text-xs font-mono text-white/75">
                      {p}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {provider === "Miruro" && (
              <Select value={miruroPipe} onValueChange={(v) => handleMiruroPipeChange(v as MiruroPipeProviderId)}>
                <SelectTrigger className="h-8 w-[min(100%,120px)] text-[11px] font-mono bg-violet-500/[0.08] border-violet-500/25 text-violet-200/80 hover:bg-violet-500/[0.12]">
                  <SelectValue placeholder={t("watch.miruroPipe")} />
                </SelectTrigger>
                <SelectContent className="bg-[#0e0e0e] border-violet-500/20">
                  <SelectGroup>
                    {MIRURO_PIPE_PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs font-mono text-white/75">
                        {p.label}{p.native ? "" : " (embed)"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center rounded-lg overflow-hidden border border-white/12 bg-white/[0.03] shrink-0">
            <button
              className={`flex items-center gap-1 h-8 px-3 text-[11px] font-bold transition-all ${
                !preferDub
                  ? "bg-white text-black"
                  : "text-white/35 hover:text-white/60 hover:bg-white/6"
              }`}
              onClick={() => handleAudioChange(false)}
            >
              <Captions className="w-3 h-3" /> {t("card.sub")}
            </button>
            <div className="w-px h-4 bg-white/12" />
            <button
              className={`flex items-center gap-1 h-8 px-3 text-[11px] font-bold transition-all ${
                preferDub
                  ? "bg-white text-black"
                  : "text-white/35 hover:text-white/60 hover:bg-white/6"
              }`}
              onClick={() => handleAudioChange(true)}
            >
              <Mic className="w-3 h-3" /> {t("card.dub")}
            </button>
          </div>
        </div>

        {/* Row 2 — badges + actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 mr-auto min-w-0">
            {(skipTimes?.intro || skipTimes?.outro) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/10 text-white/35">
                {t("watch.chapters")}
              </span>
            )}
            {streamData?.miruroPipe && provider === "Miruro" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300/70">
                {streamData.miruroPipe}
              </span>
            )}
            {subtitleTracks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 max-w-full">
                {subtitleTracks.slice(0, 3).map((track, i) => (
                  <span
                    key={`${track.label ?? "sub"}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300/80 truncate max-w-[120px]"
                    title={track.label}
                  >
                    <Captions className="w-2.5 h-2.5 shrink-0" />
                    {track.label}
                  </span>
                ))}
                {subtitleTracks.length > 3 && (
                  <span className="text-[10px] font-mono text-white/25">
                    +{subtitleTracks.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            {anilistId && episodeNo && allEpisodes?.episodes && (
              <WatchDownloadPanel
                anilistId={anilistId}
                currentEpisodeNumber={parseInt(episodeNo, 10)}
                episodes={allEpisodes.episodes}
                audio={audio}
                provider={provider}
              />
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleAnime4kToggle}
                title={t("watch.anime4kHint")}
                className={`flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                  anime4kEnabled
                    ? "border-fuchsia-500/40 bg-fuchsia-500/20 text-fuchsia-200"
                    : "border-white/12 bg-white/[0.03] text-white/45 hover:text-white/70 hover:bg-white/6"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span className="hidden sm:inline">{t("watch.anime4k")}</span>
              </button>

              {anime4kEnabled && (
                <Select
                  value={anime4kMode}
                  onValueChange={(v) => setAnime4kMode(v as Anime4KMode)}
                >
                  <SelectTrigger className="h-8 w-[52px] text-[10px] font-mono px-2 bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-200/90">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0e0e0e] border-fuchsia-500/20">
                    <SelectGroup>
                      {(["A", "B", "C"] as const).map((mode) => (
                        <SelectItem
                          key={mode}
                          value={mode}
                          className="text-xs font-mono text-white/75"
                        >
                          {t("watch.anime4kMode", { mode })}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-teal-500/20 bg-teal-500/[0.08] text-teal-200/80 hover:bg-teal-500/[0.12] transition-colors"
                  title={t("watch.subtitleSettings")}
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  <span className="hidden sm:inline">{t("watch.subtitleSettings")}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(92vw,360px)] p-4 bg-[#0c0c0c] border-white/10"
              >
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-4">
                  {t("settings.subtitleAppearance")}
                </p>
                <SubtitleSettingsPanel compact />
              </PopoverContent>
            </Popover>

            {w2gCode && w2g.isMember ? (
              <span className="inline-flex items-center h-8 px-2.5 rounded-lg text-[10px] font-mono bg-violet-500/10 border border-violet-500/25 text-violet-300/80">
                {t("watch.room", { code: w2gCode })}
              </span>
            ) : auth ? (
              <button
                type="button"
                onClick={handleCreateW2g}
                disabled={creatingW2g}
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-violet-500/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15 transition-colors disabled:opacity-50"
              >
                {creatingW2g ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Users className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{t("watch.watchTogether")}</span>
              </button>
            ) : (
              <LoginPopoverButton
                customTrigger={
                  <button
                    type="button"
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-white/12 text-white/45 hover:text-white/70 transition-colors"
                  >
                    <Users className="w-3 h-3" />
                    <span className="hidden sm:inline">{t("watch.watchTogether")}</span>
                  </button>
                }
              />
            )}
          </div>
        </div>
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

const PlayerSkeleton = ({
  dim = false,
  label = "Loading stream",
  thumbnail,
}: {
  dim?: boolean;
  label?: string;
  thumbnail?: string | null;
}) => (
  <div
    className={`relative w-full aspect-video rounded-xl bg-[#030303] border border-white/[0.08] flex flex-col items-center justify-center gap-3 overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] ${dim ? "opacity-40" : ""}`}
  >
    {thumbnail && (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/65" />
      </>
    )}
    {!thumbnail && (
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.08),transparent_60%)] pointer-events-none" />
    )}
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
    <p className="text-white/30 text-[11px] font-medium tracking-widest uppercase animate-pulse relative z-10">{label}</p>
  </div>
);

export default VideoPlayerSection;
