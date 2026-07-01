"use client";

import Link from "next/link";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CalendarDays, Tags } from "lucide-react";
import { SectionHeading } from "./section-heading";
import HomeScheduleStrip from "./home-schedule-strip";
import { useT } from "@/providers/i18n-provider";

const QUICK_GENRES = [
  "action",
  "romance",
  "comedy",
  "fantasy",
  "slice-of-life",
  "isekai",
  "shounen",
  "mystery",
] as const;

function genreKey(slug: string) {
  if (slug === "slice-of-life") return "sliceOfLife";
  return slug;
}

export default function HomeTodayPanel() {
  const t = useT();

  return (
    <div className="flex flex-col">
      <Container className="pt-2 pb-0">
        <div className="site-panel p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionHeading
              icon={<CalendarDays className="h-4 w-4" />}
              title={t("home.todayPanel")}
              subtitle={t("home.todayPanelDesc")}
              href={ROUTES.SCHEDULE}
            />
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Tags className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.18em]">
                {t("home.browseByGenre")}
              </p>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-momentum">
              {QUICK_GENRES.map((genre) => (
                <Link
                  key={genre}
                  href={`${ROUTES.SEARCH}?genres=${genre}`}
                  className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-white/10 bg-white/[0.03] text-white/45 hover:text-white/85 hover:border-white/22 hover:bg-white/[0.06] transition-all"
                >
                  {t(`search.filterGenres.${genreKey(genre)}`)}
                </Link>
              ))}
              <Link
                href={ROUTES.SEARCH}
                className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border border-dashed border-white/12 text-white/30 hover:text-white/60 transition-all"
              >
                {t("home.allGenres")}
              </Link>
            </div>
          </div>
        </div>
      </Container>

      <HomeScheduleStrip />
    </div>
  );
}
