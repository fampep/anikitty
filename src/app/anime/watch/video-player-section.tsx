"use client";

import React, { useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
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

  // Quality server selected from allServers (null = default top-level file)
  const [selectedServer, setSelectedServer] = useState<KittyServer | null>(null);

  const audio: "sub" | "dub" = preferDub ? "dub" : "sub";
  const anilistId = anime?.anime?.info?.anilistId;

  const episodeNo = selectedEpisode?.startsWith("ep-")
    ? selectedEpisode.replace("ep-", "")
    : selectedEpisode ?? "";

  const {
    data: streamData,
    isLoading,
    error: streamError,
    refetch: retryStream,
  } = useGetKittyStream(anilistId, episodeNo || undefined, audio, provider);

  // Parse skip/chapter times from the stream's own chapter track files
  const { data: skipTimes } = useSkipTimes(streamData?.tracks);

  // Reset server selection when stream changes
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
      <div className="w-full aspect-video bg-[#020f04] flex flex-col items-center justify-center gap-3 rounded-xl border border-green-900/40">
        <Cat className="text-green-600 w-12 h-12 opacity-40" />
        <p className="text-green-700 text-sm font-mono">
          select an episode to start watching ~ nya~
        </p>
      </div>
    );
  }

  if (isLoading) return <PlayerSkeleton />;

  const upstreamError = (streamError as any)?.response?.data?.error as
    | string
    | undefined;

  if (streamError || !streamData?.file) {
    return (
      <div className="flex flex-col gap-3">
        <PlayerSkeleton dim />
        <Alert className="border-green-900/50 bg-green-950/20 rounded-xl">
          <AlertCircle className="h-4 w-4 text-green-500" />
          <AlertTitle className="text-green-300 font-semibold">
            Stream unavailable on {provider}
          </AlertTitle>
          <AlertDescription className="text-green-600 text-xs mt-1">
            {upstreamError ??
              "This provider couldn't find the stream. Try a different one below."}
          </AlertDescription>
        </Alert>

        {/* Quick provider switcher */}
        <div className="flex flex-wrap gap-1.5">
          {KITTY_PROVIDERS.map((p) => (
            <button
              key={p}
              onClick={() => handleProviderChange(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                p === provider
                  ? "bg-green-700 border-green-500 text-white"
                  : "bg-transparent border-green-900/60 text-green-700 hover:border-green-600 hover:text-green-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="border-green-800 text-green-400 hover:bg-green-950 w-fit text-xs"
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
    <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-green-900/30">
      <KittyPlayer
        key={`${anilistId}-${episodeNo}-${audio}-${provider}-${selectedServer?.quality ?? "default"}`}
        src={effectiveSrc}
        poster={anime?.anime?.info?.poster}
        tracks={streamData.tracks}
        headers={effectiveHeaders}
        skipTimes={skipTimes}
      />

      {/* ── Controls bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-[#020f04]/95 border-t border-green-900/30">

        {/* Left — identity */}
        <div className="flex items-center gap-2 mr-auto min-w-0">
          <span className="text-sm select-none shrink-0">🐱</span>
          <div className="flex flex-col min-w-0 hidden sm:flex">
            {streamData.server && (
              <span className="text-[11px] font-mono text-green-500 truncate max-w-[180px] leading-none">
                {streamData.server}
              </span>
            )}
            <span className="text-[10px] font-mono text-green-800 leading-none mt-0.5">
              kittyapi.buzz
            </span>
          </div>

          {episodeNo && (
            <Badge className="bg-green-900/50 text-green-300 border border-green-800/60 text-[10px] px-1.5 py-0 h-4 font-mono shrink-0">
              EP {episodeNo}
            </Badge>
          )}

          {streamData.cached && (
            <span title="Cached stream" className="hidden sm:inline">
              <CheckCircle2 className="w-3 h-3 text-green-700" />
            </span>
          )}

          {(skipTimes?.intro || skipTimes?.outro) && (
            <Badge className="bg-green-950/60 text-green-600 border border-green-900/40 text-[10px] px-1.5 py-0 h-4 hidden sm:inline-flex">
              chapters
            </Badge>
          )}
        </div>

        {/* Centre — quality / server switcher (only when allServers available) */}
        {hasMultipleServers && (
          <div className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-green-700 shrink-0" />
            <select
              value={selectedServer?.quality ?? ""}
              onChange={(e) => {
                const s =
                  streamData.allServers!.find(
                    (sv) => sv.quality === e.target.value,
                  ) ?? null;
                setSelectedServer(s);
              }}
              className="bg-[#020f04] border border-green-900/60 text-green-400 text-[11px] font-mono rounded px-1.5 py-0.5 h-6 cursor-pointer hover:border-green-600 focus:outline-none focus:border-green-500"
            >
              <option value="">Default</option>
              {streamData.allServers!.map((sv) => (
                <option key={sv.quality} value={sv.quality} className="bg-[#020f04]">
                  {sv.quality}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Provider selector */}
        <div className="flex items-center gap-1">
          <Server className="w-3 h-3 text-green-700 shrink-0" />
          <select
            value={provider}
            onChange={(e) => handleProviderChange(e.target.value as KittyProvider)}
            className="bg-[#020f04] border border-green-900/60 text-green-400 text-[11px] font-mono rounded px-1.5 py-0.5 h-6 cursor-pointer hover:border-green-600 focus:outline-none focus:border-green-500"
          >
            {KITTY_PROVIDERS.map((p) => (
              <option key={p} value={p} className="bg-[#020f04]">
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Sub / Dub */}
        <div className="flex items-center rounded-md overflow-hidden border border-green-900/50">
          <Button
            size="sm"
            className={`h-6 px-2.5 text-[11px] font-bold gap-1 rounded-none border-0 ${
              !preferDub
                ? "bg-green-700 text-white hover:bg-green-600"
                : "bg-transparent text-green-700 hover:bg-green-950"
            }`}
            onClick={() => {
              localStorage.setItem("preferDub", "false");
              setPreferDub(false);
            }}
          >
            <Captions className="w-3 h-3" />
            SUB
          </Button>
          <div className="w-px h-4 bg-green-900/60" />
          <Button
            size="sm"
            className={`h-6 px-2.5 text-[11px] font-bold gap-1 rounded-none border-0 ${
              preferDub
                ? "bg-green-700 text-white hover:bg-green-600"
                : "bg-transparent text-green-700 hover:bg-green-950"
            }`}
            onClick={() => {
              localStorage.setItem("preferDub", "true");
              setPreferDub(true);
            }}
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
    className={`w-full aspect-video rounded-xl bg-[#020f04] border border-green-900/30 flex flex-col items-center justify-center gap-3 ${
      dim ? "opacity-40" : ""
    }`}
  >
    <Loader2 className="w-7 h-7 text-green-600 animate-spin" />
    <p className="text-green-800 text-[11px] font-mono tracking-widest animate-pulse">
      fetching stream ~ nya~
    </p>
  </div>
);

export default VideoPlayerSection;
