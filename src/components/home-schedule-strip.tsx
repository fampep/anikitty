"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Container from "./container";
import { ROUTES } from "@/constants/routes";
import { CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { SectionHeading } from "./section-heading";
import { cn } from "@/lib/utils";

type ScheduleItem = {
  id: string;
  name: string;
  episode: number;
  airingTimestamp: number;
  secondsUntilAiring: number;
};

function formatAiringTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function airingLabel(item: ScheduleItem) {
  if (item.secondsUntilAiring <= 0) return "Aired";
  if (item.secondsUntilAiring < 3600) {
    const m = Math.max(1, Math.ceil(item.secondsUntilAiring / 60));
    return `in ${m}m`;
  }
  return formatAiringTime(item.airingTimestamp);
}

export default function HomeScheduleStrip() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setItems((d.data?.scheduledAnimes ?? []).slice(0, 16)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

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
        <div className="h-24 rounded-2xl border border-white/8 bg-white/[0.02] animate-pulse" />
      </Container>
    );
  }

  if (!items.length) return null;

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <Container className="flex flex-col gap-4 py-6 items-start">
      <div className="flex items-center gap-3 w-full">
        <SectionHeading
          icon={<CalendarDays className="w-4 h-4" />}
          title="Airing Today"
          subtitle={today}
          href={ROUTES.SCHEDULE}
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className="h-7 w-7 rounded-full border border-white/12 flex items-center justify-center text-white/40 hover:text-white/80 hover:border-white/30 transition-all disabled:opacity-20 disabled:pointer-events-none"
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
            return (
              <Link
                key={`${item.id}-${item.episode}`}
                href={`${ROUTES.WATCH}?anime=${item.id}`}
                className="group shrink-0 flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-white/8 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.04] transition-all min-w-[200px] max-w-[260px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white/75 group-hover:text-white truncate leading-tight">
                    {item.name}
                  </p>
                  <p className="text-[10px] font-mono text-white/30 mt-0.5">Episode {item.episode}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border",
                    aired
                      ? "text-white/25 border-white/8 bg-white/[0.02]"
                      : "text-sky-300/80 border-sky-500/20 bg-sky-500/10",
                  )}
                >
                  <Clock className="w-3 h-3" />
                  {airingLabel(item)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
