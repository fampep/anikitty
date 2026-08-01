"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";
import type Hls from "hls.js";
import { cn } from "@/lib/core/utils";

type Stats = {
  resolution: string;
  fps: string;
  bitrateKbps: string;
  videoCodec: string;
  audioCodec: string;
  bufferSecs: string;
  quality: string;
  downloadMbps: string;
  droppedFrames: string;
  latencyMs: string;
  manifestUrl: string;
};

const EMPTY_STATS: Stats = {
  resolution: "—",
  fps: "—",
  bitrateKbps: "—",
  videoCodec: "—",
  audioCodec: "—",
  bufferSecs: "—",
  quality: "—",
  downloadMbps: "—",
  droppedFrames: "—",
  latencyMs: "—",
  manifestUrl: "—",
};

function readStats(video: HTMLVideoElement | null, hls: Hls | null): Stats {
  if (!video) return EMPTY_STATS;

  const resolution =
    video.videoWidth && video.videoHeight
      ? `${video.videoWidth}×${video.videoHeight}`
      : "—";

  let fps = "—";
  let bitrateKbps = "—";
  let videoCodec = "—";
  let audioCodec = "—";
  let quality = "Auto";
  let downloadMbps = "—";
  let manifestUrl = "—";

  if (hls) {
    manifestUrl = hls.url ?? "—";
    downloadMbps = hls.bandwidthEstimate
      ? (hls.bandwidthEstimate / 1_000_000).toFixed(2)
      : "—";
    const level = hls.levels?.[hls.currentLevel];
    if (level) {
      fps = level.frameRate ? level.frameRate.toFixed(2) : "—";
      bitrateKbps = level.bitrate ? Math.round(level.bitrate / 1000).toString() : "—";
      videoCodec = level.videoCodec ?? "—";
      audioCodec = level.audioCodec ?? "—";
      quality = hls.autoLevelEnabled
        ? `Auto (${level.height ?? "?"}p)`
        : `${level.height ?? "?"}p`;
    }
  }

  let bufferSecs = "—";
  try {
    const buffered = video.buffered;
    if (buffered.length > 0) {
      for (let i = 0; i < buffered.length; i++) {
        if (video.currentTime >= buffered.start(i) && video.currentTime <= buffered.end(i)) {
          bufferSecs = (buffered.end(i) - video.currentTime).toFixed(1);
          break;
        }
      }
    }
  } catch {
    /* ignore */
  }

  let droppedFrames = "—";
  try {
    const vpq = video.getVideoPlaybackQuality?.();
    if (vpq) {
      droppedFrames = `${vpq.droppedVideoFrames} / ${vpq.totalVideoFrames}`;
    }
  } catch {
    /* not supported */
  }

  return {
    resolution,
    fps,
    bitrateKbps,
    videoCodec,
    audioCodec,
    bufferSecs,
    quality,
    downloadMbps,
    droppedFrames,
    latencyMs: "—",
    manifestUrl,
  };
}

export function StatsOverlay({
  video,
  hlsRef,
  provider,
  startupMs,
  debug,
  className,
}: {
  video: HTMLVideoElement | null;
  hlsRef: RefObject<Hls | null>;
  provider?: string;
  /** Wall-clock ms from stream request to first playable frame. */
  startupMs: number | null;
  /** Also show the raw manifest URL — off by default (may leak signed tokens). */
  debug?: boolean;
  className?: string;
}) {
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);

  useEffect(() => {
    const tick = () => setStats(readStats(video, hlsRef.current));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [video, hlsRef]);

  const rows: [string, string][] = [
    ["Provider", provider ?? "—"],
    ["Resolution", stats.resolution],
    ["Quality", stats.quality],
    ["FPS", stats.fps],
    ["Bitrate", stats.bitrateKbps === "—" ? "—" : `${stats.bitrateKbps} kbps`],
    ["Video codec", stats.videoCodec],
    ["Audio codec", stats.audioCodec],
    ["Buffer", stats.bufferSecs === "—" ? "—" : `${stats.bufferSecs}s`],
    ["Download", stats.downloadMbps === "—" ? "—" : `${stats.downloadMbps} Mbps`],
    ["Dropped frames", stats.droppedFrames],
    ["Startup time", startupMs != null ? `${startupMs}ms` : "—"],
  ];
  if (debug) rows.push(["Manifest", stats.manifestUrl]);

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-2 top-2 z-40 max-w-[min(90%,20rem)] select-none",
        "rounded-md border border-white/15 bg-black/80 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-white/85 backdrop-blur-sm",
        className,
      )}
    >
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3">
          <span className="shrink-0 text-white/45">{label}</span>
          <span className="min-w-0 truncate text-right text-white/90">{value}</span>
        </div>
      ))}
    </div>
  );
}
