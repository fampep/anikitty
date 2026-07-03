"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Artplayer from "artplayer";
import { useAnimeStore } from "@/store/anime-store";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { useProgressStore } from "@/store/progress-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import dynamic from "next/dynamic";
import {
  useGetKittyStream,
  buildKittyStreamQueryKey,
  isKittyStreamAbortError,
  type KittyProvider,
  type KittyTrack,
} from "@/query/stream/get-kitty-stream";
import { normalizeKittyProvider, MULTI_ROW_PROVIDERS, providerHasNativeSubs, type ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import {
  DEFAULT_ANIMEX_SERVER,
  defaultAnimexServerForMode,
  animexServerUsesInPlayerAudioSwitch,
  isAnimexServerId,
  type AnimexServerId,
} from "@/lib/providers/animex-api";
import {
  DEFAULT_ANISNATCH_SERVER,
  defaultAnisnatchServerForMode,
  isAnisnatchServerId,
  type AnisnatchServerId,
} from "@/lib/providers/anisnatch-api";
import {
  DEFAULT_LUNAR_SERVER,
  defaultLunarServerForMode,
  isLunarServerId,
  type LunarServerId,
} from "@/lib/providers/lunar-api";
import {
  DEFAULT_ALLANIME_MIRROR,
  DEFAULT_MKISSA_MIRROR,
  defaultAllanimeMirrorForMode,
  isAllanimeMirrorId,
  type AllanimeMirrorId,
} from "@/lib/providers/allanime-api";
import {
  DEFAULT_ANIMO_SERVER,
  isAnimoServerId,
  type AnimoServerId,
} from "@/lib/providers/animo-api";
import { ProviderQuickPick, type MultiPanelProvider } from "@/components/player/provider-select";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  MIRURO_PIPE_PROVIDERS,
  type MiruroPipeProviderId,
} from "@/lib/providers/miruro-api";
import { isSubtitleTrack } from "@/lib/subtitles/subtitle-track-utils";

import { useSkipTimes } from "@/hooks/use-aniskip";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import {
  Captions,
  Loader2,
  Cat,
  Users,
  Link2,
} from "lucide-react";
import WatchDownloadPanel from "@/components/watch/watch-download-panel";
import PlayerSettingsBar from "@/components/watch/player-settings-bar";
import WatchEpisodeBar from "@/components/watch/watch-episode-bar";
import WatchResumePrompt from "@/components/watch/watch-resume-prompt";
import WatchKeyboardHelp from "@/components/watch/watch-keyboard-help";
import WatchSimpleProviderRow from "@/components/watch/watch-simple-provider-row";
import { useWatchKeyboard } from "@/hooks/use-watch-keyboard";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import { getNextFallbackProvider } from "@/lib/kitty/provider-fallback";
import type { Episode } from "@/types/episodes";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useW2g } from "@/hooks/use-w2g";
import W2gPanel from "@/components/watch-together/w2g-panel";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import LoadingGirl from "@/components/common/loading-girl";
import WatchErrorPanel from "@/components/watch/watch-error-panel";

