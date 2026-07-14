"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/core/utils";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "@/providers/i18n-provider";

export function HomeSectionLink({
  href,
  title,
  className,
  icon,
  subtitle,
}: {
  href?: string;
  title: string;
  className?: string;
  icon?: ReactNode;
  subtitle?: string;
}) {
  const t = useT();

  const heading = (
    <div className={cn("flex items-center gap-3 min-w-0 flex-1", className)}>
      <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-300 via-violet-500 to-violet-700/30 shrink-0 shadow-[0_0_12px_rgba(124,58,237,0.35)]" />
      {icon ? <span className="text-violet-300/80 flex items-center shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <span className="text-xl xl:text-2xl font-bold text-foreground dark:text-white tracking-tight leading-tight block">
          {title}
        </span>
        {subtitle ? (
          <p className="text-[11px] text-muted-foreground dark:text-white/40 font-medium mt-0.5">{subtitle}</p>
        ) : null}
      </div>
      {href ? (
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground dark:text-white/40 shrink-0 group px-3.5 py-2 rounded-xl border border-border dark:border-white/[0.08] bg-muted/50 dark:bg-white/[0.04] group-hover:border-violet-400/30 group-hover:bg-violet-500/[0.1] transition-all">
          {t("common.viewAll")}
          <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block w-full hover:opacity-95 transition-opacity">
        {heading}
      </Link>
    );
  }

  return heading;
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
