"use client";

import { gifDisplayUrl, isGifVideoUrl } from "@/lib/core/gif-url";
import { cn } from "@/lib/core/utils";

export function GifImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const displaySrc = gifDisplayUrl(src);

  if (isGifVideoUrl(src)) {
    return (
      <video
        src={displaySrc}
        autoPlay
        loop
        muted
        playsInline
        className={cn(className)}
        aria-label={alt}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn(className)}
    />
  );
}
