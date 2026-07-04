"use client";

import Container from "@/components/layout/container";
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetAnimeSchedule } from "@/query/anime/get-anime-schedule";
import { ROUTES } from "@/constants/routes";
import { CalendarDays } from "lucide-react";
import {
  formatScheduleQueryDate,
  getCurrentScheduleDay,
  getDateForWeekday,
  SCHEDULE_DAYS,
} from "@/lib/anime/schedule-days";
import { cn } from "@/lib/core/utils";
import { useI18n, useT } from "@/providers/i18n-provider";
import { ScheduleAnimeRow, ScheduleRowSkeleton } from "@/components/anime/schedule-anime-row";

function AnimeSchedule() {
  const t = useT();
  const { locale } = useI18n();
  const currentDate = new Date();
  const currentDay = getCurrentScheduleDay(locale, currentDate);

  const [currentSelectedTab, setCurrentSelectedTab] = React.useState<string>(currentDay);

  const selectedDate = useMemo(() => {
    const date = getDateForWeekday(currentSelectedTab as (typeof SCHEDULE_DAYS)[number], currentDate);
    return formatScheduleQueryDate(date, locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectedTab, locale]);

  const { isLoading, data } = useGetAnimeSchedule(selectedDate);

  return (
    <Container className="flex flex-col items-center gap-5 py-10 lg:items-start">
      <div className="flex items-center gap-3">
        <div className="h-5 w-0.5 shrink-0 bg-muted/30 dark:bg-white/35" />
        <CalendarDays className="h-4 w-4 text-muted-foreground dark:text-white/50" />
        <h5 className="text-xl font-bold tracking-tight text-foreground dark:text-white md:text-2xl">
          {t("nav.schedule")}
        </h5>
      </div>

      <p className="text-sm font-mono text-muted-foreground dark:text-white/35">{t("schedule.subtitle")}</p>

      <Tabs
        defaultValue={currentDay}
        onValueChange={setCurrentSelectedTab}
        value={currentSelectedTab}
        className="w-full"
      >
        <TabsList className="flex h-auto w-full gap-0 overflow-x-auto border-b border-border dark:border-white/10 bg-transparent p-0">
          {SCHEDULE_DAYS.map((day) => {
            const d = getDateForWeekday(day, currentDate);
            const isToday = day === currentDay;
            return (
              <TabsTrigger
                key={day}
                value={day}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-none border-b-2 border-transparent px-3 py-2.5 transition-all",
                  "bg-transparent text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/55",
                  "data-[state=active]:border-primary data-[state=active]:bg-accent dark:data-[state=active]:border-white dark:data-[state=active]:bg-white/4 data-[state=active]:text-foreground dark:text-white",
                )}
              >
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider">
                  {day.slice(0, 3)}
                </span>
                <span className={cn("text-[10px] font-mono", isToday ? "text-muted-foreground dark:text-white/60" : "text-muted-foreground/80 dark:text-white/25")}>
                  {d.toLocaleDateString(locale, { month: "short", day: "numeric" })}
                </span>
                {isToday && <span className="mt-0.5 h-1 w-1 rounded-full bg-muted/50 dark:bg-white/50" />}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isLoading ? (
          <div className="flex flex-col gap-2 pt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ScheduleRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          SCHEDULE_DAYS.map((day) => (
            <TabsContent key={day} value={day} className="mt-0">
              {day === currentSelectedTab && (
                <div className="flex flex-col gap-2 pt-4">
                  {!data?.scheduledAnimes?.length ? (
                    <div className="flex items-center justify-center py-12 text-sm font-mono text-muted-foreground/80 dark:text-white/25">
                      {t("schedule.noSchedule")}
                    </div>
                  ) : (
                    data.scheduledAnimes.map((anime) => (
                      <ScheduleAnimeRow
                        key={`${anime.id}-${anime.episode}`}
                        anime={anime}
                        watchHref={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                      />
                    ))
                  )}
                </div>
              )}
            </TabsContent>
          ))
        )}
      </Tabs>
    </Container>
  );
}

export default AnimeSchedule;
