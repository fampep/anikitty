"use client";

import { ListVideo } from "lucide-react";
import EpisodePlaylist from "@/components/watch/episode-playlist";
import {
  Sheet,
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

/** Episode list drawer for Focus watch layout (desktop + mobile). */
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-border/60 bg-background p-0 dark:border-white/[0.08] dark:bg-[#09090b] sm:max-w-md"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-3 dark:border-white/[0.07]">
          <ListVideo className="h-4 w-4 text-muted-foreground dark:text-white/40" />
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold tracking-tight text-foreground dark:text-white/90">
              {t("watch.playlist.focusSheetTitle")}
            </SheetTitle>
            <SheetDescription className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/30">
              {t("watch.playlist.focusSheetDesc")}
            </SheetDescription>
          </div>
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