const KittyPlayer = dynamic(() => import("@/components/player/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

const DEFAULT_PROVIDER: KittyProvider = "Miruro";
const EMPTY_PLAYER_TRACKS: KittyTrack[] = [];
const EMPTY_PLAYER_HEADERS: Record<string, string> = {};

function parseResumeTimeParam(raw: string | null): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

const VideoPlayerSection = () => {
  const t = useT();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const searchParams = useSearchParams();
  const router = useRouter();
  const episodeId = searchParams.get("episode");
  const w2gCode = searchParams.get("w2g");
  const dubSearchParam = searchParams.get("dub");
  const timeFromUrl = searchParams.get("t");
  const searchParamsKey = searchParams.toString();
  const { selectedEpisode, anime, setSelectedEpisode } = useAnimeStore();

  const { preferDub, setPreferDub, showPlayerControls, providerAutoFallback, simpleProviderPicker, theatreMode, setTheatreMode } = useSettingsStore();
  const compactProviderPicker = simpleProviderPicker;

  const [audioMode, setAudioMode] = useState<ProviderAudioMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyAudioMode");
      if (
        saved === "multi" ||
        saved === "hardsub" ||
        saved === "dub" ||
        saved === "sub"
      ) {
        return saved;
      }
    }
    return "sub";
  });

  const [streamAudio, setStreamAudio] = useState<"sub" | "dub">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyStreamAudio");
      if (saved === "sub" || saved === "dub") return saved;
      const savedMode = localStorage.getItem("kittyAudioMode");
      if (savedMode === "dub") return "dub";
    }
    return "sub";
  });

  useEffect(() => {
    if (dubSearchParam !== "1" && dubSearchParam !== "true") return;
    setStreamAudio((prev) => (prev === "dub" ? prev : "dub"));
    setAudioMode((mode) => (mode === "multi" ? mode : "dub"));
  }, [dubSearchParam]);

  const syncDubSearchParam = useCallback(
    (dub: boolean) => {
      const params = new URLSearchParams(searchParamsKey);
      const hasDub = params.get("dub") === "1" || params.get("dub") === "true";
      if (dub === hasDub) return;
      if (dub) params.set("dub", "1");
      else params.delete("dub");
      router.replace(`/anime/watch?${params.toString()}`, { scroll: false });
    },
    [router, searchParamsKey],
  );

  useEffect(() => {
    setPreferDub(streamAudio === "dub");
  }, [streamAudio, setPreferDub]);

  const [provider, setProvider] = useState<KittyProvider>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyProvider");
      return normalizeKittyProvider(saved);
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

  const [animexServer, setAnimexServer] = useState<AnimexServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("animexServer");
      if (saved && isAnimexServerId(saved)) return saved;
    }
    return DEFAULT_ANIMEX_SERVER;
  });

  const [anisnatchServer, setAnisnatchServer] = useState<AnisnatchServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("anisnatchServer");
      if (saved && isAnisnatchServerId(saved)) return saved;
    }
    return DEFAULT_ANISNATCH_SERVER;
  });

  const [lunarServer, setLunarServer] = useState<LunarServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("lunarServer");
      if (saved && isLunarServerId(saved)) return saved;
    }
    return DEFAULT_LUNAR_SERVER;
  });

  const [allanimeMirror, setAllanimeMirror] = useState<AllanimeMirrorId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("allanimeMirror");
      if (saved && isAllanimeMirrorId(saved)) return saved;
    }
    return DEFAULT_ALLANIME_MIRROR;
  });

  const [mkissaMirror, setMkissaMirror] = useState<AllanimeMirrorId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("mkissaMirror");
      if (saved && isAllanimeMirrorId(saved)) return saved;
    }
    return DEFAULT_MKISSA_MIRROR;
  });

  const [animoServer, setAnimoServer] = useState<AnimoServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("animoServer");
      if (saved && isAnimoServerId(saved)) return saved;
    }
    return DEFAULT_ANIMO_SERVER;
  });

  const [multiPanel, setMultiPanel] = useState<MultiPanelProvider | null>(() => {
    if (typeof window !== "undefined") {
      const savedProvider = localStorage.getItem("kittyProvider");
      const savedMode = localStorage.getItem("kittyAudioMode");
      if (
        savedMode === "multi" &&
        savedProvider &&
        MULTI_ROW_PROVIDERS.has(savedProvider as KittyProvider)
      ) {
        return savedProvider as MultiPanelProvider;
      }
    }
    return null;
  });

  useEffect(() => {
    if (!MULTI_ROW_PROVIDERS.has(provider) || audioMode === "multi") return;
    setAudioMode("multi");
    localStorage.setItem("kittyAudioMode", "multi");
  }, [provider, audioMode]);

  const animeSlug = anime?.anime?.info?.id ?? null;
  const anilistId = anime?.anime?.info?.anilistId;
  const malId = anime?.anime?.info?.malId;
  const animeTitle = anime?.anime?.info?.name || undefined;

  // Episode list for next-episode navigation (also resolves episode number for stream API)
  const { data: allEpisodes } = useGetAllEpisodes(animeSlug ?? "");
  const currentEpisodeInfo = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    return allEpisodes.episodes.find((e) => e.episodeId === episodeId);
  }, [allEpisodes, episodeId]);

  const episodeNo = useMemo(() => {
    if (currentEpisodeInfo?.number != null) return String(currentEpisodeInfo.number);
    if (episodeId?.startsWith("ep-")) return episodeId.replace("ep-", "");
    if (episodeId && /^\d+$/.test(episodeId)) return episodeId;
    if (selectedEpisode?.startsWith("ep-")) return selectedEpisode.replace("ep-", "");
    return selectedEpisode ?? "";
  }, [currentEpisodeInfo?.number, episodeId, selectedEpisode]);

  const usesInPlayerHlsAudioSwitch = useMemo(
    () =>
      audioMode === "multi" &&
      provider === "Animex" &&
      animexServer != null &&
      animexServerUsesInPlayerAudioSwitch(animexServer),
    [audioMode, provider, animexServer],
  );

  const streamQueryAudio: "sub" | "dub" = usesInPlayerHlsAudioSwitch ? "sub" : streamAudio;

  // ── Resume position ──────────────────────────────────────────────
  const [savedResumeTime, setSavedResumeTime] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);
  const [resumeChoice, setResumeChoice] = useState<"resume" | "start" | null>(null);
  const resumeReadyRef = useRef(false);
  const [artPlayer, setArtPlayer] = useState<Artplayer | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const triedProvidersRef = useRef(new Set<KittyProvider>());
  const fallbackBusyRef = useRef(false);
  const [playbackToken, setPlaybackToken] = useState(0);

  // Live position tracking — updated every timeupdate event (no re-render)
  const liveTimeRef = useRef(0);
  const liveDurationRef = useRef(0);

  // ── Progress tracking ────────────────────────────────────────────
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({ populate: false });
  const bookmarkIdRef = useRef<string | null>(null);
  const watchedIdRef  = useRef<string | null>(null);

  const w2g = useW2g({
    code: w2gCode,
    animeId: animeSlug,
    episodeId,
    provider,
    audio: streamAudio,
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

  // Episode list moved above for episodeNo resolution
  const prevEpisode = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    const idx = allEpisodes.episodes.findIndex((e) => e.episodeId === episodeId);
    return idx > 0 ? allEpisodes.episodes[idx - 1] : undefined;
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
  const watchedEpisodes = useEpisodeProgress(animeSlug);

  const navigateToEpisode = useCallback(
    (ep: Episode) => {
      if (!animeSlug) return;
      const isFs = !!document.fullscreenElement;
      if (isFs && playerWrapperRef.current) {
        playerWrapperRef.current.requestFullscreen().catch(() => {});
      }
      setAutoFullscreen(isFs);
      setResumeChoice(null);
      setSelectedEpisode(ep.episodeId);
      if (w2g.isHost && w2gCode) {
        w2g.syncEpisode(
          ep.episodeId,
          ep.number,
          Math.floor(liveTimeRef.current),
          true,
        );
      }
      router.push(
        `/anime/watch?anime=${animeSlug}&episode=${ep.episodeId}${w2gCode ? `&w2g=${w2gCode}` : ""}`,
      );
    },
    [animeSlug, setSelectedEpisode, router, w2g, w2gCode],
  );

  const handlePrevEpisode = useCallback(() => {
    if (prevEpisode) navigateToEpisode(prevEpisode);
  }, [prevEpisode, navigateToEpisode]);

  const handleNextEpisode = useCallback(() => {
    if (nextEpisode) navigateToEpisode(nextEpisode);
  }, [nextEpisode, navigateToEpisode]);

  // Reset refs when episode changes so we don't cross-contaminate
  useEffect(() => {
    bookmarkIdRef.current = null;
    watchedIdRef.current = null;
    liveTimeRef.current = 0;
    liveDurationRef.current = 0;
    setResumeChoice(null);
    setResumeReady(false);
    setArtPlayer(null);
    triedProvidersRef.current.clear();
    fallbackBusyRef.current = false;
    setPlaybackToken(0);
  }, [episodeId]);

  // Fetch saved resume position when the episode changes
  useEffect(() => {
    if (!animeSlug || !episodeId) {
      setResumeReady(true);
      resumeReadyRef.current = true;
      return;
    }

    let cancelled = false;
    const urlTime = parseResumeTimeParam(timeFromUrl);
    const cached = useProgressStore.getState().getProgress(animeSlug, episodeId);
    const localTime = Math.max(urlTime, cached?.current ?? 0);

    if (localTime > 10) {
      setSavedResumeTime(localTime);
      setResumeReady(true);
      resumeReadyRef.current = true;

      if (auth) {
        void anisurgeContinue
          .getEpisode(animeSlug, episodeId)
          .then((r: { currentTime?: number; duration?: number }) => {
            if (cancelled) return;
            const saved = r?.currentTime ?? 0;
            const dur = r?.duration ?? 0;
            if (saved > 10 && (dur <= 0 || saved < dur - 30)) {
              setSavedResumeTime((prev) => Math.max(prev, saved));
            }
          })
          .catch(() => {});
      }
      return () => {
        cancelled = true;
      };
    }

    setResumeReady(false);
    resumeReadyRef.current = false;

    const finish = () => {
      if (cancelled) return;
      setResumeReady(true);
      resumeReadyRef.current = true;
    };

    const safety = window.setTimeout(finish, 3000);

    if (!auth) {
      finish();
      return () => {
        cancelled = true;
        window.clearTimeout(safety);
      };
    }

    void anisurgeContinue
      .getEpisode(animeSlug, episodeId)
      .then((r: { currentTime?: number; duration?: number }) => {
        if (cancelled) return;
        const saved = r?.currentTime ?? 0;
        const dur = r?.duration ?? 0;
        if (saved > 10 && (dur <= 0 || saved < dur - 30)) {
          setSavedResumeTime(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(safety);
        finish();
      });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
    };
  }, [auth, animeSlug, episodeId, timeFromUrl]);

  const urlResumeTime = parseResumeTimeParam(timeFromUrl);
  const isW2gGuest = Boolean(w2gCode && w2g.isMember && !w2g.isHost);
  const needsResumePrompt =
    resumeReady &&
    savedResumeTime > 10 &&
    urlResumeTime <= 0 &&
    resumeChoice === null &&
    !isW2gGuest;

  const playerStartTime =
    resumeChoice === "start"
      ? 0
      : resumeChoice === "resume" || urlResumeTime > 0
        ? Math.max(savedResumeTime, urlResumeTime)
        : needsResumePrompt
          ? 0
          : savedResumeTime;

  const handleStart = useCallback(async () => {
    if (!auth || !anime?.anime?.info) return;
    const { id: slug, name, poster } = anime.anime.info;
    // Add to watchlist silently — doesn't gate progress saving
    createOrUpdateBookMark(slug, name, poster, "watching", false)
      .then((bId) => { bookmarkIdRef.current = bId; })
      .catch(() => {});
  }, [auth, anime, createOrUpdateBookMark]);

  // Save progress directly — watchlist entry is not required (episode-level, not per provider)
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
        language: streamAudio,
        server: provider,
      },
    );
  }, [auth, episodeId, episodeNo, streamAudio, provider, animeSlug, syncWatchProgress]);

  const getEpisodeResumeTime = useCallback(() => {
    const stored =
      animeSlug && episodeId
        ? useProgressStore.getState().getProgress(animeSlug, episodeId)?.current ?? 0
        : 0;
    return Math.max(liveTimeRef.current, stored);
  }, [animeSlug, episodeId]);

  const commitResumeForSourceSwitch = useCallback(() => {
    const current = getEpisodeResumeTime();
    const dur = liveDurationRef.current;
    if (current <= 5) return;

    setSavedResumeTime(current);
    setResumeChoice("resume");
    setPlaybackToken((n) => n + 1);

    if (animeSlug && episodeId) {
      useProgressStore.getState().setProgress(
        animeSlug,
        episodeId,
        current,
        dur > 0 ? dur : current,
      );
      useProgressStore.getState().flush();
    }
    if (dur > 0) void saveProgress(current, dur);
  }, [animeSlug, episodeId, getEpisodeResumeTime, saveProgress]);

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

  const preservePlaybackPosition = useCallback(() => {
    void queryClient.cancelQueries(
      buildKittyStreamQueryKey(
        anilistId,
        episodeNo || undefined,
        streamQueryAudio,
        provider,
        provider === "Miruro" ? miruroPipe : null,
        animeTitle,
        provider === "Animex" ? animexServer : null,
        provider === "AniSnatch" ? anisnatchServer : null,
        provider === "Lunar" ? lunarServer : null,
        provider === "AllAnime" ? allanimeMirror : null,
        provider === "MKissa" ? mkissaMirror : null,
        provider === "Animo" ? animoServer : null,
      ),
    );
    fallbackBusyRef.current = false;
    commitResumeForSourceSwitch();
  }, [
    commitResumeForSourceSwitch,
    queryClient,
    anilistId,
    episodeNo,
    streamQueryAudio,
    provider,
    miruroPipe,
    animeTitle,
    animexServer,
    anisnatchServer,
    lunarServer,
    allanimeMirror,
    mkissaMirror,
    animoServer,
  ]);

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
    isFetching,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(
    anilistId,
    episodeNo || undefined,
    streamQueryAudio,
    provider,
    provider === "Miruro" ? miruroPipe : null,
    animeTitle,
    provider === "Animex" ? animexServer : null,
    provider === "AniSnatch" ? anisnatchServer : null,
    provider === "Lunar" ? lunarServer : null,
    provider === "AllAnime" ? allanimeMirror : null,
    provider === "MKissa" ? mkissaMirror : null,
    provider === "Animo" ? animoServer : null,
  );

  const streamQueryEnabled =
    !!anilistId && !!episodeNo && parseInt(episodeNo, 10) > 0;

  const hasStreamFile = Boolean(streamData?.file);
  const streamPending = streamQueryEnabled && (isLoading || isFetching);
  const streamFailed =
    streamQueryEnabled &&
    !streamPending &&
    !hasStreamFile &&
    (Boolean(streamError && !isKittyStreamAbortError(streamError)) ||
      Boolean(streamData?.error));

  useEffect(() => {
    if (!streamQueryEnabled) return;
    if (hasStreamFile) return;
    if (!streamError || !isKittyStreamAbortError(streamError)) return;
    void retryStream();
  }, [streamQueryEnabled, hasStreamFile, streamError, retryStream]);

  const playerTracks = useMemo(
    () => streamData?.tracks ?? EMPTY_PLAYER_TRACKS,
    [streamData?.tracks],
  );
  const playerHeaders = useMemo(
    () => streamData?.headers ?? EMPTY_PLAYER_HEADERS,
    [streamData?.headers],
  );
  const playerNextEpisode = useMemo(
    () =>
      nextEpisode
        ? { id: nextEpisode.episodeId, number: nextEpisode.number, title: nextEpisode.title }
        : undefined,
    [nextEpisode],
  );
  const playerW2g = useMemo(
    () =>
      w2gCode && w2g.isMember
        ? {
            isHost: w2g.isHost,
            syncState: w2g.syncState,
            onPlaybackSync: w2g.onPlaybackSync,
          }
        : undefined,
    [w2gCode, w2g.isMember, w2g.isHost, w2g.syncState, w2g.onPlaybackSync],
  );

  const playerKey = `${anilistId}-${episodeNo}-${streamData?.file ?? ""}-${provider}-${miruroPipe}-${animexServer}-${anisnatchServer}-${lunarServer}-${allanimeMirror}-${mkissaMirror}-${animoServer}-${audioMode}-${playbackToken}`;

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
  const handleProviderGridSelect = (
    p: KittyProvider,
    mode: ProviderAudioMode,
    fromFallback = false,
  ) => {
    preservePlaybackPosition();
    if (!fromFallback) {
      triedProvidersRef.current.clear();
      fallbackBusyRef.current = false;
    }
    setProvider(p);
    setAudioMode(mode);
    localStorage.setItem("kittyProvider", p);
    localStorage.setItem("kittyAudioMode", mode);
    if (mode === "dub") {
      setStreamAudio("dub");
      localStorage.setItem("kittyStreamAudio", "dub");
      syncDubSearchParam(true);
    } else if (mode !== "multi") {
      setStreamAudio("sub");
      localStorage.setItem("kittyStreamAudio", "sub");
      syncDubSearchParam(false);
    }
    if (mode !== "multi" || !MULTI_ROW_PROVIDERS.has(p)) {
      setMultiPanel(null);
    }
    if (p === "Animex") {
      const server = defaultAnimexServerForMode(mode);
      setAnimexServer(server);
      localStorage.setItem("animexServer", server);
    }
    if (p === "AniSnatch") {
      const server = defaultAnisnatchServerForMode(mode);
      setAnisnatchServer(server);
      localStorage.setItem("anisnatchServer", server);
    }
    if (p === "Lunar") {
      const server = defaultLunarServerForMode(mode);
      setLunarServer(server);
      localStorage.setItem("lunarServer", server);
    }
    if (p === "AllAnime") {
      const mirror = defaultAllanimeMirrorForMode("AllAnime", mode);
      setAllanimeMirror(mirror);
      localStorage.setItem("allanimeMirror", mirror);
    }
    if (p === "MKissa") {
      const mirror = defaultAllanimeMirrorForMode("MKissa", mode);
      setMkissaMirror(mirror);
      localStorage.setItem("mkissaMirror", mirror);
    }
    if (p === "Animo") {
      setAnimoServer(DEFAULT_ANIMO_SERVER);
      localStorage.setItem("animoServer", DEFAULT_ANIMO_SERVER);
    }
  };

  const handleMultiToggle = (panel: MultiPanelProvider | null) => {
    setMultiPanel(panel);
  };

  const handleAnimexServerChange = (server: AnimexServerId) => {
    preservePlaybackPosition();
    setProvider("Animex");
    setAudioMode("multi");
    setAnimexServer(server);
    setMultiPanel("Animex");
    localStorage.setItem("kittyProvider", "Animex");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("animexServer", server);
  };

  const handleAnisnatchServerChange = (server: AnisnatchServerId) => {
    preservePlaybackPosition();
    setProvider("AniSnatch");
    setAudioMode("multi");
    setAnisnatchServer(server);
    setMultiPanel("AniSnatch");
    localStorage.setItem("kittyProvider", "AniSnatch");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("anisnatchServer", server);
  };

  const handleLunarServerChange = (server: LunarServerId) => {
    preservePlaybackPosition();
    setProvider("Lunar");
    setAudioMode("multi");
    setLunarServer(server);
    setMultiPanel("Lunar");
    localStorage.setItem("kittyProvider", "Lunar");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("lunarServer", server);
  };

  const handleAllanimeMirrorChange = (mirror: AllanimeMirrorId) => {
    preservePlaybackPosition();
    setProvider("AllAnime");
    setAudioMode("multi");
    setAllanimeMirror(mirror);
    setMultiPanel("AllAnime");
    localStorage.setItem("kittyProvider", "AllAnime");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("allanimeMirror", mirror);
  };

  const handleMkissaMirrorChange = (mirror: AllanimeMirrorId) => {
    preservePlaybackPosition();
    setProvider("MKissa");
    setAudioMode("multi");
    setMkissaMirror(mirror);
    setMultiPanel("MKissa");
    localStorage.setItem("kittyProvider", "MKissa");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("mkissaMirror", mirror);
  };

  const handleMiruroPipeChange = (pipe: MiruroPipeProviderId) => {
    preservePlaybackPosition();
    setMiruroPipe(pipe);
    localStorage.setItem("miruroPipe", pipe);
  };

  const handleAnimoServerChange = (server: AnimoServerId) => {
    preservePlaybackPosition();
    setProvider("Animo");
    setAnimoServer(server);
    localStorage.setItem("kittyProvider", "Animo");
    localStorage.setItem("animoServer", server);
  };

  const handleSimpleProviderChange = (p: KittyProvider) => {
    const mode: ProviderAudioMode = MULTI_ROW_PROVIDERS.has(p)
      ? "multi"
      : audioMode === "multi"
        ? "sub"
        : audioMode;
    handleProviderGridSelect(p, mode);
  };

  const copyShareLink = useCallback(() => {
    const params = new URLSearchParams(searchParamsKey);
    const sec = Math.floor(liveTimeRef.current);
    if (sec > 10) params.set("t", String(sec));
    else params.delete("t");
    const url = `${window.location.origin}/anime/watch?${params.toString()}`;
    void navigator.clipboard.writeText(url).then(
      () => toast.success(t("watch.linkCopied")),
      () => toast.error(t("watch.linkCopyFailed")),
    );
  }, [searchParamsKey, t]);

  const handleToggleMobilePlaylist = useCallback(() => {
    document.getElementById("watch-mobile-playlist")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  useWatchKeyboard({
    enabled: Boolean(streamData?.file) && !needsResumePrompt,
    art: artPlayer,
    onPrevEpisode: handlePrevEpisode,
    onNextEpisode: handleNextEpisode,
    onToggleTheatre: () => setTheatreMode(!theatreMode),
    onCopyShareLink: copyShareLink,
    onShowShortcuts: () => setShortcutsOpen(true),
    hasPrev: Boolean(prevEpisode),
    hasNext: Boolean(nextEpisode),
  });

  useEffect(() => {
    if (!providerAutoFallback || !streamQueryEnabled) return;
    if (streamPending || hasStreamFile) return;
    if (!streamFailed) return;
    if (streamError && isKittyStreamAbortError(streamError)) return;
    if (fallbackBusyRef.current) return;

    const tried = triedProvidersRef.current;
    if (!tried.has(provider)) tried.add(provider);

    const next = getNextFallbackProvider(provider, tried);
    if (!next) return;

    tried.add(next);
    fallbackBusyRef.current = true;
    toast.info(t("watch.providerFallback", { from: provider, to: next }));

    const mode: ProviderAudioMode = MULTI_ROW_PROVIDERS.has(next)
      ? "multi"
      : audioMode === "multi"
        ? "sub"
        : audioMode;
    handleProviderGridSelect(next, mode, true);

    const timer = window.setTimeout(() => {
      fallbackBusyRef.current = false;
    }, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleProviderGridSelect is stable enough for fallback
  }, [
    providerAutoFallback,
    streamQueryEnabled,
    streamPending,
    hasStreamFile,
    streamFailed,
    streamError,
    provider,
    audioMode,
    t,
  ]);

  if (!episodeId && !selectedEpisode) {
    return (
      <div className="w-full aspect-video bg-[#030303] flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 ring-1 ring-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.1),transparent_60%)] pointer-events-none" />
        <Cat className="text-violet-300/30 w-12 h-12 relative z-10" />
        <div className="text-center relative z-10 px-6">
          <p className="text-white/50 text-sm font-medium">{t("watch.selectEpisode")}</p>
          <p className="text-white/25 text-[11px] font-mono mt-1.5">{t("watch.selectEpisodeHint")}</p>
        </div>
      </div>
    );
  }

  const providerControlsBlock = compactProviderPicker ? (
    <WatchSimpleProviderRow
      provider={provider}
      miruroPipe={miruroPipe}
      animexServer={animexServer}
      anisnatchServer={anisnatchServer}
      lunarServer={lunarServer}
      animoServer={animoServer}
      onProviderChange={handleSimpleProviderChange}
      onMiruroPipeChange={handleMiruroPipeChange}
      onAnimexServerChange={handleAnimexServerChange}
      onAnisnatchServerChange={handleAnisnatchServerChange}
      onLunarServerChange={handleLunarServerChange}
      onAnimoServerChange={handleAnimoServerChange}
    />
  ) : (
    <ProviderQuickPick
      value={provider}
      audioMode={audioMode}
      multiPanel={multiPanel}
      miruroPipe={miruroPipe}
      animexServer={animexServer}
      anisnatchServer={anisnatchServer}
      lunarServer={lunarServer}
      allanimeMirror={allanimeMirror}
      mkissaMirror={mkissaMirror}
      animoServer={animoServer}
      compact={isMobile}
      onSelect={handleProviderGridSelect}
      onMultiToggle={handleMultiToggle}
      onMiruroPipeChange={handleMiruroPipeChange}
      onAnimexServerChange={handleAnimexServerChange}
      onAnisnatchServerChange={handleAnisnatchServerChange}
      onLunarServerChange={handleLunarServerChange}
      onAllanimeMirrorChange={handleAllanimeMirrorChange}
      onMkissaMirrorChange={handleMkissaMirrorChange}
      onAnimoServerChange={handleAnimoServerChange}
    />
  );

  const streamProviderControls = providerControlsBlock;

  const upstreamError = (streamError as { response?: { data?: { error?: string } } })?.response?.data?.error;
  const upstreamStatus = (streamError as { response?: { status?: number } })?.response?.status;

  const isEpisodeNotFound = (message: string | null | undefined) => {
    if (!message && upstreamStatus === 404) return true;
    if (!message) return false;
    const lower = message.toLowerCase();
    return (
      upstreamStatus === 404 ||
      lower.includes("not found") ||
      lower.includes("couldn't find") ||
      lower.includes("could not find") ||
      lower.includes("no stream") ||
      lower.includes("episode not")
    );
  };

  const showStreamError = streamFailed;

  const showStreamLoading = streamQueryEnabled && !hasStreamFile && streamPending;

  if (showStreamError) {
    const rawMessage =
      upstreamError ??
      streamData?.error ??
      (streamError instanceof Error ? streamError.message : null);
    const streamFailMessage = isEpisodeNotFound(rawMessage)
      ? t("watch.episodeNotFoundOnProvider", { provider })
      : (rawMessage ?? t("watch.streamNotFound"));

    return (
      <div className="flex flex-col gap-3">
        <WatchErrorPanel
          error={new Error(streamFailMessage)}
          onRetry={() => void retryStream()}
        />

        {streamProviderControls}

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

  if (showStreamLoading) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStreamProvider", { provider })} />
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-2.5 sm:px-3 py-3 space-y-2.5">
          <p className="text-[11px] font-mono text-white/40 leading-relaxed">
            {t("watch.switchProviderWhileLoading")}
          </p>
          {streamProviderControls}
        </div>
      </div>
    );
  }

  const subtitleTracks = playerTracks.filter(isSubtitleTrack);

  if (!streamData?.file) {
    if (showStreamLoading) {
      return (
        <div className="flex flex-col gap-3">
          <PlayerSkeleton label={t("watch.loadingStreamProvider", { provider })} />
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 space-y-2.5">
            <p className="text-[11px] font-mono text-white/40 leading-relaxed">
              {t("watch.switchProviderWhileLoading")}
            </p>
            {streamProviderControls}
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <WatchErrorPanel
          error={new Error(streamData?.error ?? t("watch.streamNotFound"))}
          onRetry={() => void retryStream()}
        />
        {streamProviderControls}
      </div>
    );
  }

  if (!resumeReady) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStream")} />
        {streamProviderControls}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
    <WatchKeyboardHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

    {currentEpisodeInfo && allEpisodes && (
      <WatchEpisodeBar
        currentEpisode={currentEpisodeInfo}
        episodes={allEpisodes}
        animePoster={anime?.anime?.info?.poster}
        animeName={animeTitle}
        prevEpisode={prevEpisode ?? null}
        nextEpisode={nextEpisode ?? null}
        playlistOpen={false}
        onTogglePlaylist={handleToggleMobilePlaylist}
        onPrev={handlePrevEpisode}
        onNext={handleNextEpisode}
        watchedEpisodes={watchedEpisodes}
      />
    )}

    <div className="flex flex-col rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-black/60 bg-black">
      {/* Persistent wrapper — fullscreen is held here during episode transitions */}
      <div ref={playerWrapperRef} className="contents">
      <div className="relative w-full">
      {needsResumePrompt ? (
        <div className="relative w-full aspect-video bg-[#030303]">
          <WatchResumePrompt
            resumeAt={savedResumeTime}
            onResume={() => setResumeChoice("resume")}
            onStartOver={() => setResumeChoice("start")}
          />
        </div>
      ) : (
      <KittyPlayer
        key={playerKey}
        src={streamData.file}
        tracks={playerTracks}
        headers={playerHeaders}
        preferSubtitles={subtitleTracks.length > 0 || streamAudio !== "dub"}
        preferDubAudio={streamAudio === "dub"}
        skipTimes={skipTimes}
        startTime={
          w2gCode && w2g.isMember && !w2g.isHost && w2g.syncState
            ? w2g.syncState.currentTime
            : playerStartTime
        }
        autoFullscreen={autoFullscreen}
        nextEpisode={playerNextEpisode}
        onStart={handleStart}
        onProgress={handleProgress}
        onLiveTime={handleLiveTime}
        onNextEpisode={handleNextEpisode}
        onOutroStart={handleOutroStart}
        onEnded={handleEnded}
        onPlayerReady={setArtPlayer}
        w2g={playerW2g}
      />
      )}
      </div>
      </div>

      {/* Controls bar */}
      <div className="px-2 py-2.5 sm:px-3 sm:py-3 bg-gradient-to-b from-[#0a0a0a] to-[#070707] border-t border-white/8 space-y-2.5">
        <PlayerSettingsBar />

        {showPlayerControls && (
          <>
        {providerControlsBlock}

        {/* Row 2 — badges + actions */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:mr-auto min-w-0">
            {(skipTimes?.intro || skipTimes?.outro) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/10 text-white/70">
                {t("watch.chapters")}
              </span>
            )}
            {streamData?.miruroPipe && provider === "Miruro" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300/90">
                {streamData.miruroPipe}
              </span>
            )}
            {streamData?.server && providerHasNativeSubs(provider) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-teal-500/10 border border-teal-500/20 text-teal-300/90">
                {streamData.server}
              </span>
            )}
            {subtitleTracks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 max-w-full">
                {subtitleTracks.slice(0, 3).map((track, i) => (
                  <span
                    key={`${track.label ?? "sub"}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300/90 truncate max-w-[120px]"
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

          <div className="flex flex-wrap items-center gap-1.5 shrink-0 w-full sm:w-auto sm:justify-end">
            {anilistId && episodeNo && allEpisodes?.episodes && (
              <WatchDownloadPanel
                anilistId={anilistId}
                currentEpisodeNumber={parseInt(episodeNo, 10)}
                episodes={allEpisodes.episodes}
                audio={streamAudio}
                provider={provider}
              />
            )}

            <button
              type="button"
              onClick={copyShareLink}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-white/12 bg-white/[0.03] text-white/45 hover:text-white/70 transition-colors"
              title={t("watch.copyLink")}
            >
              <Link2 className="w-3 h-3" />
              <span className="hidden sm:inline">{t("watch.copyLink")}</span>
            </button>

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
          </>
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

const PlayerSkeleton = ({
  dim = false,
  label = "Loading stream",
}: {
  dim?: boolean;
  label?: string;
}) => (
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
    <LoadingGirl size={140} label={label} className="relative z-10" />
  </div>
);

export default VideoPlayerSection;
