"use client";

import { useEffect, useRef, useState } from "react";
import AnimeCard from "@/components/anime/anime-card";
import { ROUTES } from "@/constants/routes";
import type { VaRole } from "@/lib/core/voice-actors";
import { useT } from "@/providers/i18n-provider";
import { Loader2 } from "lucide-react";

const INITIAL_COUNT = 36;
const PAGE_SIZE = 36;

export default function VoiceActorFilmography({ roles }: { roles: VaRole[] }) {
  const t = useT();
  const [visible, setVisible] = useState(() => Math.min(INITIAL_COUNT, roles.length));
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(Math.min(INITIAL_COUNT, roles.length));
  }, [roles.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visible >= roles.length) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible((prev) => Math.min(prev + PAGE_SIZE, roles.length));
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, roles.length]);

  if (roles.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("voiceActor.noRoles")}
      </p>
    );
  }

  const shown = roles.slice(0, visible);
  const hasMore = visible < roles.length;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
        {shown.map((r) => (
          <div key={`${r.anime.id}-${r.character?.id ?? ""}`} className="flex flex-col gap-1.5">
            <AnimeCard
              title={r.anime.name}
              poster={r.anime.poster}
              href={`${ROUTES.ANIME_DETAILS}/${r.anime.id}`}
              displayDetails={false}
              variant="sm"
              deferImage
            />
            <div className="px-0.5">
              {r.character && (
                <p className="text-[11px] font-medium text-foreground/85 dark:text-white/70 line-clamp-1">
                  {r.character.name}
                </p>
              )}
              <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30">
                {[r.role, r.anime.type, r.anime.year].filter(Boolean).join(" · ") || t("voiceActor.cast")}
              </p>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-8 text-muted-foreground dark:text-white/35">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span className="sr-only">{t("voiceActor.loadingMore")}</span>
        </div>
      )}
    </>
  );
}
