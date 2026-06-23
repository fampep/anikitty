"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import dynamic from "next/dynamic";
import {
  useGetKittyStream,
  KITTY_PROVIDERS,
  KittyProvider,
  KittyServer,
} from "@/query/get-kitty-stream";
import { useSkipTimes } from "@/query/use-aniskip";
import {
  Captions,
  Mic,
  Loader2,
  AlertCircle,
  Cat,
  Server,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const KittyPlayer = dynamic(() => import("@/components/kitty-player"), {
  ssr: false,
  loading: () => <PlayerSkeleton />,
});

const DEFAULT_PROVIDER: KittyProvider = "Miruro";

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const episodeId = searchParams.get("episode");
  const { selectedEpisode, anime } = useAnimeStore();

  const [preferDub, setPreferDub] = useState<boolean>(() => {
    if (typeof window !== "undefined")
      return localStorage.getItem("preferDub") === "true";
    return false;
  });

  const [provider, setProvider] = useState<KittyProvider>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("kittyProvider");
      if (saved && KITTY_PROVIDERS.includes(saved as KittyProvider))
        return saved as KittyProvider;
    }
    return DEFAULT_PROVIDER;
  });

  const [selectedServer, setSelectedServer] = useState<KittyServer | null>(null);

  const audio: "sub" | "dub" = preferDub ? "dub" : "sub";
  const anilistId = anime?.anime?.info?.anilistId;

  const episodeNo = selectedEpisode?.startsWith("ep-")
    ? selectedEpisode.replace("ep-", "")
    : selectedEpisode ?? "";

  // ── Progress tracking ────────────────────────────────────────────
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({ populate: false });
  const bookmarkIdRef   = useRef<string | null>(null);
  const watchedIdRef    = useRef<string | null>(null);

  useEffect(() => {
    bookmarkIdRef.current = null;
    watchedIdRef.current  = null;
  }, [episodeId]);

  const handleStart = useCallback(async () => {
    if (!auth || !anime?.anime?.info) return;
    const { id: animeSlug, name, poster } = anime.anime.info;
    const bId = await createOrUpdateBookMark(animeSlug, name, poster, "watching", false);
    bookmarkIdRef.current = bId;
  }, [auth, anime, createOrUpdateBookMark]);

  const handleProgress = useCallback(async (current: number, duration: number) => {
    if (!auth || !bookmarkIdRef.current || !episodeId || !episodeNo) return;
    watchedIdRef.current = await syncWatchProgress(
      bookmarkIdRef.current,
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
  }, [auth, episodeId, episodeNo, audio, provider, syncWatchProgress]);

  const {
    data: streamData,
    isLoading,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(anilistId, episodeNo || undefined, audio, provider);

  const { data: skipTimes } = useSkipTimes(streamData?.tracks);

  const effectiveSrc = selectedServer?.file ?? streamData?.file ?? "";
  const effectiveHeaders =
    (selectedServer?.headers && Object.keys(selectedServer.headers).length > 0
      ? selectedServer.headers
      : streamData?.headers) ?? {};

  const handleProviderChange = (p: KittyProvider) => {
    setProvider(p);
    setSelectedServer(null);
    localStorage.setItem("kittyProvider", p);
  };

  if (!episodeId && !selectedEpisode) {
    return (
      <div className="w-full aspect-video bg-black flex flex-col items-center justify-center gap-3 rounded-xl border border-white/10">
        <Cat className="text-white/20 w-12 h-12" />
        <p className="text-white/30 text-sm font-mono">
          select an episode to start watching
        </p>
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
            {upstreamError ?? "This provider couldn't find the stream. Try a different one below."}
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

  const hasMultipleServers =
    Array.isArray(streamData.allServers) && streamData.allServers.length > 1;

  return (
    <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-white/10">
      <KittyPlayer
        key={`${anilistId}-${episodeNo}-${audio}-${provider}-${selectedServer?.quality ?? "default"}`}
        src={effectiveSrc}
        poster={anime?.anime?.info?.poster}
        tracks={streamData.tracks}
        headers={effectiveHeaders}
        skipTimes={skipTimes}
        onStart={handleStart}
        onProgress={handleProgress}
      />

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-black/95 border-t border-white/10">

        {/* Left — identity */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <span className="text-sm select-none shrink-0">🐱</span>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            {streamData.server && (
              <span className="text-[11px] font-mono text-white/60 truncate max-w-[180px] leading-none">
                {streamData.server}
              </span>
            )}
            <span className="text-[10px] font-mono text-white/25 leading-none mt-0.5">
              kittyapi.buzz
            </span>
          </div>

          {episodeNo && (
            <Badge className="bg-white/10 text-white/70 border border-white/15 text-[10px] px-1.5 py-0 h-4 font-mono shrink-0">
              EP {episodeNo}
            </Badge>
          )}

          {streamData.cached && (
            <span title="Cached stream" className="hidden sm:inline">
              <CheckCircle2 className="w-3 h-3 text-white/30" />
            </span>
          )}

          {(skipTimes?.intro || skipTimes?.outro) && (
            <Badge className="bg-white/5 text-white/40 border border-white/10 text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
              chapters
            </Badge>
          )}
        </div>

        {/* Quality / server switcher */}
        {hasMultipleServers && (
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-white/35 shrink-0" />
            <select
              value={selectedServer?.quality ?? ""}
              onChange={(e) => {
                const s = streamData.allServers!.find((sv) => sv.quality === e.target.value) ?? null;
                setSelectedServer(s);
              }}
              className="bg-black border border-white/15 text-white/60 text-[11px] font-mono rounded px-1.5 py-0.5 h-6 cursor-pointer hover:border-white/30 focus:outline-none"
            >
              <option value="">Default</option>
              {streamData.allServers!.map((sv) => (
                <option key={sv.quality} value={sv.quality} className="bg-black">
                  {sv.quality}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Provider selector */}
        <div className="flex items-center gap-1">
          <Server className="w-3 h-3 text-white/35 shrink-0" />
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as KittyProvider)}
            className="bg-black border border-white/15 text-white/60 text-[11px] font-mono rounded px-1.5 py-0.5 h-6 cursor-pointer hover:border-white/30 focus:outline-none"
          >
            {KITTY_PROVIDERS.map((p) => (
              <option key={p} value={p} className="bg-black">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Sub / Dub */}
        <div className="flex items-center rounded-md overflow-hidden border border-white/15">
          <Button
            size="sm"
            className={`h-6 px-2.5 text-[11px] font-bold gap-1 rounded-none border-0 ${
              !preferDub
                ? "bg-white/15 text-white hover:bg-white/20"
                : "bg-transparent text-white/40 hover:bg-white/10"
            }`}
            onClick={() => { localStorage.setItem("preferDub", "false"); setPreferDub(false); }}
          >
            <Captions className="w-3 h-3" />
            SUB
          </Button>
          <div className="w-px h-4 bg-white/15" />
          <Button
            size="sm"
            className={`h-6 px-2.5 text-[11px] font-bold gap-1 rounded-none border-0 ${
              preferDub
                ? "bg-white/15 text-white hover:bg-white/20"
                : "bg-transparent text-white/40 hover:bg-white/10"
            }`}
            onClick={() => { localStorage.setItem("preferDub", "true"); setPreferDub(true); }}
          >
            <Mic className="w-3 h-3" />
            DUB
          </Button>
        </div>
      </div>
    </div>
  );
};

const PlayerSkeleton = ({ dim = false }: { dim?: boolean }) => (
  <div
    className={`w-full aspect-video rounded-xl bg-black border border-white/10 flex flex-col items-center justify-center gap-3 ${
      dim ? "opacity-40" : ""
    }`}
  >
    <Loader2 className="w-7 h-7 text-white/30 animate-spin" />
    <p className="text-white/20 text-[11px] font-mono tracking-widest animate-pulse">
      fetching stream...
    </p>
  </div>
);

export default VideoPlayerSection;
