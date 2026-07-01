"use client";

import React, { useMemo } from "react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import { CalendarDays } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "./section-heading";
import { useGetAnimeSchedule } from "@/query/anime/get-anime-schedule";
import {
  formatScheduleQueryDate,
  getCurrentScheduleDay,
  getDateForWeekday,
  SCHEDULE_DAYS,
  type ScheduleDay,
} from "@/lib/anime/schedule-days";
import { cn } from "@/lib/core/utils";
import { useI18n, useT } from "@/providers/i18n-provider";
import { ScheduleAnimeRow, ScheduleRowSkeleton } from "@/components/anime/schedule-anime-row";

function ScheduleDayPanel({ day, activeDay }: { day: ScheduleDay; activeDay: ScheduleDay }) {
  const t = useT();
  const { locale } = useI18n();
  const currentDate = new Date();

  const selectedDate = useMemo(() => {
    const date = getDateForWeekday(day, currentDate);
    return formatScheduleQueryDate(date, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, locale]);

  const { isLoading, data } = useGetAnimeSchedule(selectedDate, day === activeDay);

  if (day !== activeDay) return null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <ScheduleRowSkeleton key={i} compact />
        ))}
      </div>
    );
  }

  const items = data?.scheduledAnimes ?? [];

  if (!items.length) {
    return (
      <p className="py-10 text-center text-sm font-mono text-white/25">{t("schedule.noSchedule")}</p>
    );
  }

  return (
    <div className="flex max-h-[420px] flex-col gap-1.5 overflow-y-auto pr-1">
      {items.map((anime) => (
        <ScheduleAnimeRow
          key={`${anime.id}-${anime.episode}`}
          anime={anime}
          compact
        />
      ))}
    </div>
  );
}

export default function HomeWeeklySchedule() {
  const t = useT();
  const { locale } = useI18n();
  const currentDate = new Date();
  const currentDay = getCurrentScheduleDay(locale, currentDate);
  const [activeDay, setActiveDay] = React.useState<ScheduleDay>(currentDay);

  return (
    <Container className="flex flex-col gap-4 py-6">
      <SectionHeading
        icon={<CalendarDays className="h-4 w-4" />}
        title={t("home.weeklySchedule")}
        subtitle={t("schedule.subtitle")}
        href={ROUTES.SCHEDULE}
      />

      <div className="site-panel p-4 sm:p-5">
        <Tabs value={activeDay} onValueChange={(v) => setActiveDay(v as ScheduleDay)} className="w-full">
          <TabsList className="mb-4 flex h-auto w-full gap-0 overflow-x-auto border-b border-white/10 bg-transparent p-0">
            {SCHEDULE_DAYS.map((day) => {
              const d = getDateForWeekday(day, currentDate);
              const isToday = day === currentDay;
              return (
                <TabsTrigger
                  key={day}
                  value={day}
                  className={cn(
                    "flex shrink-0 flex-col items-center gap-0.5 rounded-none border-b-2 border-transparent px-3 py-2.5 transition-all",
                    "bg-transparent text-white/35 hover:text-white/55",
                    "data-[state=active]:border-violet-400 data-[state=active]:bg-violet-500/[0.06] data-[state=active]:text-white",
                  )}
                >
                  <span className="text-[11px] font-bold font-mono uppercase tracking-wider">
                    {day.slice(0, 3)}
                  </span>
                  <span className={cn("text-[10px] font-mono", isToday ? "text-white/60" : "text-white/25")}>
                    {d.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                  </span>
                  {isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-violet-400" />}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SCHEDULE_DAYS.map((day) => (
            <TabsContent key={day} value={day} className="mt-0">
              <ScheduleDayPanel day={day} activeDay={activeDay} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Container>
  );
}
