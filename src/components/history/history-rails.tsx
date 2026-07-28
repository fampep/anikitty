"use client";

import Link from "next/link";
import { Clock, Play, Sparkles } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { ROUTES } from "@/constants/routes";
import { formatWatchTime, progressPct, relativeTime } from "@/lib/history/derive";
import type { AnimeAggregate } from "@/lib/history/types";
import { watchHref } from "@/hooks/use-history-dashboard";
import type { RecentlyViewedAnime } from "@/lib/core/recently-viewed";

export function HistoryContinueSection({ items }: { items: AnimeAggregate[] }) {
  const t = useT();
  if (!items.length) return null;
  const primary = items[0];
  const ep = primary.latestEpisode;
  const pct = ep ? progressPct(ep.currentTime, ep.duration) : 0;
  const remaining =
    ep && ep.duration > ep.currentTime ? ep.duration - ep.currentTime : 0;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white/85">
            {t("history.sections.continue")}
          </h2>
          <p className="mt-0.5 text-[11px] font-mono text-white/30">
            {t("history.sections.continueHint")}
          </p>
        </div>
      </div>

      <div className="site-panel mb-3 overflow-hidden rounded-2xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={watchHref(primary)}
            className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-black/40 ring-1 ring-white/8 sm:w-56"
          >
            {primary.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={primary.poster} alt="" className="h-full w-full object-cover" />
            ) : null}
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
              <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white/90">{primary.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-white/45">
              {ep?.episodeNumber != null ? (
                <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-sky-300/80">
                  {t("history.episode", { n: ep.episodeNumber })}
                </span>
              ) : null}
              <span>{pct}% · {t("history.sections.remaining", { time: formatWatchTime(remaining) })}</span>
              <span className="inline-flex items-center gap-1 font-mono text-white/30">
                <Clock className="h-3 w-3" />
                {relativeTime(primary.lastWatched)}
              </span>
            </div>
            <Link
              href={watchHref(primary)}
              className="site-brand-btn mt-3 inline-flex h-9 items-center gap-2 rounded-xl px-4 text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5" />
              {t("history.resume")}
            </Link>
          </div>
        </div>
      </div>

      {items.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {items.slice(1).map((it) => {
            const e = it.latestEpisode;
            const p = e ? progressPct(e.currentTime, e.duration) : 0;
            return (
              <Link
                key={it.animeId}
                href={watchHref(it)}
                className="site-panel-hover w-40 shrink-0 overflow-hidden rounded-xl"
              >
                <div className="relative aspect-video bg-black/40">
                  {it.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
                  ) : null}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                    <div className="h-full bg-sky-400" style={{ width: `${p}%` }} />
                  </div>
                </div>
                <div className="p-2">
                  <p className="line-clamp-2 text-[11px] font-semibold text-white/80">{it.title}</p>
                  {e?.episodeNumber != null ? (
                    <p className="mt-1 font-mono text-[10px] text-white/30">
                      {t("history.episode", { n: e.episodeNumber })}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function HistoryFinishedSection({ items }: { items: AnimeAggregate[] }) {
  const t = useT();
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-sm font-bold tracking-wide text-white/85">
          {t("history.sections.finished")}
        </h2>
        <p className="mt-0.5 text-[11px] font-mono text-white/30">
          {t("history.sections.finishedHint")}
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.map((it) => (
          <Link
            key={it.animeId}
            href={`${ROUTES.ANIME_DETAILS}/${encodeURIComponent(it.animeId)}`}
            className="site-panel-hover w-32 shrink-0 overflow-hidden rounded-xl"
          >
            <div className="relative aspect-[2/3] bg-black/40">
              {it.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : null}
              <span className="absolute left-1.5 top-1.5 rounded-md border border-emerald-400/25 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-200">
                {t("history.finished")}
              </span>
            </div>
            <div className="space-y-1 p-2">
              <p className="line-clamp-2 text-[11px] font-semibold text-white/80">{it.title}</p>
              <p className="font-mono text-[10px] text-white/30">
                {it.episodes.length
                  ? t("history.sections.epsCount", { n: it.episodes.length })
                  : relativeTime(it.listUpdatedAt ?? it.lastWatched)}
                {it.score != null ? ` · ★${it.score}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HistoryRecentlyAddedSection({
  items,
  viewed,
}: {
  items: AnimeAggregate[];
  viewed: RecentlyViewedAnime[];
}) {
  const t = useT();
  const list = items.length
    ? items.map((a) => ({
        id: a.animeId,
        name: a.title,
        poster: a.poster,
        at: a.addedAt ? new Date(a.addedAt).getTime() : 0,
      }))
    : viewed;

  if (!list.length) return null;
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-sky-300/70" />
        <div>
          <h2 className="text-sm font-bold tracking-wide text-white/85">
            {t("history.sections.added")}
          </h2>
          <p className="mt-0.5 text-[11px] font-mono text-white/30">
            {t("history.sections.addedHint")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {list.slice(0, 16).map((it) => (
          <Link
            key={it.id}
            href={`${ROUTES.ANIME_DETAILS}/${encodeURIComponent(it.id)}`}
            className="site-panel-hover w-28 shrink-0 overflow-hidden rounded-xl"
          >
            <div className="aspect-[2/3] bg-black/40">
              {it.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-2">
              <p className="line-clamp-2 text-[11px] font-semibold text-white/80">{it.name}</p>
              <p className="mt-1 font-mono text-[10px] text-white/30">
                {it.at ? relativeTime(new Date(it.at).toISOString()) : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
