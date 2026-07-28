"use client";

import Link from "next/link";
import Image from "next/image";
import { Mic } from "lucide-react";
import Container from "@/components/layout/container";
import { ROUTES } from "@/constants/routes";
import type { HomeVoiceActor } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { HomeRailEmpty, HomeScrollRail, HomeSectionLink } from "./home-shared";

type Props = {
  voiceActors: HomeVoiceActor[];
  loading?: boolean;
};

export default function HomeFeaturedVas({ voiceActors, loading }: Props) {
  const t = useT();

  if (loading) {
    return (
      <Container className="flex flex-col gap-3 py-2">
        <div className="h-7 w-44 rounded-lg bg-muted/50 dark:bg-white/10 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 h-28 w-28 rounded-xl bg-muted/40 dark:bg-white/8 animate-pulse" />
          ))}
        </div>
      </Container>
    );
  }

  if (!voiceActors.length) return null;

  return (
    <Container id="voice-actors" className="flex flex-col gap-3 scroll-mt-[calc(var(--nav-height)+4.5rem)]">
      <HomeSectionLink
        href={ROUTES.VOICE_ACTORS}
        title={t("home.featuredVoiceActors")}
        icon={<Mic className="w-4 h-4" />}
        compact
      />
      {voiceActors.length ? (
        <HomeScrollRail>
          {voiceActors.map((va) => (
            <Link
              key={va.id}
              href={`/voice-actor/${va.id}`}
              className="home-glass-card shrink-0 w-[7.5rem] sm:w-[8.5rem] flex flex-col gap-2 overflow-hidden"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted/40 dark:bg-white/8">
                {va.image ? (
                  <Image src={va.image} alt="" fill sizes="140px" className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Mic className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold leading-snug line-clamp-2 text-foreground dark:text-white/85">
                {va.name}
              </p>
            </Link>
          ))}
        </HomeScrollRail>
      ) : (
        <HomeRailEmpty message={t("home.sectionEmpty")} />
      )}
    </Container>
  );
}
