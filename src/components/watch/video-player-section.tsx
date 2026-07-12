"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Artplayer from "artplayer";
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
  type KittyProvider,
  type KittyTrack,
} from "@/query/stream/get-kitty-stream";
import { normalizeKittyProvider, DEFAULT_KITTY_PROVIDER, MULTI_ROW_PROVIDERS, providerHasNativeSubs, type ProviderAudioMode } from "@/lib/kitty/kitty-providers";
import { isHardSubPlayback } from "@/lib/player/hard-sub-playback";
import {
  DEFAULT_ANIMEX_SERVER,
  defaultAnimexServerForMode,
  animexServerUsesInPlayerAudioSwitch,
  isAnimexServerId,
  type AnimexServerId,
} from "@/lib/providers/animex-config";
import {
  DEFAULT_ANISNATCH_SERVER,
  defaultAnisnatchServerForMode,
  isAnisnatchServerId,
  type AnisnatchServerId,
} from "@/lib/providers/anisnatch-config";
import {
  DEFAULT_LUNAR_SERVER,
  defaultLunarServerForMode,
  isLunarServerId,
  type LunarServerId,
} from "@/lib/providers/lunar-config";
import {
  DEFAULT_ALLANIME_MIRROR,
  DEFAULT_MKISSA_MIRROR,
  defaultAllanimeMirrorForMode,
  isAllanimeMirrorId,
  type AllanimeMirrorId,
} from "@/lib/providers/allanime-config";
import {
  DEFAULT_ANIMO_SERVER,
  isAnimoServerId,
  type AnimoServerId,
} from "@/lib/providers/animo-config";
import {
  DEFAULT_ANINEKO_SERVER,
  defaultAninekoServerForMode,
  isAninekoServerId,
  type AninekoServerId,
} from "@/lib/providers/anineko-config";
import {
  DEFAULT_ANIWAVES_SERVER,
  defaultAniwavesServerForMode,
  isAniwavesServerId,
  type AniwavesServerId,
} from "@/lib/providers/aniwaves-config";
import {
  DEFAULT_ANIKURO_SERVER,
  defaultAnikuroServerForMode,
  isAnikuroServerId,
  type AnikuroServerId,
} from "@/lib/providers/anikuro-config";
import { ProviderQuickPick, type MultiPanelProvider } from "@/components/player/provider-select";
import {
  DEFAULT_MIRURO_PIPE_PROVIDER,
  MIRURO_PIPE_PROVIDERS,
  type MiruroPipeProviderId,
} from "@/lib/providers/miruro-types";
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
  Users,
  Link2,
} from "lucide-react";
import WatchDownloadPanel from "@/components/watch/watch-download-panel";
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
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { useT } from "@/providers/i18n-provider";
import LoadingGirl from "@/components/common/loading-girl";
import WatchErrorPanel from "@/components/watch/watch-error-panel";
import WatchEpisodeBar from "@/components/watch/watch-episode-bar";
import { useWatchPage } from "@/components/watch/watch-page-context";
import { useEpisodeProgress } from "@/hooks/use-episode-progress";

