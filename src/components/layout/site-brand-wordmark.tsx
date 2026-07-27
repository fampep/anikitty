"use client";

import { cn } from "@/lib/core/utils";
import { nightTokyo } from "@/utils/fonts";

type Props = {
  className?: string;
  /** Landing / hero sizes vs compact chrome. */
  size?: "nav" | "footer" | "landing";
};

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  nav: "text-[1.35rem] sm:text-[1.5rem] tracking-[0.18em]",
  footer: "text-[1.35rem] tracking-[0.18em]",
  landing: "text-[1.65rem] sm:text-[1.85rem] tracking-[0.2em]",
};

/** Theme-aware AniKitty wordmark — NightinTokyo, matches landing brand type. */
export default function SiteBrandWordmark({ className, size = "nav" }: Props) {
  return (
    <span
      className={cn(
        nightTokyo.className,
        "inline-flex items-baseline leading-none select-none",
        SIZE[size],
        className,
      )}
      aria-label="AniKitty"
    >
      <span className="text-foreground dark:text-white">Ani</span>
      <span className="bg-gradient-to-br from-foreground/70 via-foreground/45 to-foreground/25 bg-clip-text text-transparent dark:from-zinc-300 dark:via-zinc-200/75 dark:to-white/30">
        Kitty
      </span>
    </span>
  );
}
