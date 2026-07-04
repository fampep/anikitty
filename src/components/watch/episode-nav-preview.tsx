"use client";

import React, { useId, useRef, useState } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/core/utils";

type PreviewProps = {
  image: string | null;
  title?: string;
  episodeNumber?: number;
  live?: boolean;
};

function PreviewPopover({ image, title, episodeNumber, live }: PreviewProps) {
  return (
    <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 w-[min(14rem,70vw)] -translate-x-1/2 animate-in fade-in zoom-in-95 duration-150">
      <div className="rounded-lg overflow-hidden border border-white/15 bg-[#0a0a0a] shadow-xl shadow-black/60 ring-1 ring-white/10">
        <div className="relative aspect-video bg-black/80">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04]">
              <Play className="w-6 h-6 text-white/25 fill-white/25" />
            </div>
          )}
          {episodeNumber != null && (
            <span className="absolute bottom-1 left-1 z-[1] px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-black/75 text-white/90">
              {episodeNumber}
            </span>
          )}
          {live && (
            <span className="absolute top-1 right-1 z-[1] px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wide bg-teal-500/20 border border-teal-400/30 text-teal-300/90">
              Live
            </span>
          )}
        </div>
        {title ? (
          <p className="px-2 py-1.5 text-[10px] font-medium text-white/75 leading-snug line-clamp-2">{title}</p>
        ) : null}
      </div>
    </div>
  );
}

type EpisodeThumbPreviewProps = {
  children: React.ReactNode;
  className?: string;
  title: string;
  episodeNumber: number;
  fallbackImage?: string | null;
  resolvePreviewImage?: () => string | null;
};

/** Hover preview on the current-episode thumbnail (live frame when available). */
export function EpisodeThumbPreview({
  children,
  className,
  title,
  episodeNumber,
  fallbackImage,
  resolvePreviewImage,
}: EpisodeThumbPreviewProps) {
  const [hover, setHover] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewLive, setPreviewLive] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const handleEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    const live = resolvePreviewImage?.() ?? null;
    if (live) {
      setPreviewImage(live);
      setPreviewLive(true);
    } else {
      setPreviewImage(fallbackImage ?? null);
      setPreviewLive(false);
    }
    setHover(true);
  };

  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => {
      setHover(false);
      setPreviewImage(null);
      setPreviewLive(false);
    }, 80);
  };

  return (
    <div
      className={cn("relative shrink-0", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      aria-describedby={hover ? tooltipId : undefined}
    >
      {hover && (
        <div id={tooltipId} role="tooltip">
          <PreviewPopover
            image={previewImage}
            title={title}
            episodeNumber={episodeNumber}
            live={previewLive}
          />
        </div>
      )}
      {children}
    </div>
  );
}
