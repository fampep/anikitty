"use client";

import dynamic from "next/dynamic";
import Container from "@/components/container";
import { CalendarDays } from "lucide-react";

const AnimeSchedule = dynamic(() => import("@/components/anime-schedule"), { ssr: false });

export default function SchedulePage() {
  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <CalendarDays className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Anime Schedule
          </h1>
        </div>
        <p className="text-sm text-white/35 font-mono ml-[1.375rem] pl-8">
          Weekly airing schedule — all times shown in your local timezone
        </p>
      </Container>
      <AnimeSchedule />
    </div>
  );
}
