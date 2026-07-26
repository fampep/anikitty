"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";

type Props = {
  imageUrl?: string | null;
  className?: string;
  /** `hero` = home top wash; `page` = taller anime/watch page wash. */
  variant?: "hero" | "page";
};

/**
 * Soft color wash behind hero / detail pages.
 * Uses a tiny downscaled image (no CSS blur filter) so we don't keep a
 * full-viewport blurred bitmap in GPU memory.
 */
export default function HomeAmbientBackdrop({
  imageUrl,
  className,
  variant = "hero",
}: Props) {
  const liteMode = useSettingsStore((s) => s.liteMode);
  const src = imageUrl?.trim();
  if (!src || liteMode) return null;

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden",
        variant === "page"
          ? "absolute inset-x-0 top-0 -z-10 h-[min(100%,720px)] min-h-[min(70dvh,640px)]"
          : "absolute inset-x-0 top-0 -z-10 h-[min(var(--home-hero-max-h),560px)]",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 opacity-50 dark:opacity-35">
        <Image
          src={src}
          alt=""
          fill
          sizes="20vw"
          quality={35}
          className={cn(
            "object-cover scale-105 brightness-[0.55] dark:brightness-[0.28] saturate-[0.85]",
            variant === "page" ? "object-center" : "object-top",
          )}
          // Never compete with the real hero poster for LCP.
          priority={false}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background dark:from-[#09090b]/40 dark:via-[#09090b]/80 dark:to-[#09090b]",
        )}
      />
    </div>
  );
}
