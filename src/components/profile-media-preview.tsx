"use client";

import Image from "next/image";
import { isLikelyAnimatedMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  variant: "banner" | "avatar";
  className?: string;
};

export default function ProfileMediaPreview({ src, alt, variant, className }: Props) {
  const animated = isLikelyAnimatedMediaUrl(src);

  if (animated) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          "object-cover w-full h-full",
          variant === "avatar" && "rounded-full",
          className,
        )}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      className={cn("object-cover", variant === "avatar" && "rounded-full", className)}
    />
  );
}
