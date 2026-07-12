"use client";

import Link from "next/link";
import { MoveRight } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function HomeSectionLink({
  href,
  title,
  className,
}: {
  href?: string;
  title: string;
  className?: string;
}) {
  const inner = (
    <>
      <span className="text-xl xl:text-2xl font-semibold">{title}</span>
      {href ? (
        <MoveRight className="w-[18px] h-[18px] text-muted-foreground ml-auto shrink-0" aria-hidden />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn("flex items-center gap-4 w-full hover:opacity-80 transition-opacity", className)}
      >
        {inner}
      </Link>
    );
  }

  return <div className={cn("flex items-center gap-4 w-full", className)}>{inner}</div>;
}

export function HomeScrollRail({
  children,
  className,
  edgeFade = true,
}: {
  children: ReactNode;
  className?: string;
  edgeFade?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 8);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [children]);

  return (
    <div className={cn("relative w-full", className)}>
      {edgeFade ? (
        <>
          <div
            className={cn(
              "home-rail-fade home-rail-fade-left pointer-events-none",
              fadeLeft ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            className={cn(
              "home-rail-fade home-rail-fade-right pointer-events-none",
              fadeRight ? "opacity-100" : "opacity-0",
            )}
          />
        </>
      ) : null}
      <div
        ref={ref}
        className="flex w-full overflow-x-auto scrollbar-hide scroll-momentum gap-4 sm:gap-x-6 xl:gap-x-8 cursor-grab active:cursor-grabbing select-none"
      >
        {children}
      </div>
    </div>
  );
}

export function HomeRailEmpty({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border dark:border-white/10 py-10 text-sm text-muted-foreground dark:text-white/40">
      {message}
    </div>
  );
}

export function AiringDot({ status }: { status?: string | null }) {
  if (status !== "RELEASING") return null;
  return (
    <span title="AIRING" className="relative inline-flex mr-1 items-center shrink-0 justify-center size-3">
      <span className="absolute aspect-square size-2.5 rounded-full bg-emerald-400/40 animate-ping" />
      <span className="aspect-square inline-block size-2 rounded-full bg-emerald-400" />
    </span>
  );
}

export function formatAnimeType(type?: string | null) {
  if (!type) return "TV";
  const t = String(type).toUpperCase();
  if (t === "TV") return "TV Show";
  if (t === "MOVIE") return "Movie";
  return type;
}

export function scoreLabel(score?: number | null) {
  if (score == null || score <= 0) return null;
  return (score / 10).toFixed(1);
}
