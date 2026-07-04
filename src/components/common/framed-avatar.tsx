"use client";

import React from "react";
import Image from "next/image";
import Avatar from "@/components/common/avatar";
import { cn } from "@/lib/core/utils";
import { getFrameClass, getFrameImageUrl } from "@/lib/shop/catalog";

type Props = {
  url?: string;
  username?: string;
  className?: string;
  frameSlug?: string | null;
  onClick?: () => void;
};

export default function FramedAvatar({
  url,
  username,
  className,
  frameSlug,
  onClick,
}: Props) {
  const frameImage = getFrameImageUrl(frameSlug);
  const frameClass = frameImage ? undefined : (getFrameClass(frameSlug) ?? "ring-1 ring-border dark:ring-white/10");

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center shrink-0",
        frameClass,
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
    >
      <Avatar
        url={url}
        username={username}
        className={cn("rounded-full", frameImage ? "w-[82%] h-[82%]" : "w-full h-full")}
      />
      {frameImage && (
        <Image
          src={frameImage}
          alt=""
          aria-hidden
          fill
          unoptimized
          className="pointer-events-none object-contain"
        />
      )}
    </div>
  );
}