const KittyPlayer = dynamic(() => import("@/components/player/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

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

  const { setPreferDub, preferDub, showPlayerControls, providerAutoFallback, simpleProviderPicker, theatreMode, setTheatreMode, kittyProxyNode, kittyProxyManual, applyAutoKittyProxyNode, seekStepSeconds, autoEnableSubtitles, hardSubSoftSubs } = useSettingsStore();
  const { fastestId: fastestProxyId, ready: proxyPingReady } = useKittyNodePing({
    enabled: !kittyProxyManual,
    lightweight: true,
  });

  useEffect(() => {
    if (!proxyPingReady || kittyProxyManual || !fastestProxyId) return;
    if (kittyProxyNode === fastestProxyId) return;
    // Switching proxy mid-playback refetches the stream and remounts the player.
    const video = artPlayerRef.current?.video;
    if (video && !video.paused && !video.ended) return;
    applyAutoKittyProxyNode(fastestProxyId);
  }, [proxyPingReady, kittyProxyManual, fastestProxyId, kittyProxyNode, applyAutoKittyProxyNode]);
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
      if (MULTI_ROW_PROVIDERS.has(DEFAULT_PROVIDER)) return "multi";
    }
    return MULTI_ROW_PROVIDERS.has(DEFAULT_PROVIDER) ? "multi" : "sub";
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

  const animeHasDub = (anime?.anime?.info?.stats?.episodes?.dub ?? 0) > 0;

  useEffect(() => {
    if (dubSearchParam !== "1" && dubSearchParam !== "true") return;
    if (!animeHasDub) {
      applyStreamAudio("sub");
      return;
    }
    setAudioMode((mode) => (mode === "multi" ? mode : "dub"));
    applyStreamAudio("dub");
  }, [dubSearchParam, animeHasDub, applyStreamAudio]);

  useEffect(() => {
    if (animeHasDub) return;
    if (streamAudio !== "dub" && audioMode !== "dub") return;
    applyStreamAudio("sub");
    setAudioMode((mode) => (mode === "multi" ? mode : "sub"));
  }, [animeHasDub, streamAudio, audioMode, applyStreamAudio]);

  // Settings → prefer dub toggle (do not bounce back through streamAudio effects).
  useEffect(() => {
    return useSettingsStore.subscribe((state, prevState) => {
      if (state.preferDub === prevState.preferDub) return;
      const target = state.preferDub && animeHasDub ? "dub" : "sub";
      setStreamAudio((current) => {
        if (current === target) return current;
        localStorage.setItem("kittyStreamAudio", target);
        syncDubSearchParam(target === "dub");
        return target;
      });
    });
  }, [syncDubSearchParam, animeHasDub]);

  const resolveProviderAudioMode = useCallback(
    (p: KittyProvider, mode: ProviderAudioMode): ProviderAudioMode => {
      if (MULTI_ROW_PROVIDERS.has(p) && (mode === "dub" || mode === "sub")) return "multi";
      return mode;
    },
    [],
  );

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

  const [aninekoServer, setAninekoServer] = useState<AninekoServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aninekoServer");
      if (saved && isAninekoServerId(saved)) return saved;
    }
    return DEFAULT_ANINEKO_SERVER;
  });

  const [aniwavesServer, setAniwavesServer] = useState<AniwavesServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aniwavesServer");
      if (saved && isAniwavesServerId(saved)) return saved;
    }
    return DEFAULT_ANIWAVES_SERVER;
  });

  const [anikuroServer, setAnikuroServer] = useState<AnikuroServerId>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("anikuroServer");
      if (saved && isAnikuroServerId(saved)) return saved;
    }
    return DEFAULT_ANIKURO_SERVER;
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
      if (!savedProvider && MULTI_ROW_PROVIDERS.has(DEFAULT_PROVIDER)) {
        return DEFAULT_PROVIDER as MultiPanelProvider;
      }
    }
    return MULTI_ROW_PROVIDERS.has(DEFAULT_PROVIDER)
      ? (DEFAULT_PROVIDER as MultiPanelProvider)
      : null;
  });

  const animeSlug = anime?.anime?.info?.id ?? null;
  const anilistId = anime?.anime?.info?.anilistId;
  const malId = anime?.anime?.info?.malId;
  const animeTitle = anime?.anime?.info?.name || undefined;
  const animeName = anime?.anime?.info?.name;
  const animePoster = anime?.anime?.info?.poster;

  // Episode list for next-episode navigation (also resolves episode number for stream API)
  const { data: allEpisodes, isLoading: episodesLoading } = useGetAllEpisodes(animeSlug ?? "");
  const watchedEpisodes = useEpisodeProgress(animeSlug ?? "");
  const [mobilePlaylistOpen, setMobilePlaylistOpen] = useState(false);
  type HeldStreamSnapshot = {
    key: string;
    file: string;
    tracks: KittyTrack[];
    headers: Record<string, string>;
    episodeId: string;
    audio: "sub" | "dub";
    qualities?: import("@/lib/kitty/stream-quality").KittyStreamQuality[];
    skipTimes?: { intro?: { start: number; end: number }; outro?: { start: number; end: number } };
  };
  const [heldStreamSnapshot, setHeldStreamSnapshot] = useState<HeldStreamSnapshot | null>(null);
  const artPlayerRef = useRef<Artplayer | null>(null);
  const currentEpisodeInfo = React.useMemo(() => {
    if (!allEpisodes?.episodes || !episodeId) return undefined;
    return findPlayableEpisode(allEpisodes.episodes, episodeId);
  }, [allEpisodes, episodeId]);

  const episodePlayable = Boolean(currentEpisodeInfo);

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
  const handlePlayerReady = useCallback((art: Artplayer) => {
    artPlayerRef.current = art;
    setArtPlayer(art);
  }, []);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [skipSubmitOpen, setSkipSubmitOpen] = useState(false);
  const triedProvidersRef = useRef(new Set<KittyProvider>());
  const fallbackBusyRef = useRef(false);
  const [playbackToken, setPlaybackToken] = useState(0);

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
      artPlayerRef.current?.pause?.();
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
    setMobilePlaylistOpen((open) => {
      const next = !open;
      if (next) {
        requestAnimationFrame(() => {
          document.getElementById("watch-mobile-playlist")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      return next;
    });
  }, []);

  const episodeBar =
    currentEpisodeInfo && allEpisodes ? (
      <WatchEpisodeBar
        currentEpisode={currentEpisodeInfo}
        episodes={allEpisodes}
        animePoster={animePoster}
        animeName={animeName ?? undefined}
        prevEpisode={prevEpisode ?? null}
        nextEpisode={nextEpisode ?? null}
        playlistOpen={mobilePlaylistOpen}
        onTogglePlaylist={toggleMobilePlaylist}
        onPrev={handlePrevEpisode}
        onNext={handleNextEpisode}
        watchedEpisodes={watchedEpisodes}
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
    artPlayerRef.current?.pause?.();
    triedProvidersRef.current.clear();
    fallbackBusyRef.current = false;
    setMobilePlaylistOpen(false);
  }, [episodeId]);

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
        provider === "Miruro" ? miruroPipe : null,
        animeTitle,
        provider === "Animex" ? animexServer : null,
        provider === "AniSnatch" ? anisnatchServer : null,
        provider === "Lunar" ? lunarServer : null,
        provider === "AllAnime" ? allanimeMirror : null,
        provider === "MKissa" ? mkissaMirror : null,
        provider === "Animo" ? animoServer : null,
        provider === "AniNeko" ? aninekoServer : null,
        provider === "AniWaves" ? aniwavesServer : null,
        provider === "AniKuro" ? anikuroServer : null,
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
    miruroPipe,
    animeTitle,
    animexServer,
    anisnatchServer,
    lunarServer,
    allanimeMirror,
    mkissaMirror,
    animoServer,
    aninekoServer,
    aniwavesServer,
    anikuroServer,
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
    if (!artPlayer) return;
    usePlayerSeekStore.getState().setSeek((seconds) => {
      artPlayer.seek = seconds;
      artPlayer.play?.();
    });
    usePlayerSeekStore.getState().setGetCurrentTime(() => artPlayer.currentTime ?? 0);
    return () => usePlayerSeekStore.getState().clearSeek();
  }, [artPlayer]);

  // Media Session: lock-screen / notification playback controls on mobile.
  useEffect(() => {
    if (!artPlayer || typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
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
    set("play", () => void artPlayer.play?.());
    set("pause", () => artPlayer.pause?.());
    set("seekbackward", (d) => {
      const step = d.seekOffset || seekStepSeconds;
      artPlayer.seek = Math.max(0, (artPlayer.currentTime ?? 0) - step);
    });
    set("seekforward", (d) => {
      const step = d.seekOffset || seekStepSeconds;
      artPlayer.seek = (artPlayer.currentTime ?? 0) + step;
    });
    set("previoustrack", prevEpisode ? () => handlePrevEpisode() : null);
    set("nexttrack", nextEpisode ? () => handleNextEpisode() : null);

    return () => {
      for (const a of ["play", "pause", "seekbackward", "seekforward", "previoustrack", "nexttrack"] as const) {
        set(a, null);
      }
    };
  }, [artPlayer, animeName, animePoster, currentEpisodeInfo, prevEpisode, nextEpisode, handlePrevEpisode, handleNextEpisode, seekStepSeconds, t]);

  const {
    data: streamData,
    isLoading,
    isFetching,
    isPlaceholderData,
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
    provider === "AniNeko" ? aninekoServer : null,
    provider === "AniWaves" ? aniwavesServer : null,
    provider === "AniKuro" ? anikuroServer : null,
    kittyProxyNode,
  );

  const streamQueryEnabled =
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
  const pendingAudioSwitch = Boolean(
    isFetching && isPlaceholderData && hasStreamFile && !audioMatchesRequest,
  );
  const streamBackgroundRefresh = Boolean(
    isFetching && isPlaceholderData && hasStreamFile && !pendingNewEpisode && !pendingAudioSwitch,
  );
  const streamStale = Boolean(isPlaceholderData && isFetching && !streamBackgroundRefresh);
  const streamReady = hasStreamFile && !streamStale && audioMatchesRequest;
  const streamPending = streamQueryEnabled && (isLoading || (isFetching && !streamReady));
  const showStreamLoading = streamQueryEnabled && !streamReady && streamPending;

  useEffect(() => {
    setHeldStreamSnapshot(null);
  }, [streamQueryAudio]);

  useEffect(() => {
    if (!streamData?.audioFallback) return;
    if (streamAudio === "sub") return;
    applyStreamAudio("sub");
    setAudioMode((mode) => (mode === "multi" ? mode : "sub"));
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
        provider === "Miruro" ? miruroPipe : null,
        animeTitle,
        provider === "Animex" ? animexServer : null,
        provider === "AniSnatch" ? anisnatchServer : null,
        provider === "Lunar" ? lunarServer : null,
        provider === "AllAnime" ? allanimeMirror : null,
        provider === "MKissa" ? mkissaMirror : null,
        provider === "Animo" ? animoServer : null,
        provider === "AniNeko" ? aninekoServer : null,
        provider === "AniWaves" ? aniwavesServer : null,
        provider === "AniKuro" ? anikuroServer : null,
      ),
      queryFn: () =>
        getKittyStream(
          anilistId,
          nextEpNo,
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
          provider === "AniNeko" ? aninekoServer : null,
          provider === "AniWaves" ? aniwavesServer : null,
          provider === "AniKuro" ? anikuroServer : null,
          kittyProxyNode,
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
    miruroPipe,
    animeTitle,
    animexServer,
    anisnatchServer,
    lunarServer,
    allanimeMirror,
    mkissaMirror,
    animoServer,
    aninekoServer,
    aniwavesServer,
    anikuroServer,
    kittyProxyNode,
    queryClient,
  ]);
  const streamFailed =
    streamQueryEnabled &&
    !streamPending &&
    !streamReady &&
    (Boolean(streamError && !isKittyStreamAbortError(streamError)) ||
      Boolean(streamData?.error));

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

  const playerKey = `${anilistId}-${episodeNo}-${provider}-${miruroPipe}-${animexServer}-${anisnatchServer}-${lunarServer}-${allanimeMirror}-${mkissaMirror}-${animoServer}-${aninekoServer}-${aniwavesServer}-${anikuroServer}-${audioMode}-${streamQueryAudio}-${playbackToken}`;

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
      audio: streamQueryAudio,
      qualities: streamData.allServers,
      skipTimes,
    });
  }, [streamReady, streamData?.file, streamData?.allServers, episodeId, playerKey, playerTracks, playerHeaders, skipTimes, streamQueryAudio]);

  const heldSnapshotMatchesAudio =
    !heldStreamSnapshot || heldStreamSnapshot.audio === streamQueryAudio;
  const useLiveStream = Boolean(streamReady && streamData?.file);
  const useHeldPlayerShell = Boolean(
    heldStreamSnapshot?.file &&
      heldSnapshotMatchesAudio &&
      (showStreamLoading || (pendingNewEpisode && (!useLiveStream || !resumeReady))),
  );
  const showTransitionOverlay = Boolean(
    heldStreamSnapshot?.file && (showStreamLoading || (pendingNewEpisode && !useLiveStream)),
  );
  const canRenderPlayerShell = useHeldPlayerShell || useLiveStream;
  const displayPlayerKey = useLiveStream ? playerKey : (heldStreamSnapshot?.key ?? playerKey);
  const displayFile = useLiveStream ? streamData!.file : (heldStreamSnapshot?.file ?? "");
  const displayTracks = useLiveStream ? playerTracks : (heldStreamSnapshot?.tracks ?? EMPTY_PLAYER_TRACKS);
  const displayHeaders = useLiveStream ? playerHeaders : (heldStreamSnapshot?.headers ?? EMPTY_PLAYER_HEADERS);
  const displayQualities = useLiveStream
    ? (streamData?.allServers ?? [])
    : (heldStreamSnapshot?.qualities ?? []);
  const displaySkipTimes = useLiveStream ? skipTimes : heldStreamSnapshot?.skipTimes;

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
    const resolvedMode = resolveProviderAudioMode(p, mode);
    setAudioMode(resolvedMode);
    localStorage.setItem("kittyProvider", p);
    localStorage.setItem("kittyAudioMode", resolvedMode);
    if (mode === "dub") {
      applyStreamAudio(animeHasDub ? "dub" : "sub");
    } else if (mode === "sub" || mode === "hardsub") {
      applyStreamAudio("sub");
    }
    if (resolvedMode !== "multi" || !MULTI_ROW_PROVIDERS.has(p)) {
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
    if (p === "AniNeko") {
      const server = defaultAninekoServerForMode(mode);
      setAninekoServer(server);
      localStorage.setItem("aninekoServer", server);
    }
    if (p === "AniWaves") {
      const server = defaultAniwavesServerForMode(mode);
      setAniwavesServer(server);
      localStorage.setItem("aniwavesServer", server);
    }
    if (p === "AniKuro") {
      const server = defaultAnikuroServerForMode(mode);
      setAnikuroServer(server);
      localStorage.setItem("anikuroServer", server);
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

  const handleAninekoServerChange = (server: AninekoServerId) => {
    preservePlaybackPosition();
    setProvider("AniNeko");
    setAninekoServer(server);
    localStorage.setItem("kittyProvider", "AniNeko");
    localStorage.setItem("aninekoServer", server);
  };

  const handleAniwavesServerChange = (server: AniwavesServerId) => {
    preservePlaybackPosition();
    setProvider("AniWaves");
    setAudioMode("multi");
    setAniwavesServer(server);
    setMultiPanel("AniWaves");
    localStorage.setItem("kittyProvider", "AniWaves");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("aniwavesServer", server);
  };

  const handleAnikuroServerChange = (server: AnikuroServerId) => {
    preservePlaybackPosition();
    setProvider("AniKuro");
    setAudioMode("multi");
    setAnikuroServer(server);
    setMultiPanel("AniKuro");
    localStorage.setItem("kittyProvider", "AniKuro");
    localStorage.setItem("kittyAudioMode", "multi");
    localStorage.setItem("anikuroServer", server);
  };

  const handleSimpleProviderChange = (p: KittyProvider) => {
    const mode: ProviderAudioMode = MULTI_ROW_PROVIDERS.has(p)
      ? "multi"
      : audioMode === "multi"
        ? streamAudio
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

  useWatchKeyboard({
    enabled: streamReady && !needsResumePrompt,
    art: artPlayer,
    seekStepSeconds,
    onPrevEpisode: handlePrevEpisode,
    onNextEpisode: handleNextEpisode,
    onToggleTheatre: () => setTheatreMode(!theatreMode),
    onCopyShareLink: copyShareLink,
    onShowShortcuts: () => setShortcutsOpen(true),
    hasPrev: Boolean(prevEpisode),
    hasNext: Boolean(nextEpisode),
  });

  // Switch to the next fallback provider (shared by fetch-failure and playback
  // failure). Returns true if it kicked off a switch, false if none is left.
  const attemptProviderFallback = useCallback((): boolean => {
    if (!providerAutoFallback || fallbackBusyRef.current) return false;

    const tried = triedProvidersRef.current;
    if (!tried.has(provider)) tried.add(provider);

    const next = getNextFallbackProvider(provider, tried);
    if (!next) return false;

    tried.add(next);
    fallbackBusyRef.current = true;
    toast.info(t("watch.providerFallback", { from: provider, to: next }));

    const mode: ProviderAudioMode = MULTI_ROW_PROVIDERS.has(next)
      ? "multi"
      : audioMode === "multi"
        ? "sub"
        : audioMode;
    handleProviderGridSelect(next, mode, true);

    window.setTimeout(() => {
      fallbackBusyRef.current = false;
    }, 1200);
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleProviderGridSelect is stable enough for fallback
  }, [providerAutoFallback, provider, audioMode, t]);

  // Stream fetch failed (provider API returned an error / 404) → fail over.
  useEffect(() => {
    if (!providerAutoFallback || !streamQueryEnabled) return;
    if (streamPending || streamReady) return;
    if (!streamFailed) return;
    if (streamError && isKittyStreamAbortError(streamError)) return;
    attemptProviderFallback();
  }, [
    providerAutoFallback,
    streamQueryEnabled,
    streamPending,
    streamReady,
    streamFailed,
    streamError,
    attemptProviderFallback,
  ]);

  // The stream loaded but HLS playback died mid-load (e.g. a 404 manifest).
  // Fail over to the next provider, resuming from the current position.
  const handleFatalPlayerError = useCallback(() => {
    if (!providerAutoFallback) return;
    // attemptProviderFallback already toasts "Switching from X to Y…".
    const switched = attemptProviderFallback();
    if (!switched) toast.error(t("watch.playbackFailed"));
  }, [providerAutoFallback, attemptProviderFallback, t]);

  if (!episodeId && !selectedEpisode) {
    if (!episodesLoading && (allEpisodes?.totalEpisodes ?? 0) === 0) {
      return (
        <div className="w-full aspect-video bg-[#030303] flex flex-col items-center justify-center gap-4 rounded-xl border border-border dark:border-white/10 ring-1 ring-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.1),transparent_60%)] pointer-events-none" />
          <Cat className="text-violet-300/30 w-12 h-12 relative z-10" />
          <div className="text-center relative z-10 px-6">
            <p className="text-muted-foreground dark:text-white/50 text-sm font-medium">{t("watch.animeNotAiredYet")}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full aspect-video bg-[#030303] flex flex-col items-center justify-center gap-4 rounded-xl border border-border dark:border-white/10 ring-1 ring-white/[0.06] shadow-2xl shadow-black/60 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.1),transparent_60%)] pointer-events-none" />
        <Cat className="text-violet-300/30 w-12 h-12 relative z-10" />
        <div className="text-center relative z-10 px-6">
          <p className="text-muted-foreground dark:text-white/50 text-sm font-medium">{t("watch.selectEpisode")}</p>
          <p className="text-muted-foreground/80 dark:text-white/25 text-[11px] font-mono mt-1.5">{t("watch.selectEpisodeHint")}</p>
        </div>
      </div>
    );
  }

  const activeEpisodeId = episodeId ?? selectedEpisode;
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
      miruroPipe={miruroPipe}
      animexServer={animexServer}
      anisnatchServer={anisnatchServer}
      lunarServer={lunarServer}
      animoServer={animoServer}
      aninekoServer={aninekoServer}
      aniwavesServer={aniwavesServer}
      anikuroServer={anikuroServer}
      onProviderChange={handleSimpleProviderChange}
      onMiruroPipeChange={handleMiruroPipeChange}
      onAnimexServerChange={handleAnimexServerChange}
      onAnisnatchServerChange={handleAnisnatchServerChange}
      onLunarServerChange={handleLunarServerChange}
      onAnimoServerChange={handleAnimoServerChange}
      onAninekoServerChange={handleAninekoServerChange}
      onAniwavesServerChange={handleAniwavesServerChange}
      onAnikuroServerChange={handleAnikuroServerChange}
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
      aninekoServer={aninekoServer}
      aniwavesServer={aniwavesServer}
      anikuroServer={anikuroServer}
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
      onAninekoServerChange={handleAninekoServerChange}
      onAniwavesServerChange={handleAniwavesServerChange}
      onAnikuroServerChange={handleAnikuroServerChange}
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
        {episodeBar}
        <WatchErrorPanel
          error={new Error(streamFailMessage)}
          onRetry={() => void retryStream()}
        />

        {streamProviderControls}
      </div>
    );
  }

  if (showStreamLoading && !useHeldPlayerShell) {
    return (
      <div className="flex flex-col gap-3">
        {episodeBar}
        <PlayerSkeleton
          label={
            currentEpisodeInfo
              ? t("watch.loadingEpisode", { n: currentEpisodeInfo.number })
              : t("watch.loadingStreamProvider", { provider })
          }
        />
        <div className="rounded-xl border border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.02] px-2.5 sm:px-3 py-3 space-y-2.5">
          <p className="text-[11px] font-mono text-muted-foreground dark:text-white/40 leading-relaxed">
            {t("watch.switchProviderWhileLoading")}
          </p>
          {streamProviderControls}
        </div>
      </div>
    );
  }

  const subtitleTracks = playerTracks.filter(isSubtitleTrack);
  const watchingHardSub = isHardSubPlayback({
    audioMode,
    streamAudio,
    provider,
    aninekoServer,
    animexServer,
    lunarServer,
  });
  const allowSoftSubsOverlay = streamAudio === "sub" && (!watchingHardSub || hardSubSoftSubs);
  const subtitlesEnabled = allowSoftSubsOverlay && autoEnableSubtitles;
  const tracksForPlayer = allowSoftSubsOverlay
    ? displayTracks
    : displayTracks.filter((track) => !isSubtitleTrack(track));

  if ((!streamReady || !streamData?.file) && !canRenderPlayerShell) {
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

  if (!resumeReady && !canRenderPlayerShell) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton label={t("watch.loadingStream")} />
        {streamProviderControls}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
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

    {episodeBar}

    <div className="flex flex-col rounded-none sm:rounded-xl overflow-hidden ring-0 sm:ring-1 ring-border dark:ring-white/10 shadow-none sm:shadow-2xl sm:shadow-black/60 bg-black">
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
      <KittyPlayer
        key={displayPlayerKey}
        src={displayFile}
        tracks={tracksForPlayer}
        headers={displayHeaders}
        qualities={displayQualities}
        preferSubtitles={subtitlesEnabled}
        preferDubAudio={streamAudio === "dub"}
        skipTimes={displaySkipTimes}
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
        onFatalError={handleFatalPlayerError}
        onPlayerReady={handlePlayerReady}
        w2g={playerW2g}
      />
      {showTransitionOverlay && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] pointer-events-none"
          aria-live="polite"
        >
          <Loader2 className="w-9 h-9 animate-spin text-white/75" />
          <p className="mt-3 text-[11px] font-mono text-white/60">
            {currentEpisodeInfo
              ? t("watch.loadingEpisode", { n: currentEpisodeInfo.number })
              : t("watch.loadingStreamProvider", { provider })}
          </p>
        </div>
      )}
      </>
      )}
      </div>

      <WatchPlayerToolbar
        provider={provider}
        hasPrev={Boolean(prevEpisode)}
        hasNext={Boolean(nextEpisode)}
        prevEpisodeNumber={prevEpisode?.number}
        nextEpisodeNumber={nextEpisode?.number}
        onPrev={handlePrevEpisode}
        onNext={handleNextEpisode}
        onShowShortcuts={() => setShortcutsOpen(true)}
        onOpenComments={watchPage ? () => watchPage.openComments("episode") : undefined}
        onSubmitSkipTimes={
          anilistId && episodeNumberParsed != null
            ? () => setSkipSubmitOpen(true)
            : undefined
        }
      />

      {/* Controls bar */}
      <div className="px-3 py-2.5 sm:px-3 sm:py-3 bg-gradient-to-b from-[#0a0a0a] to-[#070707] border-t border-border dark:border-white/8 space-y-2 sm:space-y-2.5">
        <PlayerSettingsBar watchingHardSub={watchingHardSub && streamAudio === "sub"} />

        {showPlayerControls && (
          <>
        {providerControlsBlock}

        {/* Row 2 — badges + actions */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:mr-auto min-w-0">
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
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300/90">
                {streamData.miruroPipe}
              </span>
            )}
            {streamData?.server && providerHasNativeSubs(provider) && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-teal-500/10 border border-teal-500/20 text-teal-300/90">
                {streamData.server}
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
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-500/10 border border-teal-500/20 text-teal-300/90 truncate max-w-[120px]"
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
              aria-label={t("watch.copyLink")}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70 transition-colors"
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
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border border-border dark:border-white/12 text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white/70 transition-colors"
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
  label,
}: {
  dim?: boolean;
  label?: string;
}) => {
  const t = useT();
  return (
  <div
    role="status"
    aria-busy="true"
    aria-live="polite"
    aria-label={label ?? t("watch.loadingStream")}
    className={`relative w-full aspect-video rounded-xl bg-[#030303] border border-border dark:border-white/[0.08] flex flex-col items-center justify-center gap-3 overflow-hidden shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.06] ${dim ? "opacity-40" : ""}`}
  >
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(124,58,237,0.08),transparent_60%)] pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/90 via-background/50 dark:via-black/40 to-transparent pointer-events-none" />
    <div className="absolute inset-x-4 bottom-4 flex flex-col gap-2 pointer-events-none">
      <div className="h-1 w-full rounded-full bg-accent dark:bg-white/[0.06] overflow-hidden">
        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-violet-600/40 to-violet-400/40 animate-pulse" />
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
