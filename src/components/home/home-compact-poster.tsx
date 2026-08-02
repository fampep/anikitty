"use client";

import { memo, useState } from "react";
import Link from "next/link";
import { Heart, Info, ListPlus, Play, Star } from "lucide-react";
import { toast } from "sonner";
import LazyPosterImage from "@/components/anime/lazy-poster-image";
import { PosterAudioBadges } from "@/components/anime/audio-pills";
import { ROUTES } from "@/constants/routes";
import { IAnime } from "@/types/anime";
import { useT } from "@/providers/i18n-provider";
import { useAuthStore } from "@/store/auth-store";
import useBookMarks from "@/hooks/use-get-bookmark";
import { cn } from "@/lib/core/utils";
import { AiringDot, formatAnimeType, scoreLabel } from "./home-shared";
import { useAnimeHoverPreview } from "@/components/anime/anime-hover-preview";

type Props = {
  anime: IAnime;
  className?: string;
  priority?: boolean;
  href?: string;
  episodeBadge?: number;
  rank?: number;
  onPrefetch?: () => void;
  showNew?: boolean;
  progressPct?: number | null;
  watchHref?: string;
};

const HomeCompactPoster = memo(function HomeCompactPoster({
  anime,
  className,
  priority,
  href,
  episodeBadge,
  rank,
  onPrefetch,
  showNew,
  progressPct,
  watchHref,
}: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const { createOrUpdateBookMark } = useBookMarks({ populate: false });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const { triggerProps, preview } = useAnimeHoverPreview(anime);

  const rating = scoreLabel(anime.score);
  const detailsHref = `${ROUTES.ANIME_DETAILS}/${anime.id}`;
  const primaryHref = href ?? detailsHref;
  const playHref = watchHref ?? `${ROUTES.WATCH}?anime=${anime.id}`;
  const sub = anime.episodes?.sub ?? 0;
  const dub = anime.episodes?.dub ?? 0;

  const prefetch = () => {
    onPrefetch?.();
    try {
      void fetch(`/api/anime/${anime.id}`, { priority: "low" } as RequestInit);
    } catch {
      /* ignore */
    }
  };

  const addToList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth) {
      toast.error(t("home.signInToContinue"));
      return;
    }
    if (saving || saved) return;
    setSaving(true);
    const result = await createOrUpdateBookMark(
      String(anime.id),
      anime.name ?? "",
      anime.poster ?? "",
      "plan to watch",
      false,
      { anilistId: Number(anime.id) || undefined },
    );
    setSaving(false);
    if (result) {
      setSaved(true);
      toast.success(t("anime.addedToPlanToWatch"));
    } else {
      toast.error(t("anime.listError"));
    }
  };

  return (
    <div
      className={cn(
        "home-glass-card group/poster relative flex flex-col gap-y-2 shrink-0 w-[7.5rem] xs:w-[8.5rem] md:w-[9.5rem] lg:w-40 overflow-hidden",
        className,
      )}
      {...triggerProps}
      onMouseEnter={() => {
        prefetch();
        triggerProps.onMouseEnter?.();
      }}
      onFocus={prefetch}
    >
      {preview}
      <div className="relative flex w-full aspect-[1/1.4] bg-white/10 dark:bg-white/10 rounded-xl overflow-hidden">
        <Link href={primaryHref} className="absolute inset-0 z-0" draggable={false} aria-label={anime.name}>
          <LazyPosterImage
            src={anime.poster}
            alt=""
            sizes="160px"
            imageClassName="object-cover transition-transform duration-300 group-hover/poster:scale-[1.04]"
            priority={priority}
          />
        </Link>

        {rank != null ? (
          <span className="absolute left-1 top-1 z-10 flex h-6 min-w-6 items-center justify-center rounded-md bg-black/80 px-1.5 text-[11px] font-black tabular-nums text-white pointer-events-none">
            {rank}
          </span>
        ) : null}

        {showNew ? (
          <span className="absolute left-1 top-1 z-10 rounded-md bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-black pointer-events-none">
            {t("home.newBadge")}
          </span>
        ) : null}

        {episodeBadge != null ? (
          <span className="bg-black/75 px-1.5 py-1 rounded-md flex items-center font-medium absolute right-1 top-1 text-xs z-10 pointer-events-none">
            {t("common.ep")} {episodeBadge}
          </span>
        ) : rating ? (
          <span className="bg-black/75 px-1.5 py-1 gap-1 rounded-md flex items-center font-medium absolute right-1 top-1 text-xs z-10 pointer-events-none">
            <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" aria-hidden />
            {rating}
          </span>
        ) : null}

        <PosterAudioBadges sub={sub} dub={dub} className="absolute left-1 bottom-1 z-10 pointer-events-none" />

        {progressPct != null && progressPct > 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-10 h-1 bg-black/40 pointer-events-none">
            <div
              className="h-full bg-zinc-200/90"
              style={{ width: `${Math.min(100, Math.max(2, progressPct))}%` }}
            />
          </div>
        ) : null}

        <div
          data-no-rail-drag
          className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/55 opacity-0 [@media(hover:hover)]:group-hover/poster:opacity-100 transition-opacity duration-150 pointer-events-none [@media(hover:hover)]:group-hover/poster:pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Link
            href={playHref}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:bg-white/90"
            aria-label={t("home.watchNow")}
            onClick={(e) => e.stopPropagation()}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {t("home.watchNow")}
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => void addToList(e)}
              disabled={saving}
              className="size-8 rounded-full bg-black/55 text-white/85 hover:bg-white/15 flex items-center justify-center"
              aria-label={t("home.favorite")}
            >
              <Heart className={cn("h-3.5 w-3.5", saved && "fill-current text-rose-300")} />
            </button>
            <button
              type="button"
              onClick={(e) => void addToList(e)}
              disabled={saving}
              className="size-8 rounded-full bg-black/55 text-white/85 hover:bg-white/15 flex items-center justify-center"
              aria-label={t("anime.addToList")}
            >
              <ListPlus className="h-3.5 w-3.5" />
            </button>
            <Link
              href={detailsHref}
              className="size-8 rounded-full bg-black/55 text-white/85 hover:bg-white/15 flex items-center justify-center"
              aria-label={t("home.details")}
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 min-w-0">
        <div className="w-full flex items-center justify-between text-xs text-muted-foreground gap-2">
          <span className="truncate">{formatAnimeType(anime.type)}</span>
          <span className="shrink-0 tabular-nums">
            {anime.status === "RELEASING" ? t("card.live") : anime.year ? anime.year : null}
          </span>
        </div>
        <Link href={primaryHref} className="line-clamp-2 text-xs md:text-sm font-medium leading-snug hover:underline">
          <AiringDot status={anime.status} />
          {anime.name}
        </Link>
      </div>
    </div>
  );
});

export default HomeCompactPoster;
