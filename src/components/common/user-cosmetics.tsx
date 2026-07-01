"use client";

import React from "react";
import Image from "next/image";
import {
  getIconEmoji,
  getIconImageUrl,
  getStickerEmoji,
  getStickerImageUrl,
  isLargeSticker,
} from "@/lib/shop/catalog";
import { cn } from "@/lib/core/utils";

export function CosmeticUsername({
  username,
  iconSlug,
  className,
}: {
  username: string;
  iconSlug?: string | null;
  className?: string;
}) {
  const iconImage = getIconImageUrl(iconSlug);
  const icon = getIconEmoji(iconSlug);

  return (
    <span className={cn("inline-flex items-center gap-1 min-w-0", className)}>
      {iconImage ? (
        <Image
          src={iconImage}
          alt=""
          width={18}
          height={18}
          unoptimized
          className="shrink-0"
          aria-hidden
        />
      ) : icon ? (
        <span className="text-[13px] leading-none shrink-0" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className="truncate">{username}</span>
    </span>
  );
}

export function ProfileStickerBadge({
  stickerSlug,
  className,
}: {
  stickerSlug?: string | null;
  className?: string;
}) {
  const stickerImage = getStickerImageUrl(stickerSlug);
  const sticker = getStickerEmoji(stickerSlug);
  const large = isLargeSticker(stickerSlug);

  if (!stickerImage && !sticker) return null;

  if (stickerImage) {
    const size = large ? 96 : 72;
    return (
      <Image
        src={stickerImage}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={cn(
          "absolute z-10 select-none pointer-events-none object-contain",
          large && "md:w-[112px] md:h-[112px] mix-blend-screen drop-shadow-[0_6px_18px_rgba(0,0,0,0.75)]",
          !large && "drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={cn(
        "absolute z-10 text-3xl md:text-4xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none pointer-events-none",
        className,
      )}
      aria-hidden
    >
      {sticker}
    </span>
  );
}
