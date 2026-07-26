"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils";
import { useSettingsStore } from "@/store/settings-store";

type Props = {
  imageUrl?: string | null;
  className?: string;
  /**
   * `hero` = home top wash;
   * `page` = taller anime detail wash;
   * `watch` = mirrored, transparent poster behind the player.
   */
  variant?: "hero" | "page" | "watch";
};

/**
 * Soft color wash behind hero / detail / watch pages.
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

  if (variant === "watch") {
    return (
      <div
        className={cn(
          "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
          className,
        )}
        aria-hidden
      >
        {/* Primary mirrored poster — dark cinematic wash */}
        <div className="absolute inset-[-6%] opacity-[0.55] dark:opacity-[0.46]">
          <Image
            src={src}
            alt=""
            fill
            sizes="45vw"
            quality={40}
            className="mirror object-cover object-[center_16%] brightness-[0.58] contrast-[1.08] saturate-[1.15] dark:brightness-[0.48] dark:contrast-[1.12] dark:saturate-[1.22]"
            priority={false}
          />
        </div>

        {/* Soft color bloom behind the player */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_48%_at_50%_8%,rgba(255,255,255,0.16),transparent_55%)] dark:bg-[radial-gradient(ellipse_95%_52%_at_50%_6%,rgba(255,255,255,0.11),transparent_52%)]" />

        {/* Deep side curtains — frames the stage in dark */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.62)_0%,transparent_18%,transparent_82%,rgba(9,9,11,0.62)_100%)] dark:bg-[linear-gradient(90deg,#050505_0%,rgba(5,5,5,0.55)_12%,transparent_28%,transparent_72%,rgba(5,5,5,0.55)_88%,#050505_100%)]" />

        {/* Readable content + rich dark fade */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-background/62 to-background dark:from-[#050505]/25 dark:via-[#09090b]/68 dark:to-[#09090b]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_58%_at_50%_36%,transparent_22%,rgba(9,9,11,0.5)_100%)] dark:bg-[radial-gradient(ellipse_68%_58%_at_50%_34%,transparent_12%,rgba(5,5,5,0.78)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-background via-background/88 to-transparent dark:from-[#09090b] dark:via-[#09090b]/92" />

        {/* Extra dark top edge so nav chrome stays clean */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/70 to-transparent dark:from-[#050505]/85 dark:via-[#050505]/40" />
      </div>
    );
  }

  const isPage = variant === "page";

  return (
    <div
      className={cn(
        "pointer-events-none overflow-hidden",
        isPage
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
            isPage ? "object-center" : "object-top",
          )}
          // Never compete with the real hero poster for LCP.
          priority={false}
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background dark:from-[#09090b]/40 dark:via-[#09090b]/80 dark:to-[#09090b]" />
    </div>
  );
}
