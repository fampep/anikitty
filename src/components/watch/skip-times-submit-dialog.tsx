"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, SkipForward } from "lucide-react";
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
  formatSkipSeconds,
  parseSkipTimeInput,
  validateSkipInterval,
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
  preferSegment?: "intro" | "outro";
};

function livePlayerTime(): number {
  return usePlayerSeekStore.getState().getCurrentTime?.() ?? 0;
}

function TimeField({
  label,
  value,
  onChange,
  onUseNow,
  nowLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUseNow: () => void;
  nowLabel: string;
}) {
  const filled = !!value.trim();
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[10px] font-mono uppercase tracking-wide text-white/35">
        {label}
      </label>
      <div className="flex gap-1.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="1:30"
          spellCheck={false}
          autoComplete="off"
          className={cn(
            "flex-1 min-w-0 rounded-md px-2.5 py-2 text-sm font-mono tabular-nums",
            "bg-white/[0.05] border text-white placeholder:text-white/25",
            "focus:outline-none focus:ring-1 focus:ring-teal-400/25",
            filled
              ? "border-teal-400/35 focus:border-teal-400/50"
              : "border-white/10 focus:border-teal-400/40",
          )}
        />
        <button
          type="button"
          onClick={onUseNow}
          title={nowLabel}
          className="shrink-0 px-2.5 py-2 rounded-md border border-white/10 text-[11px] font-semibold text-white/55 hover:text-teal-100 hover:border-teal-400/35 hover:bg-teal-500/15 transition-colors"
        >
          {nowLabel}
        </button>
      </div>
    </div>
  );
}

