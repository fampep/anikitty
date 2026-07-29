"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { HomeScrollRail } from "@/components/home/home-shared";

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

export default function LandingScheduleStrip() {
  const t = useT();
  const [items, setItems] = useState<ScheduleItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setItems((d.data?.scheduledAnimes ?? []).slice(0, 10));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Wait for data before painting — avoid skeleton→null collapse that jumps scroll up.
  if (!items || items.length === 0) return null;

  return (
    <section className="relative z-10 px-4 sm:px-6 md:px-12 py-10 sm:py-12 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-5">
          <div>
            <p className="site-label mb-1.5 flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3" />
              {t("home.airingToday")}
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white/90">
              {t("landing.scheduleTitle")}
            </h2>
          </div>
          <Link
            href={ROUTES.SCHEDULE}
            prefetch
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/40 hover:text-white/75 transition-colors"
          >
            {t("landing.seeAll")}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <HomeScrollRail edgeFade={false}>
          {items.map((item) => (
            <Link
              key={`${item.id}-${item.episode}`}
              href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
              className="shrink-0 w-[220px] rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 hover:border-white/15 transition-colors"
            >
              <p className="text-[13px] font-semibold text-white/85 line-clamp-1 mb-1">
                {item.name}
              </p>
              <div className="flex items-center justify-between gap-2 text-[11px] text-white/40 font-mono">
                <span>{t("home.episode", { n: item.episode })}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.secondsUntilAiring <= 0
                    ? t("home.aired")
                    : formatAiringTime(item.airingTimestamp)}
                </span>
              </div>
            </Link>
          ))}
        </HomeScrollRail>
      </div>
    </section>
  );
}
