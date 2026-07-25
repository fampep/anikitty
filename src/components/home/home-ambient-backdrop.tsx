"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils";

type Props = {
  imageUrl?: string | null;
  className?: string;
  /** `hero` = home top wash; `page` = taller anime/watch page wash. */
  variant?: "hero" | "page";
};

export default function HomeAmbientBackdrop({
  imageUrl,
  className,
  variant = "hero",
}: Props) {
  const src = imageUrl?.trim();
  if (!src) return null;

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden",
        variant === "page"
          ? "absolute inset-x-0 top-0 -z-10 h-[min(100%,960px)] min-h-[min(100dvh,880px)]"
          : "absolute inset-x-0 top-0 -z-10 h-[min(var(--home-hero-max-h),720px)]",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "relative size-full scale-110",
          variant === "page"
            ? "blur-3xl brightness-[0.42] dark:brightness-[0.16] saturate-[1.05]"
            : "blur-2xl brightness-[0.35] dark:brightness-[0.12]",
        )}
      >
        <Image
          src={src}
          alt=""
          fill
          sizes="100vw"
          className={cn(
            "object-cover",
            variant === "page" ? "object-center" : "object-top",
          )}
          priority={variant === "hero"}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-transparent to-background dark:to-[#09090b]",
          variant === "page"
            ? "via-background/55 dark:via-[#09090b]/70"
            : "via-background/40 dark:via-[#09090b]/60",
        )}
      />
      {variant === "page" ? (
        <div className="absolute inset-0 bg-background/25 dark:bg-[#09090b]/35" />
      ) : null}
    </div>
  );
}