function SegmentBlock({
  title,
  accent,
  ready,
  start,
  end,
  onStartChange,
  onEndChange,
  onStartNow,
  onEndNow,
  startLabel,
  endLabel,
  nowLabel,
}: {
  title: string;
  accent: "intro" | "outro";
  ready: boolean;
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onStartNow: () => void;
  onEndNow: () => void;
  startLabel: string;
  endLabel: string;
  nowLabel: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2.5",
        accent === "intro"
          ? "border-teal-400/20 bg-teal-500/[0.04]"
          : "border-white/10 bg-white/[0.02]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wide",
            accent === "intro" ? "text-teal-300/80" : "text-white/45",
          )}
        >
          {title}
        </p>
        {ready ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-300/80">
            <Check className="w-3 h-3" />
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TimeField
          label={startLabel}
          value={start}
          onChange={onStartChange}
          onUseNow={onStartNow}
          nowLabel={nowLabel}
        />
        <TimeField
          label={endLabel}
          value={end}
          onChange={onEndChange}
          onUseNow={onEndNow}
          nowLabel={nowLabel}
        />
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
  preferSegment,
}: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const [introStart, setIntroStart] = useState("");
  const [introEnd, setIntroEnd] = useState("");
  const [outroStart, setOutroStart] = useState("");
  const [outroEnd, setOutroEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [clock, setClock] = useState("0:00");

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
        const sub = subData.submission;
        setPendingStatus(sub?.status ?? null);
        if (sub?.status === "pending") {
          setIntroStart(sub.introStart != null ? formatSkipSeconds(sub.introStart) : "");
          setIntroEnd(sub.introEnd != null ? formatSkipSeconds(sub.introEnd) : "");
          setOutroStart(sub.outroStart != null ? formatSkipSeconds(sub.outroStart) : "");
          setOutroEnd(sub.outroEnd != null ? formatSkipSeconds(sub.outroEnd) : "");
        } else if (!sub) {
          setIntroStart("");
          setIntroEnd("");
          setOutroStart("");
          setOutroEnd("");
        }
      } catch {
        if (!cancelled) setPendingStatus(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, auth, anilistId, episode]);

  const useNow = (setter: (v: string) => void) => {
    setter(formatSkipSeconds(livePlayerTime()));
  };

  const introReady = !!(introStart.trim() && introEnd.trim());
  const outroReady = !!(outroStart.trim() && outroEnd.trim());
  const canSubmit = introReady || outroReady;

  const summary = useMemo(() => {
    const parts: string[] = [];
    if (introReady) parts.push(`OP ${introStart}→${introEnd}`);
    if (outroReady) parts.push(`ED ${outroStart}→${outroEnd}`);
    return parts.join(" · ");
  }, [introReady, outroReady, introStart, introEnd, outroStart, outroEnd]);

  const handleSubmit = async () => {
    if (!auth) return;
    const introStartSec = parseSkipTimeInput(introStart);
    const introEndSec = parseSkipTimeInput(introEnd);
    const outroStartSec = parseSkipTimeInput(outroStart);
    const outroEndSec = parseSkipTimeInput(outroEnd);

    const introErr = validateSkipInterval(introStartSec, introEndSec);
    if (introErr) {
      toast.error(introErr);
      return;
    }
    const outroErr = validateSkipInterval(outroStartSec, outroEndSec);
    if (outroErr) {
      toast.error(outroErr);
      return;
    }

    const hasIntro = introStartSec != null && introEndSec != null;
    const hasOutro = outroStartSec != null && outroEndSec != null;
    if (!hasIntro && !hasOutro) {
      toast.error(t("skipSubmit.needSegment"));
      return;
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
            episode,
            introStart: hasIntro ? introStartSec : null,
            introEnd: hasIntro ? introEndSec : null,
            outroStart: hasOutro ? outroStartSec : null,
            outroEnd: hasOutro ? outroEndSec : null,
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

  const showIntroFirst = preferSegment !== "outro";

  const introBlock = (
    <SegmentBlock
      title={t("skipSubmit.intro")}
      accent="intro"
      ready={introReady}
      start={introStart}
      end={introEnd}
      onStartChange={setIntroStart}
      onEndChange={setIntroEnd}
      onStartNow={() => useNow(setIntroStart)}
      onEndNow={() => useNow(setIntroEnd)}
      startLabel={t("skipSubmit.start")}
      endLabel={t("skipSubmit.end")}
      nowLabel={t("skipSubmit.usePlayer")}
    />
  );

  const outroBlock = (
    <SegmentBlock
      title={t("skipSubmit.outro")}
      accent="outro"
      ready={outroReady}
      start={outroStart}
      end={outroEnd}
      onStartChange={setOutroStart}
      onEndChange={setOutroEnd}
      onStartNow={() => useNow(setOutroStart)}
      onEndNow={() => useNow(setOutroEnd)}
      startLabel={t("skipSubmit.start")}
      endLabel={t("skipSubmit.end")}
      nowLabel={t("skipSubmit.usePlayer")}
    />
  );

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="border border-white/10 bg-[#0a0a0c] rounded-xl max-w-md w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-black/50 [&>button:last-child]:hidden">
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
            {t("skipSubmit.descriptionType", { episode })}{" "}
            <Link
              href={ROUTES.TIMESTAMPS}
              className="text-teal-300/85 hover:text-teal-200 underline-offset-2 hover:underline"
            >
              {t("skipSubmit.browseDatabase")}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3">
          {!auth ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5 text-center space-y-3">
              <p className="text-sm text-white/50">{t("skipSubmit.signIn")}</p>
              <LoginPopoverButton />
            </div>
          ) : (
            <>
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

              {showIntroFirst ? (
                <>
                  {introBlock}
                  {outroBlock}
                </>
              ) : (
                <>
                  {outroBlock}
                  {introBlock}
                </>
              )}

              {summary ? (
                <p className="text-[11px] font-mono text-white/40 tabular-nums">
                  {summary}
                </p>
              ) : (
                <p className="text-[11px] text-white/30 leading-relaxed">
                  {t("skipSubmit.hintType")}
                </p>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-3.5 gap-2 sm:gap-2 sm:justify-end border-t border-white/[0.07] bg-white/[0.02]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="px-3.5 py-2 rounded-md border border-white/10 text-white/55 text-xs font-semibold hover:bg-white/5 hover:text-white/80 transition-colors disabled:opacity-40"
          >
            {t("comments.cancel")}
          </button>
          {auth && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || pendingStatus === "pending" || !canSubmit}
              className={cn(
                "px-3.5 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-40",
                "bg-teal-400 text-zinc-950 hover:bg-teal-300",
              )}
            >
              {submitting ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t("common.loading")}
                </span>
              ) : (
                t("skipSubmit.submit")
              )}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
