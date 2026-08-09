"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, SkipForward } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { usePlayerSeekStore } from "@/store/player-seek-store";
import {
  SKIP_SEGMENT_TYPES,
  formatSkipSeconds,
  isSkipSegmentType,
  parseEpisodeList,
  parseSkipTimeInput,
  validateSkipSegment,
  type SkipSegmentType,
} from "@/lib/skip/community-skip";
import { useT } from "@/providers/i18n-provider";
import LoginPopoverButton from "@/components/auth/login-popover-button";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/lib/core/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anilistId: number;
  malId?: number;
  animeTitle: string;
  episode: number;
  episodeTitle?: string | null;
  preferSegment?: "intro" | "outro" | "recap" | "preview";
};

function livePlayerTime(): number {
  return usePlayerSeekStore.getState().getCurrentTime?.() ?? 0;
}

function livePlayerDuration(): number {
  const d = usePlayerSeekStore.getState().getDuration?.() ?? 0;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function TimeField({
  label,
  value,
  onChange,
  onUseNow,
  nowLabel,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUseNow: () => void;
  nowLabel: string;
  required?: boolean;
  placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-mono uppercase tracking-wide text-white/35">
        {label}
        {required ? <span className="text-teal-300/80"> *</span> : null}
      </label>
      <div className="flex gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 min-w-0 rounded-md px-2.5 py-2 text-sm font-mono tabular-nums bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20"
        />
        <button
          type="button"
          onClick={onUseNow}
          className="shrink-0 px-2.5 py-2 rounded-md border border-white/10 text-[11px] font-semibold text-white/55 hover:text-teal-100 hover:border-teal-400/35 hover:bg-teal-500/15 transition-colors"
        >
          {nowLabel}
        </button>
      </div>
    </div>
  );
}

export default function SkipTimesSubmitDialog({
  open,
  onOpenChange,
  anilistId,
  malId,
  animeTitle,
  episode,
  episodeTitle,
  preferSegment,
}: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const initialType: SkipSegmentType =
    preferSegment === "outro" ? "credits" : isSkipSegmentType(preferSegment) ? preferSegment : "intro";

  const [segmentType, setSegmentType] = useState<SkipSegmentType>(initialType);
  const [episodesInput, setEpisodesInput] = useState(String(episode));
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [duration, setDuration] = useState("");
  const [timingOpen, setTimingOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [clock, setClock] = useState("0:00");

  useEffect(() => {
    if (!open) return;
    setSegmentType(initialType);
    setEpisodesInput(String(episode));
    setStart("");
    setEnd("");
    const dur = livePlayerDuration();
    setDuration(dur > 0 ? formatSkipSeconds(dur) : "");
    setTimingOpen(false);
  }, [open, episode, initialType]);

  useEffect(() => {
    if (!open) return;
    const tick = () => setClock(formatSkipSeconds(livePlayerTime()));
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open || !auth) return;
    let cancelled = false;
    (async () => {
      try {
        const subRes = await fetch(
          `/api/account/skip-submissions?anilistId=${anilistId}&episode=${episode}`,
          withAuth(),
        );
        const subData = await subRes.json();
        if (cancelled) return;
        // Status banner only — do not lock the form or prefill, so users can
        // submit intro + credits + other segments while one awaits review.
        setPendingStatus(subData.submission?.status ?? null);
      } catch {
        if (!cancelled) setPendingStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, auth, anilistId, episode]);

  const markNow = (setter: (v: string) => void) => {
    setter(formatSkipSeconds(livePlayerTime()));
  };

  const parsedEpisodes = useMemo(() => parseEpisodeList(episodesInput), [episodesInput]);

  const submitPayload = async (noSegment: boolean) => {
    if (!auth) return;
    if (parsedEpisodes.length === 0) {
      toast.error(t("skipSubmit.needEpisodes"));
      return;
    }

    const startSec = parseSkipTimeInput(start);
    const endSec = parseSkipTimeInput(end);
    const durationSec = parseSkipTimeInput(duration);

    if (!noSegment) {
      const err = validateSkipSegment({
        start: startSec,
        end: endSec,
        duration: durationSec,
        noSegment: false,
      });
      if (err) {
        toast.error(err);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        "/api/account/skip-submissions",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anilistId,
            malId,
            animeTitle,
            episodes: parsedEpisodes,
            segmentType,
            start: noSegment ? null : (startSec ?? 0),
            end: noSegment ? null : endSec,
            duration: durationSec,
            noSegment,
            notes: null,
          }),
        }),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? t("skipSubmit.failed"));
      toast.success(t("skipSubmit.sent"));
      setPendingStatus("pending");
      onOpenChange(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("skipSubmit.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="border border-white/10 bg-[#0a0a0c] rounded-xl max-w-lg w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-black/50 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/[0.07] text-left space-y-2">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-white font-semibold text-[15px] tracking-tight">
              <SkipForward className="h-4 w-4 text-teal-300/90" />
              {t("skipSubmit.title")}
            </DialogTitle>
            <span className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[11px] tabular-nums text-teal-200/90">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
              {clock}
            </span>
          </div>
          <DialogDescription className="text-white/45 text-sm leading-relaxed">
            {t("skipSubmit.contributeLead")}{" "}
            <Link
              href={ROUTES.TIMESTAMPS}
              className="text-teal-300/85 hover:text-teal-200 underline-offset-2 hover:underline"
            >
              {t("skipSubmit.browseDatabase")}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[min(70vh,560px)] overflow-y-auto">
          {!auth ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5 text-center space-y-3">
              <p className="text-sm text-white/50">{t("skipSubmit.signIn")}</p>
              <LoginPopoverButton />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white/90 truncate">{animeTitle}</p>
                {episodeTitle ? (
                  <p className="text-xs text-white/45 truncate">{episodeTitle}</p>
                ) : null}
              </div>

              {pendingStatus === "pending" && (
                <p className="text-xs text-amber-200/90 bg-amber-500/10 border border-amber-400/20 rounded-md px-3 py-2">
                  {t("skipSubmit.pending")}
                </p>
              )}
              {pendingStatus === "approved" && (
                <p className="text-xs text-emerald-200/90 bg-emerald-500/10 border border-emerald-400/20 rounded-md px-3 py-2">
                  {t("skipSubmit.approved")}
                </p>
              )}
              {pendingStatus === "rejected" && (
                <p className="text-xs text-rose-200/90 bg-rose-500/10 border border-rose-400/20 rounded-md px-3 py-2">
                  {t("skipSubmit.rejected")}
                </p>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wide text-white/35">
                  {t("skipSubmit.episodes")} <span className="text-teal-300/80">*</span>
                </label>
                <input
                  type="text"
                  value={episodesInput}
                  onChange={(e) => setEpisodesInput(e.target.value)}
                  placeholder={t("skipSubmit.episodesPlaceholder")}
                  className="w-full rounded-md px-2.5 py-2 text-sm font-mono bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20"
                />
                <p className="text-[11px] text-white/30 leading-relaxed">
                  {t("skipSubmit.episodesHint")}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wide text-white/35">
                  {t("skipSubmit.segmentType")} <span className="text-teal-300/80">*</span>
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {SKIP_SEGMENT_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSegmentType(type)}
                      className={cn(
                        "rounded-md px-2 py-2 text-xs font-semibold border transition-colors",
                        segmentType === type
                          ? "border-teal-400/40 bg-teal-500/15 text-teal-100"
                          : "border-white/10 bg-white/[0.02] text-white/45 hover:text-white/75",
                      )}
                    >
                      {t(`skipSubmit.type.${type}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-teal-400/20 bg-teal-500/[0.06] p-3 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-white/50">{t("skipSubmit.hintMark")}</p>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-teal-200/90">
                    {t("skipSubmit.liveClock", { time: clock })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => markNow(setStart)}
                    className="rounded-md border border-teal-400/30 bg-teal-500/15 px-3 py-2.5 text-[12px] font-semibold text-teal-100 hover:bg-teal-500/25 transition-colors"
                  >
                    {t("skipSubmit.markStart")}
                    {start ? (
                      <span className="mt-0.5 block font-mono text-[10px] font-normal text-teal-200/70">
                        {start}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => markNow(setEnd)}
                    className="rounded-md border border-teal-400/30 bg-teal-500/15 px-3 py-2.5 text-[12px] font-semibold text-teal-100 hover:bg-teal-500/25 transition-colors"
                  >
                    {t("skipSubmit.markEnd")}
                    {end ? (
                      <span className="mt-0.5 block font-mono text-[10px] font-normal text-teal-200/70">
                        {end}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TimeField
                  label={t("skipSubmit.start")}
                  value={start}
                  onChange={setStart}
                  onUseNow={() => markNow(setStart)}
                  nowLabel={t("skipSubmit.usePlayer")}
                  placeholder={t("skipSubmit.startPlaceholder")}
                />
                <TimeField
                  label={t("skipSubmit.end")}
                  value={end}
                  onChange={setEnd}
                  onUseNow={() => markNow(setEnd)}
                  nowLabel={t("skipSubmit.usePlayer")}
                  required
                  placeholder={t("skipSubmit.endPlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wide text-white/35">
                  {t("skipSubmit.duration")}
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={t("skipSubmit.durationPlaceholder")}
                  className="w-full rounded-md px-2.5 py-2 text-sm font-mono bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-teal-400/40 focus:ring-1 focus:ring-teal-400/20"
                />
              </div>

              <button
                type="button"
                onClick={() => setTimingOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left text-[11px] text-white/40 hover:text-white/65 transition-colors"
              >
                <span>{t("skipSubmit.timingInfo")}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", timingOpen && "rotate-180")} />
              </button>
              {timingOpen ? (
                <ul className="text-[11px] text-white/35 leading-relaxed space-y-1 pl-3 list-disc">
                  <li>{t("skipSubmit.timingBulletStart")}</li>
                  <li>{t("skipSubmit.timingBulletEnd")}</li>
                  <li>{t("skipSubmit.timingBulletDuration")}</li>
                  <li>{t("skipSubmit.timingBulletInclude")}</li>
                </ul>
              ) : null}
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-3.5 gap-2 sm:gap-2 sm:justify-between border-t border-white/[0.07] bg-white/[0.02] flex-col-reverse sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="px-3.5 py-2 rounded-md border border-white/10 text-white/55 text-xs font-semibold hover:bg-white/5 hover:text-white/80 transition-colors disabled:opacity-40"
          >
            {t("comments.cancel")}
          </button>
          {auth ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {segmentType === "intro" ? (
                <button
                  type="button"
                  onClick={() => void submitPayload(true)}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-md border border-white/10 text-xs font-semibold text-white/60 hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  {t("skipSubmit.noIntro")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void submitPayload(false)}
                disabled={submitting}
                className="px-3.5 py-2 rounded-md text-xs font-semibold bg-teal-400 text-zinc-950 hover:bg-teal-300 disabled:opacity-40 transition-colors"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t("common.loading")}
                  </span>
                ) : (
                  t("skipSubmit.submitForReview")
                )}
              </button>
            </div>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
