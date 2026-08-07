"use client";

import { useEffect, useRef } from "react";
import { ListVideo, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import EpisodePlaylist from "@/components/watch/episode-playlist";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useT } from "@/providers/i18n-provider";
import type { IEpisodes } from "@/types/episodes";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animeId: string;
  title?: string;
  subOrDub?: { sub: number; dub: number };
  episodes: IEpisodes;
  isLoading?: boolean;
};

/** Episode list drawer for mobile watch (all layouts) + Focus desktop. */
export default function WatchPlaylistSheet({
  open,
  onOpenChange,
  animeId,
  title,
  subOrDub,
  episodes,
  isLoading = false,
}: Props) {
  const t = useT();
  const searchParams = useSearchParams();
  const episodeParam = searchParams.get("episode");
  const lastEpisodeRef = useRef<string | null>(episodeParam);

  useEffect(() => {
    if (!open) {
      lastEpisodeRef.current = episodeParam;
      return;
    }
    if (lastEpisodeRef.current && episodeParam && lastEpisodeRef.current !== episodeParam) {
      onOpenChange(false);
    }
    lastEpisodeRef.current = episodeParam;
  }, [episodeParam, onOpenChange, open]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideCloseButton
        className="flex w-full flex-col gap-0 overflow-hidden border-border/60 bg-background p-0 dark:border-white/[0.08] dark:bg-[#09090b] max-sm:inset-x-2 max-sm:bottom-2 max-sm:top-auto max-sm:h-[min(82dvh,42rem)] max-sm:w-[calc(100%-1rem)] max-sm:rounded-2xl max-sm:border max-sm:shadow-2xl max-sm:shadow-black/60 sm:max-w-md"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3 pr-12 dark:border-white/[0.07] max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:bg-background/95 max-sm:backdrop-blur-xl max-sm:dark:bg-[#09090b]/95">
          <span className="absolute left-1/2 top-1.5 hidden h-1 w-10 -translate-x-1/2 rounded-full bg-muted-foreground/25 max-sm:block" aria-hidden />
          <ListVideo className="h-4 w-4 text-muted-foreground dark:text-white/40" />
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold tracking-tight text-foreground dark:text-white/90">
              {t("watch.playlist.focusSheetTitle")}
            </SheetTitle>
            <SheetDescription className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/30">
              {t("watch.playlist.focusSheetDesc")}
            </SheetDescription>
          </div>
          <SheetClose className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-muted/55 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring dark:border-white/10 dark:bg-white/[0.055] dark:text-white/55 dark:hover:bg-white/[0.09] dark:hover:text-white">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("common.close")}</span>
          </SheetClose>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <EpisodePlaylist
            variant="sidebar"
            animeId={animeId}
            title={title}
            subOrDub={subOrDub}
            episodes={episodes}
            isLoading={isLoading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
