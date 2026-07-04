"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CalendarDays, Captions, ChevronLeft, ChevronRight, Clock, Mic, RefreshCw } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/core/utils";
import { useI18n, useT } from "@/providers/i18n-provider";

type ScheduleItem = {
  id: string;
  name: string;
  episode: number;
  airingTimestamp: number;
  secondsUntilAiring: number;
  audio?: ("sub" | "dub")[];
};

function formatAiringTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function airingLabel(item: ScheduleItem, t: ReturnType<typeof useT>) {
  if (item.secondsUntilAiring <= 0) return t("home.aired");
  if (item.secondsUntilAiring < 3600) {
    const m = Math.max(1, Math.ceil(item.secondsUntilAiring / 60));
    return t("home.inMinutes", { m });
  }
  return formatAiringTime(item.airingTimestamp);
}

export default function HomeScheduleStrip() {
  const t = useT();
  const { locale } = useI18n();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setLoading(true);
    setLoadError(false);
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setItems((d.data?.scheduledAnimes ?? []).slice(0, 16)))
      .catch(() => {
        setItems([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [retryTick]);

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScroll, { passive: true });
    return () => el.removeEventListener("scroll", updateScroll);
  }, [items]);

  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });

  if (loading) {
    return (
      <Container className="py-6">
        <div className="h-24 rounded-2xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] animate-pulse" />
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container className="py-4">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
          <p className="text-xs text-muted-foreground dark:text-white/40 font-mono">{t("home.scheduleLoadError")}</p>
          <button
            type="button"
            onClick={() => setRetryTick((n) => n + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/60 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("home.retry")}
          </button>
        </div>
      </Container>
    );
  }

  if (!items.length) return null;

  const today = new Date().toLocaleDateString(locale, { weekday: "long", month: "short", day: "numeric" });

  return (
    <Container className="flex flex-col gap-4 py-6 items-start">
      <div className="flex items-center gap-3 w-full">
        <SectionHeading
          icon={<CalendarDays className="w-4 h-4" />}
          title={t("home.airingToday")}
          subtitle={today}
          href={ROUTES.SCHEDULE}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-border dark:border-white/12 flex items-center justify-center text-muted-foreground dark:text-white/40 hover:text-foreground/90 dark:text-white/80 hover:border-border dark:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative w-full">
        <div
          ref={scrollRef}
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide scroll-momentum"
        >
          {items.map((item) => {
            const aired = item.secondsUntilAiring <= 0;
            const audioTypes = item.audio?.length ? item.audio : (["sub"] as const);
            return (
              <Link
                key={`${item.id}-${item.episode}`}
                href={`${ROUTES.WATCH}?anime=${item.id}`}
                className="group shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.025] hover:border-border dark:border-white/18 hover:bg-muted/50 dark:bg-white/[0.04] transition-all min-w-[200px] max-w-[280px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-foreground/85 dark:text-white/75 group-hover:text-foreground dark:group-hover:text-white truncate leading-tight">
                    {item.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30">{t("home.episode", { n: item.episode })}</p>
                    {audioTypes.map((type) => {
                      const isSub = type === "sub";
                      return (
                        <span
                          key={type}
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded px-1 py-px text-[7px] font-bold uppercase",
                            isSub
                              ? "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/25"
                              : "bg-violet-500/20 text-violet-200 ring-1 ring-violet-400/25",
                          )}
                        >
                          {isSub ? <Captions className="h-2 w-2" /> : <Mic className="h-2 w-2" />}
                          {isSub ? t("card.sub") : t("card.dub")}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border",
                    aired
                      ? "text-muted-foreground/80 dark:text-white/25 border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]"
                      : "text-sky-300/80 border-sky-500/20 bg-sky-500/10",
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {airingLabel(item, t)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
