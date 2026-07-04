"use client";

import dynamic from "next/dynamic";
import Container from "@/components/layout/container";
import HomeGenreBar from "@/components/home/home-genre-bar";
import { CalendarDays } from "lucide-react";
import { useT } from "@/providers/i18n-provider";

const AnimeSchedule = dynamic(() => import("@/components/anime/anime-schedule"), { ssr: false });

export default function SchedulePage() {
  const t = useT();
  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
          <CalendarDays className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
            {t("schedule.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/35 font-mono ml-[1.375rem] pl-8">
          {t("schedule.subtitle")}
        </p>
      </Container>
      <HomeGenreBar />
      <AnimeSchedule />
    </div>
  );
}
