"use client";

import Image from "next/image";
import Link from "next/link";
import type { SubtitleLibraryEntry } from "@/lib/subtitle-cache-store";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { Download, Loader2, RefreshCw } from "lucide-react";

type Props = {
  item: SubtitleLibraryEntry;
  index?: number;
  downloading?: boolean;
  fetching?: boolean;
  onDownload?: () => void;
  onFetch?: () => void;
  discover?: boolean;
};

function formatStatus(status: string | null | undefined, t: (k: string) => string) {
  if (status === "FINISHED") return t("subsLibrary.statusFinished");
  if (status === "RELEASING") return t("subsLibrary.statusReleasing");
  if (status === "NOT_YET_RELEASED") return t("subsLibrary.statusUpcoming");
  return null;
}

export default function SubtitleFeedCard({
  item,
  index = 0,
  downloading,
  fetching,
  onDownload,
  onFetch,
  discover,
}: Props) {
  const t = useT();
  const busy = downloading || fetching;
  const title =
    item.animeTitle?.trim() || t("subsLibrary.unknownAnime", { id: item.anilistId });
  const poster = item.poster?.trim();
  const statusLabel = formatStatus(item.status, t);
  const epLine = item.totalEpisodes
    ? t("subsLibrary.episodeLine", {
        cached: item.episodeCount,
        total: item.totalEpisodes,
      })
    : t("subsLibrary.episodes", { count: item.episodeCount });

  return (
    <div
      className="group flex items-stretch gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 transition-colors hover:border-violet-500/20 hover:bg-white/[0.04]"
      style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
    >
      <Link
        href={`${ROUTES.ANIME_DETAILS}/${item.anilistId}?tab=subtitles`}
        className="flex min-w-0 flex-1 items-stretch gap-3"
      >
        <span className="relative block h-[4.75rem] w-12 shrink-0 overflow-hidden rounded-md bg-violet-500/10 ring-1 ring-white/10">
          {poster ? (
            <Image
              src={poster}
              alt=""
              fill
              className="object-cover"
              unoptimized
              sizes="48px"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-white/[0.04] text-[9px] font-mono text-white/20">
              …
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col justify-center py-0.5">
          <span className="truncate text-[13px] font-semibold text-white/90 group-hover:text-white">
            {title}
          </span>
          <span className="mt-0.5 text-[11px] text-white/40">
            {epLine}
            {statusLabel && (
              <>
                <span className="text-white/25"> · </span>
                <span className="text-white/45">{statusLabel}</span>
              </>
            )}
          </span>
          <span className="mt-2 flex flex-wrap gap-1">
            <span className="subs-chip">{t("subsLibrary.tracksChip", { count: item.trackCount })}</span>
            {item.isComplete && (
              <span className="subs-chip subs-chip-complete">{t("subsLibrary.fullSubs")}</span>
            )}
            {item.year != null && <span className="subs-chip">{item.year}</span>}
          </span>
        </span>
      </Link>

      {(onDownload || onFetch) && (
        <div className="flex shrink-0 flex-col justify-center gap-1.5 pl-1">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              disabled={busy}
              title={t("subsLibrary.downloadAll")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-violet-500/25 bg-violet-500/10 text-violet-300 transition-colors hover:bg-violet-500/20 disabled:opacity-40"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {onFetch && !item.isComplete && (
            <button
              type="button"
              onClick={onFetch}
              disabled={busy}
              title={discover ? t("subsLibrary.fetchSubs") : t("subsLibrary.fetchMore")}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/50 transition-colors hover:text-white/80 disabled:opacity-40"
            >
              {fetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function SubtitleFeedCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 animate-pulse"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="h-[4.75rem] w-12 shrink-0 rounded-md bg-white/[0.05]" />
      <div className="flex flex-1 flex-col justify-center gap-2 py-1">
        <div className="h-3.5 w-3/4 rounded bg-white/[0.06]" />
        <div className="h-3 w-1/2 rounded bg-white/[0.04]" />
        <div className="flex gap-1">
          <div className="h-5 w-14 rounded-full bg-white/[0.04]" />
          <div className="h-5 w-10 rounded-full bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

export function SubtitleFeedPager({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const t = useT();
  if (totalPages <= 1) return null;

  const pages: (number | "gap")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "gap") {
      pages.push("gap");
    }
  }

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-1 text-[12px] font-medium">
      <PagerBtn disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t("subsLibrary.pagerPrev")}
      </PagerBtn>

      {pages.map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1.5 text-white/25">
            …
          </span>
        ) : (
          <PagerBtn key={p} active={p === page} onClick={() => onPage(p)}>
            {p}
          </PagerBtn>
        ),
      )}

      <PagerBtn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {t("subsLibrary.pagerNext")}
      </PagerBtn>
    </nav>
  );
}

function PagerBtn({
  children,
  disabled,
  active,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "min-w-[2rem] rounded-md px-2.5 py-1.5 transition-colors",
        disabled && "pointer-events-none opacity-30",
        active
          ? "bg-white text-black"
          : "text-white/50 hover:bg-white/[0.06] hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
