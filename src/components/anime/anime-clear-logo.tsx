"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/core/utils";

type Props = {
  name: string;
  logoUrl?: string | null;
  href?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS = {
  sm: "h-8 sm:h-9 max-w-[200px] sm:max-w-[240px]",
  md: "h-10 sm:h-12 max-w-[260px] sm:max-w-[320px]",
  lg: "h-12 sm:h-16 md:h-[4.5rem] max-w-[280px] sm:max-w-[360px] md:max-w-[420px]",
} as const;

const PLAINTEXT_TITLE_CLASS = {
  sm: "text-xs sm:text-sm font-semibold",
  md: "text-sm sm:text-base font-semibold",
  lg: "text-sm sm:text-base md:text-lg font-semibold",
} as const;

export default function AnimeClearLogo({
  name,
  logoUrl,
  href,
  className,
  size = "md",
}: Props) {
  const content = logoUrl ? (
    <>
      <Image
        src={logoUrl}
        alt=""
        width={420}
        height={120}
        className={cn("w-auto object-contain object-left drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]", SIZE_CLASS[size])}
        unoptimized
        priority
      />
      <p
        className={cn(
          "text-foreground/90 dark:text-white/85 tracking-tight leading-snug line-clamp-2",
          PLAINTEXT_TITLE_CLASS[size],
        )}
      >
        {name}
      </p>
    </>
  ) : (
    <h1
      className={cn(
        "font-black text-foreground dark:text-white tracking-tight leading-tight line-clamp-2",
        size === "lg"
          ? "text-xl sm:text-2xl md:text-[2.75rem]"
          : size === "md"
            ? "text-base sm:text-lg md:text-xl"
            : "text-sm sm:text-base",
        className,
      )}
    >
      {name}
    </h1>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("inline-flex min-w-0 max-w-full flex-col gap-1.5", className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={cn("min-w-0 max-w-full flex flex-col gap-1.5", className)}>
      {content}
    </div>
  );
}
