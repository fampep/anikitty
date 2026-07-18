"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import type { ReactNode } from "react";

type Props = {
  animeId: string;
  name: string;
  poster?: string | null;
  episodeNumber?: number;
  listSelector: ReactNode;
};

export default function WatchPageHeader({
  animeId,
  name,
  poster,
  episodeNumber,
  listSelector,
}: Props) {
  const t = useT();
  const detailHref = `${ROUTES.ANIME_DETAILS}/${animeId}`;

  return (
    <div className="site-panel flex items-center gap-3 p-3 sm:p-3.5 mb-3 min-w-0">
      <Link href={detailHref} className="shrink-0 group">
        <div className="relative w-10 h-14 sm:w-11 sm:h-[3.75rem] rounded-lg overflow-hidden ring-1 ring-border dark:ring-white/10 shadow-lg shadow-black/40 group-hover:ring-primary/35 transition-all">
          {poster ? (
            <Image
              src={poster}
              alt={name}
              fill
              className="object-cover"
              unoptimized
              sizes="44px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-zinc-500/10 to-white/5" />
          )}
        </div>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-300/60 mb-0.5">
          {t("watch.nowWatching")}
        </p>
        <Link
          href={detailHref}
          className="text-sm sm:text-[15px] font-bold text-foreground dark:text-white hover:text-zinc-200/90 transition-colors line-clamp-1"
        >
          {name}
        </Link>
        {episodeNumber != null && (
          <p className="text-[11px] font-mono text-muted-foreground dark:text-white/40 mt-0.5">
            {t("watch.episode", { n: episodeNumber })}
          </p>
        )}
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-mono text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 transition-colors"
        >
          {t("watch.fullAnimePage")}
          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
        </Link>
      </div>

      <div className="shrink-0">{listSelector}</div>
    </div>
  );
}
