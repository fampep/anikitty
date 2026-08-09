"use client";

import Link from "next/link";
import { ArrowRight, Clock, Play, Sparkles, Star } from "lucide-react";
import { useT } from "@/providers/i18n-provider";
import { ROUTES } from "@/constants/routes";
import { formatWatchTime, progressPct, relativeTime } from "@/lib/history/derive";
import type { AnimeAggregate } from "@/lib/history/types";
import { watchHref } from "@/hooks/use-history-dashboard";
import type { RecentlyViewedAnime } from "@/lib/core/recently-viewed";

/** Section heading in the genre-directory voice: quiet eyebrow, no chrome. */
function RailHeading({
  title,
  hint,
  icon: Icon,
}: {
  title: string;
  hint?: string;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground dark:text-white/35" />
      ) : null}
      <div className="min-w-0">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/70 dark:text-white/60">
          {title}
        </h2>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-muted-foreground dark:text-white/30">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** The fanned trio from the genre cards, reused as an "up next" preview. */
function PosterStack({ items }: { items: AnimeAggregate[] }) {
  const posters = items.filter((a) => a.poster).slice(0, 3);
  if (!posters.length) return null;

  return (
    <span className="history-posters" aria-hidden>
      {posters.map((a, i) => (
        <span key={a.animeId} style={{ ["--poster-index" as string]: i }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.poster} alt="" className="h-full w-full object-cover" />
        </span>
      ))}
    </span>
  );
}

export function HistoryContinueSection({ items }: { items: AnimeAggregate[] }) {
  const t = useT();
  if (!items.length) return null;

  const primary = items[0];
  const ep = primary.latestEpisode;
  const pct = ep ? progressPct(ep.currentTime, ep.duration) : 0;
  const remaining = ep && ep.duration > ep.currentTime ? ep.duration - ep.currentTime : 0;
  const rest = items.slice(1);

  return (
    <section className="mb-8">
      <Link
        href={watchHref(primary)}
        className="history-spotlight group relative isolate grid min-h-[16rem] overflow-hidden rounded-2xl border border-border/60 p-5 dark:border-white/[0.08] sm:min-h-[18rem] sm:p-7 lg:grid-cols-[minmax(0,1fr)_13rem]"
        style={{ ["--history-index" as string]: 0 }}
      >
        {primary.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primary.poster}
            alt=""
            className="history-spotlight__art absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="history-spotlight__wash" aria-hidden />
        )}

        <span className="history-spotlight__scrim" aria-hidden />

        {pct > 0 && (
          <span className="history-badge absolute right-4 top-4 z-[2] rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
            {t("history.percentWatched", { p: pct })}
          </span>
        )}

        <span className="relative z-[2] flex h-full flex-col justify-end self-stretch">
          <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
            <Play className="h-3.5 w-3.5" />
            {t("history.sections.continueHint")}
          </span>

          <span className="line-clamp-2 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {primary.title}
          </span>

          <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-white/60 sm:text-[13px]">
            {ep?.episodeNumber != null ? (
              <span className="rounded-md border border-white/12 bg-white/[0.08] px-1.5 py-0.5 font-mono text-white/80">
                {t("history.episode", { n: ep.episodeNumber })}
              </span>
            ) : null}
            {remaining > 0 ? (
              <span>{t("history.sections.remaining", { time: formatWatchTime(remaining) })}</span>
            ) : null}
            <span className="inline-flex items-center gap-1 font-mono text-white/40">
              <Clock className="h-3 w-3" />
              {relativeTime(primary.lastWatched)}
            </span>
          </span>

          {pct > 0 ? (
            <span className="history-progress mt-4 block h-1 w-full max-w-md rounded-full">
              <span style={{ width: `${pct}%` }} />
            </span>
          ) : null}

          <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition-transform duration-200 group-hover:translate-x-1">
            {t("history.resume")}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </span>

        <span className="relative z-[2] mt-6 hidden items-end justify-end lg:flex">
          <PosterStack items={rest.length ? rest : [primary]} />
        </span>
      </Link>

      {rest.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rest.map((it, i) => {
            const e = it.latestEpisode;
            const p = e ? progressPct(e.currentTime, e.duration) : 0;
            return (
              <Link
                key={it.animeId}
                href={watchHref(it)}
                className="history-tile group relative isolate flex min-h-[8rem] w-44 shrink-0 flex-col justify-end overflow-hidden rounded-xl border border-border/60 p-3 dark:border-white/[0.08]"
                style={{ ["--history-index" as string]: i + 1 }}
              >
                {it.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.poster}
                    alt=""
                    loading="lazy"
                    className="history-tile__art absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="history-tile__wash" aria-hidden />
                )}
                <span className="history-tile__scrim" aria-hidden />

                <span className="relative z-[2] block min-h-[3.5rem]">
                  <span className="line-clamp-2 block text-[12px] font-semibold leading-snug text-foreground dark:text-white">
                    {it.title}
                  </span>
                  {e?.episodeNumber != null ? (
                    <span className="mt-1 block font-mono text-[10px] text-muted-foreground dark:text-white/40">
                      {t("history.episode", { n: e.episodeNumber })}
                    </span>
                  ) : null}
                </span>

                {p > 0 ? (
                  <span className="history-progress relative z-[2] mt-2 block h-1 rounded-full">
                    <span style={{ width: `${p}%` }} />
                  </span>
                ) : null}
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
      <RailHeading
        title={t("history.sections.finished")}
        hint={t("history.sections.finishedHint")}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it, i) => (
          <Link
            key={it.animeId}
            href={`${ROUTES.ANIME_DETAILS}/${encodeURIComponent(it.animeId)}`}
            className="history-tile group relative isolate flex w-36 shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08]"
            style={{ ["--history-index" as string]: i }}
          >
            <span className="relative block aspect-[2/3] overflow-hidden">
              {it.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.poster}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="history-badge absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em]">
                {t("history.finished")}
              </span>
              {it.score != null ? (
                <span className="history-badge absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                  <Star className="h-2.5 w-2.5" />
                  {it.score}
                </span>
              ) : null}
            </span>
            <span className="relative z-[2] block space-y-1 p-2.5">
              <span className="line-clamp-2 block text-[12px] font-semibold leading-snug text-foreground dark:text-white">
                {it.title}
              </span>
              <span className="block font-mono text-[10px] text-muted-foreground dark:text-white/35">
                {it.episodes.length
                  ? t("history.sections.epsCount", { n: it.episodes.length })
                  : relativeTime(it.listUpdatedAt ?? it.lastWatched)}
              </span>
            </span>
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
      <RailHeading
        title={t("history.sections.added")}
        hint={t("history.sections.addedHint")}
        icon={Sparkles}
      />
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {list.slice(0, 16).map((it, i) => (
          <Link
            key={it.id}
            href={`${ROUTES.ANIME_DETAILS}/${encodeURIComponent(it.id)}`}
            className="history-tile group relative isolate flex w-32 shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 dark:border-white/[0.08]"
            style={{ ["--history-index" as string]: i }}
          >
            <span className="relative block aspect-[2/3] overflow-hidden">
              {it.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.poster}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              ) : null}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </span>
            <span className="relative z-[2] block p-2.5">
              <span className="line-clamp-2 block text-[11px] font-semibold leading-snug text-foreground dark:text-white">
                {it.name}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground dark:text-white/35">
                {it.at ? relativeTime(new Date(it.at).toISOString()) : ""}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
