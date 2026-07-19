"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlayerController } from "@/lib/player/player-controller";
import { useAnimeStore } from "@/store/anime-store";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsStore } from "@/store/settings-store";
import { useProgressStore } from "@/store/progress-store";
import { useWatchlistStore } from "@/store/watchlist-store";
import { usePlayerSeekStore } from "@/store/player-seek-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { anisurgeContinue } from "@/lib/oauth/anisurge";
import dynamic from "next/dynamic";
import {
  useGetKittyStream,
  buildKittyStreamQueryKey,
  getKittyStream,
  isKittyStreamAbortError,
  isKittyNodeFailoverError,
  type KittyProvider,
  type KittyTrack,
  type KittyStreamNodeParam,
} from "@/query/stream/get-kitty-stream";
import { normalizeKittyProvider, DEFAULT_KITTY_PROVIDER, normalizeProviderAudioMode, getKittyProviderMeta, providerHasNativeSubs, providerSupportsDub, type ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { getPreferredDefaultProvider } from "@/lib/kitty/provider-order";
import { resolveServerCodename } from "@/lib/kitty/server-display";
import { isHardSubPlayback } from "@/lib/player/hard-sub-playback";
import { ProviderQuickPick } from "@/components/player/provider-select";
import { isSubtitleTrack } from "@/lib/subtitles/subtitle-track-utils";

import { useSkipTimes, useCommunitySkipTimes, mergeSkipTimesPriority } from "@/hooks/use-aniskip";
import { useKittyNodePing } from "@/hooks/use-kitty-node-ping";
import { useGetAllEpisodes } from "@/query/anime/get-all-episodes";
import {
  findPlayableEpisode,
  isEpisodePlayable,
  lastPlayableEpisode,
  adjacentPlayableEpisode,
} from "@/lib/anime/episode-availability";
import {
  Captions,
  Loader2,
  Cat,
} from "lucide-react";
import WatchPlayerActions from "@/components/watch/watch-player-actions";
import PlayerSettingsBar from "@/components/watch/player-settings-bar";
import WatchPlayerToolbar from "@/components/watch/watch-player-toolbar";
import SkipTimesSubmitDialog from "@/components/watch/skip-times-submit-dialog";
import WatchResumePrompt from "@/components/watch/watch-resume-prompt";
import WatchKeyboardHelp from "@/components/watch/watch-keyboard-help";
import WatchSimpleProviderRow from "@/components/watch/watch-simple-provider-row";
import { useWatchKeyboard } from "@/hooks/use-watch-keyboard";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { getNextFallbackProvider } from "@/lib/kitty/provider-fallback";
import type { Episode } from "@/types/episodes";
import { useSearchParams, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useW2g } from "@/hooks/use-w2g";
import W2gPanel from "@/components/watch-together/w2g-panel";
import { useT } from "@/providers/i18n-provider";
import LoadingGirl from "@/components/common/loading-girl";
import WatchErrorPanel from "@/components/watch/watch-error-panel";
import WatchEpisodeBar from "@/components/watch/watch-episode-bar";
import { useWatchPage } from "@/components/watch/watch-page-context";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";
import { useGetStreamCapabilities } from "@/query/stream/get-stream-capabilities";
import { useWatchSwipeNav } from "@/hooks/use-watch-swipe-nav";
import { useStreamLoadingStuck } from "@/hooks/use-stream-loading-stuck";
import {
  getAnimeProviderPreference,
  saveAnimeProviderPreference,
  recordProviderOutcome,
  hasSeenAutoFallbackHint,
  markAutoFallbackHintSeen,
} from "@/lib/kitty/provider-prefs";
import { fetchAnilistSiteEpisodes } from "@/lib/kitty/anilist-site-client";
import { isAnilistSiteProvider } from "@/lib/kitty/anilist-site-providers";
import {
  getKittyApiNode,
  isKittyApiNodeId,
  KITTY_API_NODES,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";
import type { KittyStreamQuality } from "@/lib/kitty/stream-quality";
import WatchStreamInfoBar from "@/components/watch/watch-stream-info-bar";
import WatchStuckLoadingBanner from "@/components/watch/watch-stuck-loading-banner";
import WatchAutoFallbackHint from "@/components/watch/watch-auto-fallback-hint";
import WatchServerPicker from "@/components/watch/watch-server-picker";
import { getProviderAccent, PROVIDER_PANEL, providerChipClass } from "@/lib/kitty/provider-ui-styles";
import { cn } from "@/lib/core/utils";

const AniKittyPlayer = dynamic(
  () =>
    import("@/components/custom-player").then((m) => m.AniKittyPlayer),
  {
    ssr: false,
    loading: () => <PlayerSkeleton />,
  },
);

const DEFAULT_PROVIDER: KittyProvider = DEFAULT_KITTY_PROVIDER;
const EMPTY_PLAYER_TRACKS: KittyTrack[] = [];
const EMPTY_PLAYER_HEADERS: Record<string, string> = {};

function parseResumeTimeParam(raw: string | null): number {
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Ignore start-over range and positions near the end (already finished). */
function isResumableProgress(current: number, duration: number): boolean {
  if (current <= 10) return false;
  if (duration <= 0) return true;
  return current < duration - 30;
}

const VideoPlayerSection = () => {
  const t = useT();
  const watchPage = useWatchPage();
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

  const { setPreferDub, preferDub, showPlayerControls, setShowPlayerControls, setPlayerSettingsOpen, providerAutoFallback, setProviderAutoFallback, simpleProviderPicker, theatreMode, toggleTheatreMode, setTheatreMode, kittyProxyNode, setKittyProxyNode, seekStepSeconds, autoEnableSubtitles, hardSubSoftSubs, providerOrder } = useSettingsStore();
  // Lightweight health probes — used only to skip known-dead nodes on failover, not for geo/ping routing.
  const { nodes: proxyNodes } = useKittyNodePing({
    enabled: true,
    lightweight: true,
  });
  const [excludeKittyNodes, setExcludeKittyNodes] = useState<KittyApiNodeId[]>([]);
  /** `auto` races; pin to a node for HLS remints / quality stickiness on the same episode. */
  const [streamKittyNode, setStreamKittyNode] = useState<KittyStreamNodeParam>("auto");
  const compactProviderPicker = simpleProviderPicker;

  const [audioMode, setAudioMode] = useState<ProviderAudioMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyAudioMode");
      return normalizeProviderAudioMode(saved, "sub");
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

  const [provider, setProvider] = useState<KittyProvider>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyProvider");
      if (saved) return normalizeKittyProvider(saved);
      return getPreferredDefaultProvider(useSettingsStore.getState().providerOrder);
    }
    return DEFAULT_PROVIDER;
  });

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

  /** SUB/DUB stream language — also keeps preferDub and the ?dub= URL in sync. */
  const applyStreamAudio = useCallback(
    (audio: "sub" | "dub") => {
      setStreamAudio((prev) => (prev === audio ? prev : audio));
      localStorage.setItem("kittyStreamAudio", audio);
      setPreferDub(audio === "dub");
      syncDubSearchParam(audio === "dub");
    },
    [setPreferDub, syncDubSearchParam],
  );

  useEffect(() => {
    if (dubSearchParam !== "1" && dubSearchParam !== "true") return;
    setAudioMode("dub");
    applyStreamAudio("dub");
  }, [dubSearchParam, applyStreamAudio]);

  // Settings → prefer dub toggle (do not bounce back through streamAudio effects).
  useEffect(() => {
    return useSettingsStore.subscribe((state, prevState) => {
      if (state.preferDub === prevState.preferDub) return;
      const target = state.preferDub ? "dub" : "sub";
      setStreamAudio((current) => {
        if (current === target) return current;
        localStorage.setItem("kittyStreamAudio", target);
        syncDubSearchParam(target === "dub");
        return target;
      });
    });
  }, [syncDubSearchParam]);

  useEffect(() => {
    setPipSupported(typeof document !== "undefined" && "pictureInPictureEnabled" in document);
  }, []);

  const resolveProviderAudioMode = useCallback(
    (_p: KittyProvider, mode: ProviderAudioMode): ProviderAudioMode => normalizeProviderAudioMode(mode),
    [],
  );

  const animeSlug = anime?.anime?.info?.id ?? null;
  const anilistId = anime?.anime?.info?.anilistId;
  const malId = anime?.anime?.info?.malId;
  const animeTitle = anime?.anime?.info?.name || undefined;
  const animeName = anime?.anime?.info?.name;
  const animePoster = anime?.anime?.info?.poster;

  // The global anime store lags the URL while navigating between anime, so the
  // previously loaded anime is briefly still in the store. Treat the URL's
  // `anime` param as the source of truth and only fetch/play once the loaded
  // anime matches it — otherwise we'd play the previous anime's episode.
  const urlAnimeId = searchParams.get("anime");
  const animeMatchesUrl =
    animeSlug != null && urlAnimeId != null && String(animeSlug) === String(urlAnimeId);

  const episodesAnimeId = animeMatchesUrl ? (animeSlug ?? "") : (urlAnimeId ?? "");

  useEffect(() => {
    if (!anilistId) return;
    const saved = getAnimeProviderPreference(anilistId);
    if (saved) setProvider(normalizeKittyProvider(saved));
  }, [anilistId]);

  // Episode list for next-episode navigation (also resolves episode number for stream API)
  const { data: allEpisodes, isLoading: episodesLoading } = useGetAllEpisodes(episodesAnimeId);
  const watchedEpisodes = useEpisodeProgress(episodesAnimeId);
  type HeldStreamSnapshot = {
    key: string;
    file: string;
    tracks: KittyTrack[];
    headers: Record<string, string>;
    episodeId: string;
    anilistId: number;
    provider: KittyProvider;
    audio: "sub" | "dub";
    qualities?: import("@/lib/kitty/stream-quality").KittyStreamQuality[];
    skipTimes?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
    thumbnails?: string | null;
  };
  const [heldStreamSnapshot, setHeldStreamSnapshot] = useState<HeldStreamSnapshot | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const currentEpisodeInfo = React.useMemo(() => {
    if (!allEpisodes?.episodes?.length) return undefined;
    const id = episodeId ?? (selectedEpisode || null);
    if (!id) return undefined;
    return findPlayableEpisode(allEpisodes.episodes, id);
  }, [allEpisodes, episodeId, selectedEpisode]);

  const activeEpisodeId = episodeId ?? currentEpisodeInfo?.episodeId ?? null;
  const episodePlayable = Boolean(currentEpisodeInfo);

  const episodeNo = useMemo(() => {
    if (currentEpisodeInfo?.number != null) return String(currentEpisodeInfo.number);
    if (episodeId?.startsWith("ep-")) return episodeId.replace("ep-", "");
    if (episodeId && /^\d+$/.test(episodeId)) return episodeId;
    return "";
  }, [currentEpisodeInfo?.number, episodeId]);

  const streamQueryAudio: "sub" | "dub" = streamAudio;

  useEffect(() => {
    setStreamLinkId(null);
    setManualStreamFile(null);
    setManualStreamHeaders(null);
    setSiteEpisodeDataIds(null);
  }, [anilistId, episodeNo, provider, streamAudio]);

  useEffect(() => {
    if (!isAnilistSiteProvider(provider) || !anilistId || !episodeNo) return;
    let cancelled = false;
    void fetchAnilistSiteEpisodes({
      provider: provider as "MegaPlay" | "Anikoto",
      anilistId,
      audio: streamAudio,
    }).then((eps) => {
      if (cancelled) return;
      const ep = eps.find((row) => row.number === parseInt(episodeNo, 10));
      setSiteEpisodeDataIds(ep?.dataIds ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [provider, anilistId, episodeNo, streamAudio]);

  const { data: streamCaps, isFetching: capsFetching } = useGetStreamCapabilities(
    animeMatchesUrl ? anilistId : undefined,
    episodeNo || undefined,
    animeTitle,
  );

  const preferredAnimeProvider = anilistId ? getAnimeProviderPreference(anilistId) : null;

  // ── Resume position ──────────────────────────────────────────────
  const [savedResumeTime, setSavedResumeTime] = useState(0);
  const [resumeReady, setResumeReady] = useState(false);
  const [resumeChoice, setResumeChoice] = useState<"resume" | "start" | null>(null);
  const resumeReadyRef = useRef(false);
  const [playerController, setPlayerController] = useState<PlayerController | null>(null);
  const handlePlayerReady = useCallback((player: PlayerController) => {
    playerRef.current = player;
    setPlayerController(player);
  }, []);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [skipSubmitOpen, setSkipSubmitOpen] = useState(false);
  const triedProvidersRef = useRef(new Set<KittyProvider>());
  const triedKittyNodesRef = useRef(new Set<KittyApiNodeId>());
  const fallbackBusyRef = useRef(false);
  const remintAttemptedRef = useRef(false);
  const [playbackToken, setPlaybackToken] = useState(0);
  const [streamLinkId, setStreamLinkId] = useState<string | null>(null);
  const [manualStreamFile, setManualStreamFile] = useState<string | null>(null);
  const [manualStreamHeaders, setManualStreamHeaders] = useState<Record<string, string> | null>(null);
  const [siteEpisodeDataIds, setSiteEpisodeDataIds] = useState<string | null>(null);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);

  // Live position tracking — updated every timeupdate event (no re-render)
  const liveTimeRef = useRef(0);
  const liveDurationRef = useRef(0);
  const lastMediaSessionTsRef = useRef(0);
  const lastLocalProgressTsRef = useRef(0);
  /** Episode id currently playing — blocks progress writes during episode transitions. */
  const progressEpisodeIdRef = useRef<string | null>(null);

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
      const epNum = parseInt(episodeNo, 10) || 0;
      const defaultName = anime?.anime?.info?.name
        ? `${anime.anime.info.name}${epNum > 0 ? ` · EP ${epNum}` : ""}`
        : undefined;
      const room = await w2g.createRoom({
        name: defaultName,
        animeId: animeSlug,
        animeTitle: anime?.anime?.info?.name,
        animeThumbnail: anime?.anime?.info?.poster,
        episodeId,
        episodeNumber: epNum,
        currentTime: Math.floor(liveTimeRef.current),
      });
      const params = new URLSearchParams(searchParams.toString());
      params.set("w2g", room.code);
      router.replace(`/anime/watch?${params.toString()}`, { scroll: false });
      toast.success(t("watch.w2gRoomCreated", { name: room.name ?? room.code }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("watch.w2gCreateFailed"));
    } finally {
      setCreatingW2g(false);
    }
  };

  const handleLeaveW2g = async () => {
    if (w2g.isHost) {
      await w2g.deleteRoom();
      toast.success(t("watch.w2g.deletedRoom"));
    } else {
      await w2g.leave();
      toast.success(t("watch.w2g.leftRoom"));
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("w2g");
    router.replace(`/anime/watch?${params.toString()}`, { scroll: false });
  };

  // Episode list moved above for episodeNo resolution
  const prevEpisode = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    return adjacentPlayableEpisode(allEpisodes.episodes, episodeId, "prev");
  }, [allEpisodes, episodeId]);

  const nextEpisode = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    return adjacentPlayableEpisode(allEpisodes.episodes, episodeId, "next");
  }, [allEpisodes, episodeId]);

  const [autoFullscreen, setAutoFullscreen] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const navigatingRef = useRef(false);

  const navigateToEpisode = useCallback(
    (ep: Episode) => {
      if (!animeSlug || navigatingRef.current) return;
      if (ep.episodeId === episodeId) return;
      navigatingRef.current = true;
      playerRef.current?.pause?.();
      const isFs = !!document.fullscreenElement;
      if (isFs && playerWrapperRef.current) {
        playerWrapperRef.current.requestFullscreen().catch(() => {});
      }
      progressEpisodeIdRef.current = null;
      liveTimeRef.current = 0;
      setSavedResumeTime(0);
      setAutoFullscreen(isFs);
      setResumeChoice(null);
      setSelectedEpisode(ep.episodeId);
      setPlaybackToken((n) => n + 1);
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
    [animeSlug, episodeId, setSelectedEpisode, router, w2g, w2gCode],
  );

  const handlePrevEpisode = useCallback(() => {
    if (prevEpisode) navigateToEpisode(prevEpisode);
  }, [prevEpisode, navigateToEpisode]);

  const handleNextEpisode = useCallback(() => {
    if (nextEpisode) navigateToEpisode(nextEpisode);
  }, [nextEpisode, navigateToEpisode]);

  const toggleMobilePlaylist = useCallback(() => {
    watchPage?.toggleMobilePlaylist();
  }, [watchPage]);

  const getLivePreview = useCallback(() => {
    const video = playerRef.current?.video;
    if (!video || video.readyState < 2 || !video.videoWidth) return null;
    try {
      const width = Math.min(video.videoWidth, 426);
      const height = Math.round((width / video.videoWidth) * video.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, width, height);
      return canvas.toDataURL("image/jpeg", 0.65);
    } catch {
      return null;
    }
  }, []);

  const handleJumpToEpisode = useCallback(
    (episodeNumber: number) => {
      const ep = allEpisodes?.episodes.find((row) => row.number === episodeNumber);
      if (ep) navigateToEpisode(ep);
    },
    [allEpisodes?.episodes, navigateToEpisode],
  );

  const episodeBar =
    currentEpisodeInfo && allEpisodes ? (
      <WatchEpisodeBar
        currentEpisode={currentEpisodeInfo}
        episodes={allEpisodes}
        animePoster={animePoster}
        animeName={animeName ?? undefined}
        prevEpisode={prevEpisode ?? null}
        nextEpisode={nextEpisode ?? null}
        playlistOpen={watchPage?.mobilePlaylistOpen ?? false}
        onTogglePlaylist={toggleMobilePlaylist}
        onPrev={handlePrevEpisode}
        onNext={handleNextEpisode}
        onJumpToEpisode={handleJumpToEpisode}
        watchedEpisodes={watchedEpisodes}
        getLivePreview={getLivePreview}
        animeId={animeSlug ?? undefined}
        episodeDuration={liveDurationRef.current || undefined}
        theatreMode={theatreMode}
      />
    ) : null;

  // Reset refs when episode changes so we don't cross-contaminate
  useEffect(() => {
    navigatingRef.current = false;
    bookmarkIdRef.current = null;
    watchedIdRef.current = null;
    liveTimeRef.current = 0;
    liveDurationRef.current = 0;
    progressEpisodeIdRef.current = null;
    setSavedResumeTime(0);
    setResumeChoice(null);
    setResumeReady(false);
    playerRef.current?.pause?.();
    triedProvidersRef.current.clear();
    triedKittyNodesRef.current.clear();
    fallbackBusyRef.current = false;
    remintAttemptedRef.current = false;
    setHeldStreamSnapshot(null);
    setManualStreamFile(null);
    setManualStreamHeaders(null);
  }, [episodeId, urlAnimeId]);

  // Fetch saved resume position when the episode changes
  useEffect(() => {
    if (!animeSlug || !episodeId) {
      setSavedResumeTime(0);
      setResumeReady(true);
      resumeReadyRef.current = true;
      return;
    }

    let cancelled = false;
    setSavedResumeTime(0);

    const urlTime = parseResumeTimeParam(timeFromUrl);
    const cached = useProgressStore.getState().getProgress(animeSlug, episodeId);
    const localCurrent = Math.max(urlTime, cached?.current ?? 0);
    const localDuration = cached?.duration ?? 0;

    if (isResumableProgress(localCurrent, localDuration)) {
      setSavedResumeTime(localCurrent);
      setResumeReady(true);
      resumeReadyRef.current = true;

      if (auth) {
        void anisurgeContinue
          .getEpisode(animeSlug, episodeId)
          .then((r: { currentTime?: number; duration?: number }) => {
            if (cancelled) return;
            const saved = r?.currentTime ?? 0;
            const dur = r?.duration ?? 0;
            if (isResumableProgress(saved, dur)) {
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
        if (isResumableProgress(saved, dur)) {
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
    isResumableProgress(
      savedResumeTime,
      useProgressStore.getState().getProgress(animeSlug ?? "", episodeId ?? "")?.duration ??
        liveDurationRef.current,
    ) &&
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
    remintAttemptedRef.current = false;
    if (!auth || !anime?.anime?.info) return;
    const { id: slug, name, poster } = anime.anime.info;
    // Add to watchlist silently — doesn't gate progress saving
    createOrUpdateBookMark(slug, name, poster, "watching", false)
      .then((bId) => { bookmarkIdRef.current = bId; })
      .catch(() => {});
  }, [auth, anime, createOrUpdateBookMark]);

  // Save progress directly — watchlist entry is not required (episode-level, not per provider)
  const saveProgress = useCallback(async (current: number, duration: number, opts?: { keepalive?: boolean }) => {
    if (!auth || !episodeId || !episodeNo || !animeSlug) return;
    if (!current || !duration) return;
    watchedIdRef.current = await syncWatchProgress(
      animeSlug,
      watchedIdRef.current,
      {
        episodeId,
        episodeNumber: parseInt(episodeNo) || 0,
        totalEpisodes: allEpisodes?.totalEpisodes ?? undefined,
        current,
        duration,
        language: streamAudio,
        server: provider,
      },
      opts,
    );
  }, [auth, episodeId, episodeNo, streamAudio, provider, animeSlug, allEpisodes?.totalEpisodes, syncWatchProgress]);

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

    const now = Date.now();
    if (
      typeof navigator !== "undefined" &&
      "mediaSession" in navigator &&
      dur > 0 &&
      now - lastMediaSessionTsRef.current >= 5000
    ) {
      lastMediaSessionTsRef.current = now;
      try {
        navigator.mediaSession.setPositionState?.({
          duration: dur,
          position: Math.min(t, dur),
          playbackRate: 1,
        });
      } catch {
        /* invalid state during transitions */
      }
    }

    const activeEpisodeId = progressEpisodeIdRef.current;
    if (!animeSlug || !activeEpisodeId || t <= 5 || dur <= 0) return;
    if (now - lastLocalProgressTsRef.current >= 5000) {
      lastLocalProgressTsRef.current = now;
      useProgressStore.getState().setProgress(animeSlug, activeEpisodeId, t, dur);
    }
  }, [animeSlug]);

  // Save on pauses as well as on the 10s interval
  const handleProgress = useCallback((current: number, duration: number) => {
    saveProgress(current, duration);
  }, [saveProgress]);

  const preservePlaybackPosition = useCallback(() => {
    void queryClient.cancelQueries({
      queryKey: buildKittyStreamQueryKey(
        anilistId,
        episodeNo || undefined,
        streamQueryAudio,
        provider,
        animeTitle,
        streamKittyNode,
        false,
        streamLinkId,
        excludeKittyNodes,
      ),
    });
    fallbackBusyRef.current = false;
    commitResumeForSourceSwitch();
  }, [
    commitResumeForSourceSwitch,
    queryClient,
    anilistId,
    episodeNo,
    streamQueryAudio,
    provider,
    animeTitle,
    streamLinkId,
    streamKittyNode,
    excludeKittyNodes,
  ]);

  // On finishing the final episode the server moves the title to Completed —
  // refresh the watchlist so the move shows without a manual reload.
  const refreshWatchlistIfLastEpisode = useCallback(() => {
    const total = allEpisodes?.totalEpisodes ?? 0;
    const num = currentEpisodeInfo?.number ?? 0;
    if (total > 0 && num >= total) useWatchlistStore.getState().bump();
  }, [allEpisodes?.totalEpisodes, currentEpisodeInfo?.number]);

  // Credits started → mark episode as fully watched
  const handleOutroStart = useCallback((duration: number) => {
    saveProgress(duration, duration);
    refreshWatchlistIfLastEpisode();
  }, [saveProgress, refreshWatchlistIfLastEpisode]);

  // Video ended → also mark as fully watched (covers episodes with no AniSkip data)
  const handleEnded = useCallback(() => {
    const dur = liveDurationRef.current;
    if (dur > 0) saveProgress(dur, dur);
    refreshWatchlistIfLastEpisode();
  }, [saveProgress, refreshWatchlistIfLastEpisode]);

  // Save progress on hide/teardown — bfcache-safe and reliable on mobile,
  // unlike beforeunload.
  useEffect(() => {
    const flushProgress = () => {
      const t = liveTimeRef.current;
      const dur = liveDurationRef.current;
      if (t > 5 && dur > 0) {
        void saveProgress(t, dur, { keepalive: true });
      }
      useProgressStore.getState().flush();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushProgress();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushProgress);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushProgress);
    };
  }, [saveProgress]);

  // Let comment timestamps seek this player.
  useEffect(() => {
    if (!playerController) return;
    usePlayerSeekStore.getState().setSeek((seconds) => {
      playerController.seek(seconds);
      playerController.play();
    });
    usePlayerSeekStore.getState().setGetCurrentTime(() => playerController.currentTime ?? 0);
    return () => usePlayerSeekStore.getState().clearSeek();
  }, [playerController]);

  // Media Session: lock-screen / notification playback controls on mobile.
  useEffect(() => {
    if (!playerController || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (!animeName) return;

    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: currentEpisodeInfo ? t("watch.episode", { n: currentEpisodeInfo.number }) : animeName,
      artist: animeName,
      album: "AniKitty",
      artwork: animePoster
        ? [
            { src: animePoster, sizes: "256x256", type: "image/jpeg" },
            { src: animePoster, sizes: "512x512", type: "image/jpeg" },
          ]
        : [],
    });

    const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, handler); } catch { /* unsupported action */ }
    };
    set("play", () => void playerController.play());
    set("pause", () => playerController.pause());
    set("seekbackward", (d) => {
      const step = d.seekOffset || seekStepSeconds;
      playerController.seek(Math.max(0, (playerController.currentTime ?? 0) - step));
    });
    set("seekforward", (d) => {
      const step = d.seekOffset || seekStepSeconds;
      playerController.seek((playerController.currentTime ?? 0) + step);
    });
    set("previoustrack", prevEpisode ? () => handlePrevEpisode() : null);
    set("nexttrack", nextEpisode ? () => handleNextEpisode() : null);

    return () => {
      for (const a of ["play", "pause", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as const) {
        set(a, null);
      }
    };
  }, [playerController, animeName, animePoster, currentEpisodeInfo, prevEpisode, nextEpisode, handlePrevEpisode, handleNextEpisode, seekStepSeconds, t]);

  const {
    data: streamData,
    isLoading,
    isFetching,
    isPlaceholderData,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(
    animeMatchesUrl ? anilistId : undefined,
    episodeNo || undefined,
    streamQueryAudio,
    provider,
    animeTitle,
    streamKittyNode,
    false,
    streamLinkId,
    excludeKittyNodes,
  );

  // Remember the race winner for labels / remints — not geo/ping routing.
  useEffect(() => {
    const won = streamData?.kittyNode;
    if (!won || !isKittyApiNodeId(won)) return;
    if (kittyProxyNode === won) return;
    setKittyProxyNode(won);
  }, [streamData?.kittyNode, kittyProxyNode, setKittyProxyNode]);

  const streamQueryEnabled =
    animeMatchesUrl &&
    !!anilistId &&
    !!episodeNo &&
    parseInt(episodeNo, 10) > 0 &&
    episodePlayable;

  const hasStreamFile = Boolean(streamData?.file);
  const pendingNewEpisode = Boolean(
    episodeId && heldStreamSnapshot && episodeId !== heldStreamSnapshot.episodeId,
  );
  /** Placeholder sub/dub must not play while the matching stream loads (MegaPlay, etc.). */
  const audioMatchesRequest =
    !streamData?.servedAudio || streamData.servedAudio === streamQueryAudio;
  /** keepPreviousData must never play a cached stream from another anime/episode. */
  const streamStale = Boolean(isPlaceholderData && isFetching);
  const streamReady = hasStreamFile && !streamStale && audioMatchesRequest;
  const streamPending = streamQueryEnabled && (isLoading || (isFetching && !streamReady));
  const showStreamLoading = streamQueryEnabled && !streamReady && streamPending;
  const loadingStuck = useStreamLoadingStuck(showStreamLoading);

  const togglePip = useCallback(() => {
    const video = playerRef.current?.video;
    if (!video) return;
    if (document.pictureInPictureElement) {
      void document.exitPictureInPicture();
      return;
    }
    void video.requestPictureInPicture?.();
  }, []);

  useEffect(() => {
    setHeldStreamSnapshot(null);
    setPlaybackToken((n) => n + 1);
    triedKittyNodesRef.current.clear();
    setExcludeKittyNodes([]);
    setStreamKittyNode("auto");
  }, [streamQueryAudio, provider, urlAnimeId, anilistId, episodeId]);

  // Proxy node switch from mid-play failover remount: keep resume time.
  // Soft sync from race winner is ignored when playback already matches the new URL.
  const prevKittyProxyNodeRef = useRef(kittyProxyNode);
  useEffect(() => {
    if (prevKittyProxyNodeRef.current === kittyProxyNode) return;
    const prev = prevKittyProxyNodeRef.current;
    prevKittyProxyNodeRef.current = kittyProxyNode;
    // Race winner sync while stream already ready — avoid wiping the held shell.
    if (streamData?.kittyNode === kittyProxyNode && streamData?.file) return;
    if (excludeKittyNodes.includes(prev) || excludeKittyNodes.includes(kittyProxyNode)) {
      commitResumeForSourceSwitch();
      setHeldStreamSnapshot(null);
    }
  }, [kittyProxyNode, commitResumeForSourceSwitch, streamData?.kittyNode, streamData?.file, excludeKittyNodes]);

  useEffect(() => {
    if (!streamData?.audioFallback) return;
    if (streamAudio !== "dub") return;
    applyStreamAudio("sub");
    setAudioMode("sub");
    toast.info(t("watch.dubUnavailableSub"));
  }, [streamData?.audioFallback, streamAudio, applyStreamAudio, t]);

  // Only persist progress once the stream for this episode is loaded (avoids cross-episode leaks).
  useEffect(() => {
    if (!episodeId || !streamReady) {
      progressEpisodeIdRef.current = null;
      return;
    }
    progressEpisodeIdRef.current = episodeId;
  }, [episodeId, streamReady]);

  // Prefetch the next episode stream after playback has settled (avoids competing with HLS).
  useEffect(() => {
    if (!streamReady || !nextEpisode || !anilistId) return;
    const nextEpNo = String(nextEpisode.number);
    if (parseInt(nextEpNo, 10) <= 0) return;

    const timer = window.setTimeout(() => {
      void queryClient.prefetchQuery({
      queryKey: buildKittyStreamQueryKey(
        anilistId,
        nextEpNo,
        streamQueryAudio,
        provider,
        animeTitle,
        "auto",
      ),
      queryFn: () =>
        getKittyStream(
          anilistId,
          nextEpNo,
          streamQueryAudio,
          provider,
          animeTitle,
          "auto",
        ),
      staleTime: 30_000,
    });
    }, 45_000);

    return () => window.clearTimeout(timer);
  }, [
    streamReady,
    nextEpisode,
    anilistId,
    streamQueryAudio,
    provider,
    animeTitle,
    queryClient,
  ]);
  const streamFailed =
    streamQueryEnabled &&
    !streamPending &&
    !streamReady &&
    (Boolean(streamError && !isKittyStreamAbortError(streamError)) ||
      Boolean(streamData?.error));

  useEffect(() => {
    if (!streamReady) return;
    recordProviderOutcome(provider, true);
  }, [streamReady, provider]);

  useEffect(() => {
    if (!streamFailed) return;
    recordProviderOutcome(provider, false);
    if (!providerAutoFallback && !hasSeenAutoFallbackHint()) {
      setShowFallbackHint(true);
    }
  }, [streamFailed, provider, providerAutoFallback]);

  const playerTouchSeekEnabled = useSettingsStore((s) => s.playerTouchSeekEnabled);

  useWatchSwipeNav({
    enabled: streamReady && !needsResumePrompt && !playerTouchSeekEnabled,
    targetRef: playerWrapperRef,
    onPrev: prevEpisode ? handlePrevEpisode : undefined,
    onNext: nextEpisode ? handleNextEpisode : undefined,
  });

  useEffect(() => {
    if (!streamQueryEnabled) return;
    if (streamReady) return;
    if (!streamError || !isKittyStreamAbortError(streamError)) return;
    void retryStream();
  }, [streamQueryEnabled, streamReady, streamError, retryStream]);

  const playerTracks = useMemo(() => {
    const raw = streamData?.tracks ?? EMPTY_PLAYER_TRACKS;
    return raw.map((track) => {
      const file = track.file?.trim() || (track as { url?: string }).url?.trim() || "";
      return file ? { ...track, file } : track;
    });
  }, [streamData?.tracks]);
  const playerHeaders = useMemo(
    () => streamData?.headers ?? EMPTY_PLAYER_HEADERS,
    [streamData?.headers],
  );
  const playerNextEpisode = useMemo(
    () =>
      nextEpisode
        ? {
            id: nextEpisode.episodeId,
            number: nextEpisode.number,
            title: nextEpisode.title,
            image: nextEpisode.image || animePoster || null,
          }
        : undefined,
    [nextEpisode, animePoster],
  );
  const playerPrevEpisode = useMemo(
    () =>
      prevEpisode
        ? {
            id: prevEpisode.episodeId,
            number: prevEpisode.number,
            title: prevEpisode.title,
          }
        : null,
    [prevEpisode],
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

  const streamNodeKey = streamData?.kittyNode ?? "racing";
  const playerKey = `${anilistId}-${episodeNo}-${provider}-${audioMode}-${streamQueryAudio}-${streamNodeKey}-${playbackToken}`;

  const episodeNumberParsed = parseInt(episodeNo) || undefined;
  const { data: communitySkipTimes } = useCommunitySkipTimes(anilistId, episodeNumberParsed);

  const { data: externalSkipTimes } = useSkipTimes(
    streamData?.tracks,
    streamData?.file,
    streamData?.headers?.Referer ?? streamData?.headers?.referer ?? "",
    malId,
    anilistId,
    episodeNumberParsed,
    communitySkipTimes,
  );

  const skipTimes = useMemo(() => {
    return mergeSkipTimesPriority(
      communitySkipTimes,
      streamData?.skipTimes,
      externalSkipTimes,
    );
  }, [streamData?.skipTimes, communitySkipTimes, externalSkipTimes]);

  useEffect(() => {
    if (!streamReady || !streamData?.file || !episodeId) return;
    setHeldStreamSnapshot({
      key: playerKey,
      file: streamData.file,
      tracks: playerTracks,
      headers: playerHeaders,
      episodeId,
      anilistId: anilistId!,
      provider,
      audio: streamQueryAudio,
      qualities: streamData.allServers,
      skipTimes,
      thumbnails: streamData.thumbnails ?? null,
    });
  }, [streamReady, streamData?.file, streamData?.allServers, streamData?.thumbnails, episodeId, anilistId, provider, playerKey, playerTracks, playerHeaders, skipTimes, streamQueryAudio]);

  const heldSnapshotSameEpisode = Boolean(
    heldStreamSnapshot &&
      episodeId &&
      heldStreamSnapshot.episodeId === episodeId &&
      heldStreamSnapshot.anilistId === anilistId,
  );

  const useLiveStream = Boolean(streamReady && streamData?.file && !manualStreamFile);
  const useHeldPlayerShell = Boolean(
    heldStreamSnapshot?.file &&
      heldSnapshotSameEpisode &&
      (showStreamLoading || (pendingNewEpisode && (!useLiveStream || !resumeReady))),
  );
  const showTransitionOverlay = Boolean(
    heldStreamSnapshot?.file &&
      heldSnapshotSameEpisode &&
      (showStreamLoading || (pendingNewEpisode && !useLiveStream)),
  );
  const canRenderPlayerShell = useHeldPlayerShell || useLiveStream || Boolean(manualStreamFile);
  const displayPlayerKey = useLiveStream || manualStreamFile ? playerKey : (heldStreamSnapshot?.key ?? playerKey);
  const displayFile =
    manualStreamFile ??
    (useLiveStream ? streamData!.file : (heldStreamSnapshot?.file ?? ""));
  const displayTracks = useLiveStream
    ? playerTracks
    : manualStreamFile
      ? playerTracks
      : (heldStreamSnapshot?.tracks ?? EMPTY_PLAYER_TRACKS);
  const displayHeaders =
    manualStreamHeaders ??
    (useLiveStream ? playerHeaders : (heldStreamSnapshot?.headers ?? EMPTY_PLAYER_HEADERS));
  const displayQualities = useLiveStream
    ? (streamData?.allServers ?? [])
    : (heldStreamSnapshot?.qualities ?? []);
  const displaySkipTimes = useLiveStream ? skipTimes : heldStreamSnapshot?.skipTimes;
  const displayThumbnails = useLiveStream
    ? (streamData?.thumbnails ?? null)
    : (heldStreamSnapshot?.thumbnails ?? null);

  // Change provider but resume from current position, not original start
  const handleProviderGridSelect = useCallback(
    (p: KittyProvider, mode: ProviderAudioMode, fromFallback = false) => {
      preservePlaybackPosition();
      if (!fromFallback) {
        triedProvidersRef.current.clear();
        triedKittyNodesRef.current.clear();
        setExcludeKittyNodes([]);
        fallbackBusyRef.current = false;
      }
      setProvider(p);
      const resolvedMode = resolveProviderAudioMode(p, mode);
      setAudioMode(resolvedMode);
      localStorage.setItem("kittyProvider", p);
      localStorage.setItem("kittyAudioMode", resolvedMode);
      if (anilistId) saveAnimeProviderPreference(anilistId, p);
      if (mode === "dub") {
        applyStreamAudio("dub");
      } else {
        applyStreamAudio("sub");
      }
    },
    [preservePlaybackPosition, anilistId, applyStreamAudio],
  );

  const handleSimpleProviderChange = useCallback(
    (p: KittyProvider) => {
      const mode = normalizeProviderAudioMode(audioMode, streamAudio);
      handleProviderGridSelect(p, mode);
    },
    [audioMode, streamAudio, handleProviderGridSelect],
  );

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

  useWatchKeyboard({
    enabled: streamReady && !needsResumePrompt,
    player: playerController,
    seekStepSeconds,
    onPrevEpisode: handlePrevEpisode,
    onNextEpisode: handleNextEpisode,
    onToggleTheatre: toggleTheatreMode,
    theatreMode,
    onExitTheatre: () => setTheatreMode(false),
    onCopyShareLink: copyShareLink,
    onShowShortcuts: () => setShortcutsOpen(true),
    hasPrev: Boolean(prevEpisode),
    hasNext: Boolean(nextEpisode),
  });

  // Re-race remaining CDN nodes before switching providers (not ping/geo ordered).
  const attemptNodeFailover = useCallback((): boolean => {
    if (fallbackBusyRef.current) return false;

    const tried = triedKittyNodesRef.current;
    const failed = streamData?.kittyNode ?? kittyProxyNode;
    if (!tried.has(failed)) tried.add(failed);

    const deadFromProbe = new Set(
      proxyNodes.filter((n) => !n.ok).map((n) => n.id),
    );
    for (const id of deadFromProbe) tried.add(id);

    const remaining = KITTY_API_NODES.map((n) => n.id).filter((id) => !tried.has(id));
    if (!remaining.length) return false;

    fallbackBusyRef.current = true;
    const fromLabel = getKittyApiNode(failed).location;
    toast.info(t("watch.nodeFailover", { from: fromLabel, to: "another proxy" }));
    setStreamKittyNode("auto");
    setExcludeKittyNodes(Array.from(tried));
    commitResumeForSourceSwitch();
    setHeldStreamSnapshot(null);
    setPlaybackToken((n) => n + 1);

    window.setTimeout(() => {
      fallbackBusyRef.current = false;
    }, 1200);
    return true;
  }, [kittyProxyNode, proxyNodes, streamData?.kittyNode, t, commitResumeForSourceSwitch]);

  // Switch to the next fallback provider (shared by fetch-failure and playback
  // failure). Returns true if it kicked off a switch, false if none is left.
  const attemptProviderFallback = useCallback((): boolean => {
    if (!providerAutoFallback || fallbackBusyRef.current) return false;

    const tried = triedProvidersRef.current;
    if (!tried.has(provider)) tried.add(provider);

    const next = getNextFallbackProvider(provider, tried, providerOrder);
    if (!next) return false;

    tried.add(next);
    fallbackBusyRef.current = true;
    toast.info(t("watch.providerFallback", { from: provider, to: next }));

    const mode = normalizeProviderAudioMode(audioMode, "sub");
    handleProviderGridSelect(next, mode, true);

    window.setTimeout(() => {
      fallbackBusyRef.current = false;
    }, 1200);
    return true;
  }, [providerAutoFallback, provider, audioMode, t, handleProviderGridSelect, providerOrder]);

  const handleTryAnotherServer = useCallback(() => {
    if (!triedProvidersRef.current.has(provider)) {
      triedProvidersRef.current.add(provider);
    }
    const next = getNextFallbackProvider(provider, triedProvidersRef.current, providerOrder);
    if (!next) {
      toast.error(t("watch.noMoreProviders"));
      return;
    }
    toast.info(t("watch.providerFallback", { from: provider, to: next }));
    const mode = normalizeProviderAudioMode(audioMode, streamAudio);
    handleProviderGridSelect(next, mode, true);
  }, [provider, audioMode, streamAudio, t, handleProviderGridSelect, providerOrder]);

  const revealProviderControls = useCallback(() => {
    setShowPlayerControls(true);
    setPlayerSettingsOpen(true);
    requestAnimationFrame(() => {
      document.getElementById("watch-provider-controls")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }, [setShowPlayerControls, setPlayerSettingsOpen]);

  const peekNextFallbackProvider = useCallback(() => {
    const tried = new Set(triedProvidersRef.current);
    tried.add(provider);
    return getNextFallbackProvider(provider, tried, providerOrder);
  }, [provider, providerOrder]);

  // Stream fetch failed → try another healthy node on infra errors, then providers.
  useEffect(() => {
    if (!streamQueryEnabled) return;
    if (streamPending || streamReady) return;
    if (!streamFailed) return;
    if (streamError && isKittyStreamAbortError(streamError)) return;
    if (isKittyNodeFailoverError(streamError) && attemptNodeFailover()) return;
    if (!providerAutoFallback) return;
    attemptProviderFallback();
  }, [
    providerAutoFallback,
    streamQueryEnabled,
    streamPending,
    streamReady,
    streamFailed,
    streamError,
    attemptNodeFailover,
    attemptProviderFallback,
  ]);

  // The stream loaded but HLS playback died mid-load (e.g. a 404 manifest).
  // Prefer soft reminting expired proxy tokens before switching providers.
  const handleFatalPlayerError = useCallback(
    (info?: { type?: string; details?: string; status?: number }) => {
      const isAuth =
        info?.type === "hls-auth" ||
        info?.status === 401 ||
        info?.status === 403;

      if (isAuth && !remintAttemptedRef.current) {
        remintAttemptedRef.current = true;
        // Keep the race winner for remints so quality/token refresh stays sticky.
        const sticky =
          (streamData?.kittyNode && isKittyApiNodeId(streamData.kittyNode)
            ? streamData.kittyNode
            : null) ?? kittyProxyNode;
        preservePlaybackPosition();
        setManualStreamFile(null);
        setManualStreamHeaders(null);
        toast.message(t("watch.refreshingPlayback"));
        if (streamKittyNode !== sticky) {
          setStreamKittyNode(sticky);
        } else {
          void retryStream();
        }
        return;
      }

      const gatewayStatus =
        info?.status === 502 ||
        info?.status === 503 ||
        info?.status === 504 ||
        info?.status === 408 ||
        info?.status === 429;
      if (gatewayStatus && attemptNodeFailover()) return;

      if (!providerAutoFallback) {
        toast.error(t("watch.playbackFailed"));
        return;
      }
      // attemptProviderFallback already toasts "Switching from X to Y…".
      const switched = attemptProviderFallback();
      if (!switched) toast.error(t("watch.playbackFailed"));
    },
    [
      providerAutoFallback,
      attemptNodeFailover,
      attemptProviderFallback,
      preservePlaybackPosition,
      retryStream,
      streamData?.kittyNode,
      kittyProxyNode,
      streamKittyNode,
      t,
    ],
  );

  // Anime just changed in the URL but the loaded anime hasn't caught up yet —
  // show the loading state rather than the previous anime's episode.
  if (urlAnimeId && !animeMatchesUrl) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStream")} />
      </div>
    );
  }

  if (!episodeId && !activeEpisodeId) {
    if (!episodesLoading && (allEpisodes?.totalEpisodes ?? 0) === 0) {
      return (
        <div className="w-full aspect-video bg-[#030303] flex flex-col items-center justify-center gap-4 rounded-xl border border-border dark:border-white/10 ring-1 ring-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255, 255, 255, 0.1),transparent_60%)] pointer-events-none" />
          <Cat className="text-zinc-300/30 w-12 h-12 relative z-10" />
          <div className="text-center relative z-10 px-6">
            <p className="text-muted-foreground dark:text-white/50 text-sm font-medium">{t("watch.animeNotAiredYet")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video bg-[#030303] flex flex-col items-center justify-center gap-4 rounded-xl border border-border dark:border-white/10 ring-1 ring-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255, 255, 255, 0.1),transparent_60%)] pointer-events-none" />
        <Cat className="text-zinc-300/30 w-12 h-12 relative z-10" />
        <div className="text-center relative z-10 px-6">
          <p className="text-muted-foreground dark:text-white/50 text-sm font-medium">{t("watch.selectEpisode")}</p>
          <p className="text-muted-foreground/80 dark:text-white/25 text-[11px] font-mono mt-1.5">{t("watch.selectEpisodeHint")}</p>
        </div>
      </div>
    );
  }

  if (activeEpisodeId && episodesLoading) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStream")} />
      </div>
    );
  }

  if (activeEpisodeId && !episodePlayable) {
    const fallback = lastPlayableEpisode(allEpisodes?.episodes ?? []);
    return (
      <div className="flex flex-col gap-3">
        <WatchErrorPanel error={new Error(t("watch.notAiredYet"))} />
        {fallback && animeSlug ? (
          <Button
            size="sm"
            variant="outline"
            className="border-border dark:border-white/15 text-muted-foreground dark:text-white/60 hover:bg-accent dark:hover:bg-white/10 w-fit text-xs"
            onClick={() => navigateToEpisode(fallback)}
          >
            {t("watch.watchLatestAired", { n: fallback.number })}
          </Button>
        ) : null}
      </div>
    );
  }

  const providerControlsBlock = compactProviderPicker ? (
    <WatchSimpleProviderRow
      provider={provider}
      streamAudio={streamAudio}
      onAudioChange={(audio) => handleProviderGridSelect(provider, audio)}
      onProviderChange={handleSimpleProviderChange}
      streamCaps={streamCaps}
      preferredProvider={preferredAnimeProvider}
    />
  ) : (
    <ProviderQuickPick
      value={provider}
      audioMode={audioMode}
      compact={isMobile}
      onSelect={handleProviderGridSelect}
      streamCaps={streamCaps}
      preferredProvider={preferredAnimeProvider}
    />
  );

  const handlePickQuality = (entry: KittyStreamQuality) => {
    preservePlaybackPosition();
    setManualStreamFile(entry.file);
    setManualStreamHeaders(streamData?.headers ?? playerHeaders);
  };

  const handlePickSiteServer = (server: { id: string; name: string }) => {
    preservePlaybackPosition();
    setManualStreamFile(null);
    setManualStreamHeaders(null);
    setStreamLinkId(server.id);
  };

  const stuckNextFallback = peekNextFallbackProvider();
  const stuckNextLabel = stuckNextFallback ? getKittyProviderMeta(stuckNextFallback).label : null;
  const proxyNodeLabel = getKittyApiNode(kittyProxyNode).label;
  const activeQualityLabel = displayQualities.find((q) => q.file === displayFile)?.quality ?? null;
  const raceMs = streamData?.raceMs ?? null;

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

  if (showStreamError) {
    const rawMessage =
      upstreamError ??
      streamData?.error ??
      (streamError instanceof Error ? streamError.message : null);
    const streamFailMessage = isEpisodeNotFound(rawMessage)
      ? t("watch.episodeNotFoundOnProvider", {
          provider: getKittyProviderMeta(provider).label,
        })
      : (rawMessage ?? t("watch.streamNotFound"));
    const nextFallback = peekNextFallbackProvider();
    const nextFallbackLabel = nextFallback ? getKittyProviderMeta(nextFallback).label : undefined;

    return (
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <WatchErrorPanel
          error={new Error(streamFailMessage)}
          onRetry={() => void retryStream()}
          onTryAnother={nextFallback ? handleTryAnotherServer : undefined}
          tryAnotherLabel={
            nextFallbackLabel
              ? t("watch.tryAnotherSourceNamed", { provider: nextFallbackLabel })
              : undefined
          }
        />

        {streamProviderControls}
        {episodeBar}
      </div>
    );
  }

  if (showStreamLoading && !useHeldPlayerShell) {
    return (
      <div className="flex flex-col gap-2 sm:gap-2.5">
        <PlayerSkeleton
          provider={provider}
          label={
            currentEpisodeInfo
              ? t("watch.loadingEpisode", { n: currentEpisodeInfo.number })
              : t("watch.loadingStreamProvider", { provider: getKittyProviderMeta(provider).label })
          }
        />
        <div className={cn(PROVIDER_PANEL.shell, PROVIDER_PANEL.inner)}>
          {loadingStuck && (
            <WatchStuckLoadingBanner
              providerLabel={getKittyProviderMeta(provider).label}
              nextProviderLabel={stuckNextLabel}
              onTryAnother={stuckNextFallback ? handleTryAnotherServer : undefined}
            />
          )}
          <p className="text-[11px] font-mono text-muted-foreground dark:text-white/40 leading-relaxed">
            {t("watch.switchProviderWhileLoading")}
          </p>
          {capsFetching && (
            <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/30">
              {t("watch.capabilitiesLoading")}
            </p>
          )}
          {streamProviderControls}
        </div>
        {episodeBar}
      </div>
    );
  }

  const subtitleTracks = playerTracks.filter(isSubtitleTrack);
  const watchingHardSub = isHardSubPlayback({
    audioMode,
    streamAudio,
    provider,
    serverName: streamData?.server,
  });
  const allowSoftSubsOverlay = streamAudio === "sub" && (!watchingHardSub || hardSubSoftSubs);
  const subtitlesEnabled = allowSoftSubsOverlay && autoEnableSubtitles;
  const tracksForPlayer = allowSoftSubsOverlay
    ? displayTracks
    : displayTracks.filter((track) => !isSubtitleTrack(track));

  if ((!streamReady || !streamData?.file) && !canRenderPlayerShell) {
    const nextFallback = peekNextFallbackProvider();
    const nextFallbackLabel = nextFallback ? getKittyProviderMeta(nextFallback).label : undefined;

    return (
      <div className="flex flex-col gap-3">
        <WatchErrorPanel
          error={new Error(streamData?.error ?? t("watch.streamNotFound"))}
          onRetry={() => void retryStream()}
          onTryAnother={nextFallback ? handleTryAnotherServer : undefined}
          tryAnotherLabel={
            nextFallbackLabel
              ? t("watch.tryAnotherSourceNamed", { provider: nextFallbackLabel })
              : undefined
          }
        />
        {streamProviderControls}
      </div>
    );
  }

  if (!resumeReady && !canRenderPlayerShell) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStream")} />
        {streamProviderControls}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-3.5">
    <WatchKeyboardHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} seekStepSeconds={seekStepSeconds} />
    {anilistId && episodeNumberParsed != null && (
      <SkipTimesSubmitDialog
        open={skipSubmitOpen}
        onOpenChange={setSkipSubmitOpen}
        anilistId={anilistId}
        malId={malId}
        animeTitle={animeTitle ?? `Anime #${anilistId}`}
        episode={episodeNumberParsed}
      />
    )}

    {/* Player + under-chrome + episode strip as one composition */}
    <div className="watch-player-stack flex flex-col overflow-hidden rounded-none sm:rounded-xl ring-0 sm:ring-1 ring-border dark:ring-white/[0.09] shadow-none sm:shadow-[0_28px_80px_-24px_rgba(0,0,0,0.8)] bg-black">
    <div className="watch-player-stage flex flex-col overflow-hidden bg-black">
      {/* Persistent wrapper — a real (non-`contents`) element so it can hold
          native fullscreen across episode transitions without dropping out. */}
      <div ref={playerWrapperRef} className="relative w-full bg-black">
      {needsResumePrompt ? (
        <div className="relative w-full aspect-video bg-[#030303]">
          <WatchResumePrompt
            resumeAt={savedResumeTime}
            onResume={() => setResumeChoice("resume")}
            onStartOver={() => setResumeChoice("start")}
          />
        </div>
      ) : (
      <>
      <AniKittyPlayer
        key={displayPlayerKey}
        src={displayFile}
        poster={currentEpisodeInfo?.image || animePoster || undefined}
        tracks={tracksForPlayer}
        qualities={displayQualities}
        headers={displayHeaders}
        kittyNodeId={kittyProxyNode}
        preferSubtitles={subtitlesEnabled}
        preferDubAudio={streamAudio === "dub"}
        onSelectQuality={handlePickQuality}
        skipTimes={displaySkipTimes}
        thumbnails={displayThumbnails}
        title={
          currentEpisodeInfo
            ? t("watch.episode", { n: currentEpisodeInfo.number })
            : animeName
        }
        className="rounded-none"
        startTime={
          w2gCode && w2g.isMember && !w2g.isHost && w2g.syncState
            ? w2g.syncState.currentTime
            : playerStartTime
        }
        autoFullscreen={autoFullscreen}
        nextEpisode={playerNextEpisode}
        prevEpisode={playerPrevEpisode}
        onStart={handleStart}
        onProgress={handleProgress}
        onLiveTime={handleLiveTime}
        onNextEpisode={handleNextEpisode}
        onPrevEpisode={handlePrevEpisode}
        onOutroStart={handleOutroStart}
        onEnded={handleEnded}
        onPlayerReady={handlePlayerReady}
        w2g={playerW2g}
        onFatalError={handleFatalPlayerError}
      />
      {showTransitionOverlay && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/65 backdrop-blur-[3px] pointer-events-none"
          aria-live="polite"
        >
          <span className={cn(providerChipClass(provider), "mb-4 px-3 py-1.5 text-[11px]")}>
            <span className={cn("h-2 w-2 rounded-full shrink-0 animate-pulse", getProviderAccent(provider).dot)} />
            {getKittyProviderMeta(provider).label}
            <span className="opacity-40">·</span>
            {streamAudio === "dub" ? t("card.dub") : t("card.sub")}
          </span>
          <Loader2 className="w-8 h-8 animate-spin text-white/80" />
          <p className="mt-3 text-[11px] font-mono text-white/55">
            {currentEpisodeInfo
              ? t("watch.loadingEpisode", { n: currentEpisodeInfo.number })
              : t("watch.loadingStreamProvider", { provider: getKittyProviderMeta(provider).label })}
          </p>
        </div>
      )}
      </>
      )}
      </div>

      <WatchPlayerToolbar
        provider={provider}
        providerLabel={getKittyProviderMeta(provider).label}
        streamAudio={streamAudio}
        dubEnabled={providerSupportsDub(provider)}
        onAudioChange={(audio) => handleProviderGridSelect(provider, audio)}
        showProviderControls={showPlayerControls}
        hasPrev={Boolean(prevEpisode)}
        hasNext={Boolean(nextEpisode)}
        prevEpisodeNumber={prevEpisode?.number}
        nextEpisodeNumber={nextEpisode?.number}
        onPrev={handlePrevEpisode}
        onNext={handleNextEpisode}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onShowProviders={revealProviderControls}
        onTogglePip={togglePip}
        pipSupported={pipSupported}
        onOpenComments={watchPage ? () => watchPage.openComments("episode") : undefined}
        onShare={copyShareLink}
        onSubmitSkipTimes={
          anilistId && episodeNumberParsed != null
            ? () => setSkipSubmitOpen(true)
            : undefined
        }
      />

      {!showPlayerControls && (
        <WatchStreamInfoBar
          providerLabel={getKittyProviderMeta(provider).label}
          streamAudio={streamAudio}
          serverName={streamData?.server}
          provider={provider}
          qualityLabel={activeQualityLabel}
          proxyNodeLabel={proxyNodeLabel}
          raceMs={raceMs}
        />
      )}

      {/* Controls bar */}
      <div className="watch-chrome px-2.5 py-2 sm:px-3 sm:py-2.5 border-t space-y-2">
        {showFallbackHint && !providerAutoFallback && (
          <WatchAutoFallbackHint
            onEnable={() => {
              setProviderAutoFallback(true);
              markAutoFallbackHintSeen();
              setShowFallbackHint(false);
            }}
            onDismiss={() => {
              markAutoFallbackHintSeen();
              setShowFallbackHint(false);
            }}
          />
        )}

        {showPlayerControls && (
          <>
            <div id="watch-provider-controls">{providerControlsBlock}</div>

            <WatchServerPicker
              provider={provider}
              streamAudio={streamAudio}
              qualities={displayQualities}
              activeFile={displayFile}
              dataIds={siteEpisodeDataIds}
              onPickQuality={handlePickQuality}
              onPickSiteServer={handlePickSiteServer}
            />
          </>
        )}

        <PlayerSettingsBar watchingHardSub={watchingHardSub && streamAudio === "sub"} />

        <WatchPlayerActions
          anilistId={anilistId}
          episodeNo={episodeNo}
          episodes={allEpisodes?.episodes}
          streamAudio={streamAudio}
          provider={provider}
          w2gCode={w2gCode}
          w2gIsMember={w2g.isMember}
          auth={Boolean(auth)}
          creatingW2g={creatingW2g}
          onCreateW2g={handleCreateW2g}
        />

        {showPlayerControls && (
          <>
        {/* Stream meta badges */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {(communitySkipTimes?.intro || communitySkipTimes?.outro) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-sky-500/10 border border-sky-500/20 text-sky-300/90">
                {t("watch.communitySkip")}
              </span>
            )}
            {(skipTimes?.intro || skipTimes?.outro) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 text-muted-foreground dark:text-white/70">
                {t("watch.chapters")}
              </span>
            )}
            {streamData?.miruroPipe && provider === "Miruro" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-primary/10 border border-primary/20 text-zinc-300/90">
                {streamData.miruroPipe}
              </span>
            )}
            {providerHasNativeSubs(provider) &&
              resolveServerCodename(provider, streamData?.server) && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-500/10 border border-zinc-400/20 text-zinc-300/90">
                  {resolveServerCodename(provider, streamData?.server)}
                </span>
              )}
            {watchingHardSub && streamAudio === "sub" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-300/90">
                {t("watch.hardSubBadge")}
                {hardSubSoftSubs ? ` · ${t("watch.hardSubSoftSubsOn")}` : ""}
              </span>
            )}
            {subtitlesEnabled && subtitleTracks.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 max-w-full">
                {subtitleTracks.slice(0, 3).map((track, i) => (
                  <span
                    key={`${track.label ?? "sub"}-${i}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-500/10 border border-zinc-400/20 text-zinc-200/90 truncate max-w-[120px]"
                    title={track.label}
                  >
                    <Captions className="w-2.5 h-2.5 shrink-0" />
                    {track.label}
                  </span>
                ))}
                {subtitleTracks.length > 3 && (
                  <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25">
                    +{subtitleTracks.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>

    {episodeBar}

    </div>

    {w2gCode && w2g.isMember && (
      <W2gPanel
        code={w2gCode}
        roomName={w2g.room?.name}
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
  label,
  provider: providerId,
}: {
  dim?: boolean;
  label?: string;
  provider?: KittyProvider;
}) => {
  const t = useT();
  const accent = providerId ? getProviderAccent(providerId) : null;
  return (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label={label ?? t("watch.loadingStream")}
    className={`relative w-full aspect-video rounded-xl bg-[#030303] border border-border dark:border-white/[0.08] flex flex-col items-center justify-center gap-3 overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] ${dim ? "opacity-40" : ""}`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255, 255, 255, 0.08),transparent_60%)] pointer-events-none" />
    {accent && (
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent pointer-events-none opacity-30",
          accent.glow,
        )}
      />
    )}
    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-background/50 dark:via-black/40 to-transparent pointer-events-none" />
    <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 pointer-events-none">
      <div className="h-1 w-full rounded-full bg-accent dark:bg-white/[0.06] overflow-hidden">
        <div
          className={cn(
            "h-full w-1/3 rounded-full animate-pulse",
            accent ? "bg-gradient-to-r from-white/10 to-white/25" : "bg-gradient-to-r from-primary/40 to-primary/40",
          )}
        />
      </div>
      <div className="flex justify-between">
        <div className="h-2 w-16 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
        <div className="h-2 w-10 rounded bg-muted/60 dark:bg-white/[0.05] animate-pulse" />
      </div>
    </div>
    <LoadingGirl size={140} label={label ?? t("watch.loadingStream")} className="relative z-10" />
  </div>
  );
};

export default VideoPlayerSection;
