"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Heart,
  ListPlus,
  Play,
  Share2,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { formatWatchTime, progressPct, relativeTime, timeToFinishDays } from "@/lib/history/derive";
import type { AnimeAggregate } from "@/lib/history/types";
import { watchHref } from "@/hooks/use-history-dashboard";
import { useBookmarkLabels } from "@/hooks/use-bookmark-labels";
import { accountContinue, accountWatchlist, statusToFolder } from "@/lib/oauth/account";
import { useWatchlistStore } from "@/store/watchlist-store";
import { toast } from "sonner";

type Props = {
  item: AnimeAggregate;
  variant?: "row" | "grid";
  onNoteSave?: (animeId: string, note: string) => void;
};

export default function HistoryCard({ item, variant = "row", onNoteSave }: Props) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(item.note);
  const [busy, setBusy] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const labels = useBookmarkLabels();
  const bump = useWatchlistStore((s) => s.bump);

  useEffect(() => setNote(item.note), [item.note]);

  const ep = item.latestEpisode;
  const pct = ep ? progressPct(ep.currentTime, ep.duration) : 0;
  const href = watchHref(item);
  const detailHref = `${ROUTES.ANIME_DETAILS}/${encodeURIComponent(item.animeId)}`;
  const finishDays = timeToFinishDays(item);

  const upsertList = async (status: string) => {
    await accountWatchlist.add({
      animeId: item.animeId,
      folder: statusToFolder(status),
      animeTitle: item.title,
      animeThumbnail: item.poster,
      ...(item.anilistId ? { anilistId: item.anilistId } : {}),
      ...(item.malId ? { malId: item.malId } : {}),
    });
    bump();
  };

  const markFinished = async () => {
    setBusy(true);
    try {
      await upsertList("completed");
      toast.success(t("history.actions.markedFinished"));
    } catch {
      toast.error(t("history.actions.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status: string) => {
    setBusy(true);
    try {
      await upsertList(status);
    } catch {
      toast.error(t("history.actions.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const removeProgress = async () => {
    if (!ep?.episodeId) return;
    setBusy(true);
    try {
      await accountContinue.remove(item.animeId, ep.episodeId);
      bump();
      toast.success(t("history.actions.removed"));
    } catch {
      toast.error(t("history.actions.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const rate = async (score: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/anime/${encodeURIComponent(item.animeId)}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          score,
          body: "",
          animeTitle: item.title,
          animeThumbnail: item.poster,
          anilistId: item.anilistId,
        }),
      });
      if (!res.ok) throw new Error();
      bump();
      toast.success(t("history.actions.rated"));
      setRatingOpen(false);
    } catch {
      toast.error(t("history.actions.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${detailHref}` : detailHref;
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success(t("history.actions.linkCopied"));
      }
    } catch {
      /* user cancel */
    }
  };

  if (variant === "grid") {
    return (
      <article className="site-panel-hover group relative overflow-hidden rounded-xl">
        <Link href={href} className="block">
          <div className="relative aspect-[2/3] overflow-hidden bg-black/40">
            {item.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.poster}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-white/15">?</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            {pct > 0 ? (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
                <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
              </div>
            ) : null}
            {ep?.episodeNumber != null ? (
              <span className="absolute bottom-2 left-2 rounded-md border border-white/15 bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
                {t("history.episode", { n: ep.episodeNumber })}
              </span>
            ) : null}
            {item.score != null ? (
              <span className="absolute right-2 top-2 inline-flex items-center gap-0.5 rounded-md border border-amber-400/25 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                <Star className="h-2.5 w-2.5" />
                {item.score}
              </span>
            ) : null}
          </div>
          <div className="space-y-1 p-2.5">
            <p className="line-clamp-2 text-[12px] font-semibold leading-snug text-white/88">
              {item.title}
            </p>
            <p className="font-mono text-[10px] text-white/30">
              {relativeTime(item.lastWatched)}
            </p>
          </div>
        </Link>
        <div className="flex gap-1 px-2 pb-2">
          <Link
            href={href}
            className="site-ghost-btn inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-lg text-[10px] font-semibold"
          >
            <Play className="h-3 w-3" />
            {t("history.resume")}
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="site-ghost-btn inline-flex h-7 w-7 items-center justify-center rounded-lg"
            aria-label={t("history.actions.expand")}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        {expanded ? (
          <ExpandedBody
            item={item}
            note={note}
            setNote={setNote}
            onNoteSave={onNoteSave}
            busy={busy}
            labels={labels}
            changeStatus={changeStatus}
            markFinished={markFinished}
            removeProgress={removeProgress}
            rate={rate}
            ratingOpen={ratingOpen}
            setRatingOpen={setRatingOpen}
            share={share}
            detailHref={detailHref}
            finishDays={finishDays}
            t={t}
          />
        ) : null}
      </article>
    );
  }

  return (
    <article className="site-panel-hover overflow-hidden rounded-xl">
      <div className="flex items-center gap-3 p-2.5">
        <Link href={href} className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/8 sm:w-32">
          {item.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.poster} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : null}
          {pct > 0 ? (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/50">
              <div className="h-full bg-sky-400" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={detailHref} className="truncate text-sm font-semibold text-white/90 hover:text-white">
            {item.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ep?.episodeNumber != null ? (
              <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[10px] text-sky-300/80">
                {t("history.episode", { n: ep.episodeNumber })}
              </span>
            ) : null}
            {item.status ? (
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/45">
                {item.status}
              </span>
            ) : null}
            {item.score != null ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-300/80">
                <Star className="h-2.5 w-2.5" />
                {item.score}
              </span>
            ) : null}
            <span className="font-mono text-[10px] text-white/25">
              {relativeTime(item.lastWatched)}
            </span>
            {item.totalWatchedSeconds > 0 ? (
              <span className="font-mono text-[10px] text-white/25">
                · {formatWatchTime(item.totalWatchedSeconds)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={href}
            className="site-ghost-btn hidden h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold sm:inline-flex"
          >
            <Play className="h-3 w-3" />
            {t("history.resume")}
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="site-ghost-btn inline-flex h-8 w-8 items-center justify-center rounded-lg"
            aria-expanded={expanded}
            aria-label={t("history.actions.expand")}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {expanded ? (
        <ExpandedBody
          item={item}
          note={note}
          setNote={setNote}
          onNoteSave={onNoteSave}
          busy={busy}
          labels={labels}
          changeStatus={changeStatus}
          markFinished={markFinished}
          removeProgress={removeProgress}
          rate={rate}
          ratingOpen={ratingOpen}
          setRatingOpen={setRatingOpen}
          share={share}
          detailHref={detailHref}
          finishDays={finishDays}
          t={t}
        />
      ) : null}
    </article>
  );
}

function ExpandedBody({
  item,
  note,
  setNote,
  onNoteSave,
  busy,
  labels,
  changeStatus,
  markFinished,
  removeProgress,
  rate,
  ratingOpen,
  setRatingOpen,
  share,
  detailHref,
  finishDays,
  t,
}: {
  item: AnimeAggregate;
  note: string;
  setNote: (v: string) => void;
  onNoteSave?: (animeId: string, note: string) => void;
  busy: boolean;
  labels: { value: string; label: string }[];
  changeStatus: (s: string) => Promise<void>;
  markFinished: () => Promise<void>;
  removeProgress: () => Promise<void>;
  rate: (n: number) => Promise<void>;
  ratingOpen: boolean;
  setRatingOpen: (v: boolean) => void;
  share: () => Promise<void>;
  detailHref: string;
  finishDays: number | null;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-top-1 border-t border-white/[0.06] bg-black/20 px-3 py-3 duration-200">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative hidden aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-lg sm:block">
          {item.poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.poster} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {item.genres.map((g) => (
              <span
                key={g}
                className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-white/50"
              >
                {g}
              </span>
            ))}
            {item.studios.map((s) => (
              <span
                key={s}
                className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300/70"
              >
                {s}
              </span>
            ))}
            {!item.genres.length && !item.studios.length ? (
              <p className="text-[11px] text-white/30">{t("history.expand.noMeta")}</p>
            ) : null}
          </div>

          {finishDays != null ? (
            <p className="text-[11px] text-white/40">
              {t("history.expand.timeToFinish", { days: finishDays })}
            </p>
          ) : null}

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-white/35">
              {t("history.expand.timeline")}
            </p>
            <ul className="max-h-28 space-y-1 overflow-y-auto">
              {item.episodes.slice(0, 12).map((ep) => (
                <li
                  key={`${ep.animeId}-${ep.episodeId}`}
                  className="flex items-center justify-between gap-2 font-mono text-[10px] text-white/40"
                >
                  <span>
                    {ep.episodeNumber != null
                      ? t("history.episode", { n: ep.episodeNumber })
                      : ep.episodeId}
                  </span>
                  <span>{relativeTime(ep.lastUpdated)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-white/35">
              {t("history.expand.notes")}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => onNoteSave?.(item.animeId, note)}
              rows={2}
              maxLength={2000}
              placeholder={t("history.expand.notesPlaceholder")}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white/80 outline-none placeholder:text-white/25 focus:border-sky-500/40"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={watchHref(item)}
              className="site-brand-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold"
            >
              <Play className="h-3 w-3" />
              {t("history.resume")}
            </Link>
            <Link
              href={detailHref}
              className="site-ghost-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold"
            >
              <ExternalLink className="h-3 w-3" />
              {t("history.actions.open")}
            </Link>
            <button
              type="button"
              disabled={busy}
              onClick={() => void markFinished()}
              className="site-ghost-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold disabled:opacity-40"
            >
              <CheckCircle2 className="h-3 w-3" />
              {t("history.actions.markFinished")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRatingOpen(!ratingOpen)}
              className="site-ghost-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold"
            >
              <Star className="h-3 w-3" />
              {t("history.actions.rate")}
            </button>
            <div className="relative">
              <select
                disabled={busy}
                value={item.status ?? ""}
                onChange={(e) => {
                  if (e.target.value) void changeStatus(e.target.value);
                }}
                className="site-ghost-btn h-8 appearance-none rounded-lg px-2.5 pr-7 text-[11px] font-semibold outline-none"
                aria-label={t("history.changeStatus")}
              >
                <option value="">{t("history.actions.addToList")}</option>
                {labels.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ListPlus className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
            </div>
            <button
              type="button"
              onClick={() => void share()}
              className="site-ghost-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold"
            >
              <Share2 className="h-3 w-3" />
              {t("history.actions.share")}
            </button>
            <button
              type="button"
              disabled={busy || !item.latestEpisode}
              onClick={() => void removeProgress()}
              className="site-ghost-btn inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-rose-300/80 disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" />
              {t("history.actions.remove")}
            </button>
            <span
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-white/10 px-2.5 text-[11px] text-white/25"
              title={t("history.actions.favoritesSoon")}
            >
              <Heart className="h-3 w-3" />
              {t("history.actions.favorites")}
            </span>
          </div>

          {ratingOpen ? (
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onClick={() => void rate(n)}
                  className={cn(
                    "h-7 w-7 rounded-md border text-[11px] font-bold tabular-nums transition-colors",
                    item.score === n
                      ? "border-amber-400/40 bg-amber-500/20 text-amber-200"
                      : "border-white/10 bg-white/[0.03] text-white/50 hover:border-amber-400/30 hover:text-amber-200",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
