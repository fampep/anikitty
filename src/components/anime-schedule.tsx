import Container from "./container";
import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useGetAnimeSchedule } from "@/query/get-anime-schedule";
import Link from "next/link";
import { ROUTES } from "@/constants/routes";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getDateForWeekday(targetDay: string, referenceDate: Date) {
  const currentDayIndex = referenceDate.getDay();
  const targetIndex = DAYS.indexOf(targetDay);
  const diff = targetIndex - currentDayIndex;
  const date = new Date(referenceDate);
  date.setDate(referenceDate.getDate() + diff);
  return date;
}

function AnimeSchedule() {
  const currentDate = new Date();
  const currentDay = currentDate.toLocaleString("en-US", { weekday: "long" }).toLowerCase();

  const [currentSelectedTab, setCurrentSelectedTab] = React.useState<string>(currentDay);

  const selectedDate = useMemo(() => {
    const date = getDateForWeekday(currentSelectedTab, currentDate);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString("en-US");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSelectedTab]);

  const { isLoading, data } = useGetAnimeSchedule(selectedDate);

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start">
      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className="w-0.5 h-5 bg-white/35 shrink-0" />
        <CalendarDays className="w-4 h-4 text-white/50" />
        <h5 className="text-xl md:text-2xl font-bold text-white tracking-tight">
          Schedule
        </h5>
      </div>

      <Tabs
        defaultValue={currentDay}
        onValueChange={setCurrentSelectedTab}
        value={currentSelectedTab}
        className="w-full"
      >
        {/* Day tabs */}
        <TabsList className="flex gap-0 w-full bg-transparent border-b border-white/10 h-auto p-0 overflow-x-auto">
          {DAYS.map((day) => {
            const d = getDateForWeekday(day, currentDate);
            const isToday = day === currentDay;
            return (
              <TabsTrigger
                key={day}
                value={day}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-none border-b-2 border-transparent shrink-0 transition-all",
                  "data-[state=active]:border-white data-[state=active]:text-white data-[state=active]:bg-white/4",
                  "text-white/35 hover:text-white/55 bg-transparent",
                )}
              >
                <span className="text-[11px] font-bold font-mono uppercase tracking-wider">
                  {day.slice(0, 3)}
                </span>
                <span className={cn("text-[10px] font-mono", isToday ? "text-white/60" : "text-white/25")}>
                  {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
                {isToday && (
                  <span className="w-1 h-1 rounded-full bg-white/50 mt-0.5" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {isLoading ? (
          <ScheduleSkeleton />
        ) : (
          DAYS.map((day) => (
            <TabsContent key={day} value={day} className="mt-0">
              {day === currentSelectedTab && (
                <div className="flex flex-col divide-y divide-white/5">
                  {!data?.scheduledAnimes?.length ? (
                    <div className="flex items-center justify-center py-12 text-white/25 text-sm font-mono">
                      No schedule for this day
                    </div>
                  ) : (
                    data.scheduledAnimes.map((anime) => {
                      const airingTime = new Date(anime.airingTimestamp);
                      const isPast = airingTime < currentDate;
                      const isNearby =
                        !isPast &&
                        Math.abs(airingTime.getTime() - currentDate.getTime()) < 60 * 60 * 1000;

                      return (
                        <div
                          key={anime.id}
                          className="flex items-center justify-between gap-4 px-1 py-3 hover:bg-white/3 transition-colors rounded-lg group"
                        >
                          {/* Time */}
                          <div className="flex items-center gap-1.5 w-20 shrink-0">
                            {isNearby && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse shrink-0" />
                            )}
                            <span
                              className={cn(
                                "text-[11px] font-mono tabular-nums",
                                isNearby
                                  ? "text-white/80"
                                  : isPast
                                  ? "text-white/20"
                                  : "text-white/40",
                              )}
                            >
                              {airingTime.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                          </div>

                          {/* Name */}
                          <p
                            className={cn(
                              "flex-1 text-sm font-medium line-clamp-1 min-w-0 transition-colors",
                              isPast ? "text-white/30" : "text-white/70 group-hover:text-white/90",
                            )}
                          >
                            {anime.name}
                          </p>

                          {/* Episode link */}
                          <Link href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}>
                            <span
                              className={cn(
                                "shrink-0 text-[11px] font-mono px-2.5 py-1 rounded-md border transition-all whitespace-nowrap",
                                isPast
                                  ? "border-white/8 text-white/20"
                                  : "border-white/15 text-white/45 hover:border-white/30 hover:text-white/75",
                              )}
                            >
                              EP {anime.episode}
                            </span>
                          </Link>
                        </div>
                      );
                    })
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

const ScheduleSkeleton = () => (
  <div className="flex flex-col gap-2 pt-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-1 py-2">
        <div className="w-16 h-3 rounded animate-pulse bg-white/8" />
        <div className="flex-1 h-3 rounded animate-pulse bg-white/5" />
        <div className="w-14 h-6 rounded-md animate-pulse bg-white/5" />
      </div>
    ))}
  </div>
);

export default AnimeSchedule;
