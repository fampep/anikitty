"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Loader2, SkipForward, Timer, Trophy } from "lucide-react";
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
  intervalLabel,
  parseSkipTimeInput,
  validateSkipInterval,
} from "@/lib/skip/community-skip";
import { TIMESTAMP_HELPER_DISPLAY } from "@/lib/skip/timestamp-helper-config";
import { TIMESTAMP_TIER_ICONS } from "@/lib/skip/timestamp-tier-icons";
import type { TimestampTier } from "@/lib/skip/timestamp-helper-config";
import type { SkipTimes } from "@/hooks/use-aniskip";
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
};

type SkipStats = {
  approved: number;
  pending: number;
  rejected: number;
  total: number;
  helperProgress: number;
  helperThreshold: number;
  isTimestampHelper: boolean;
  tier?: TimestampTier | null;
  nextTier?: TimestampTier | null;
  tierProgressPct?: number;
};

type RecentSubmission = {
  id: string;
  anilistId: number;
  animeTitle: string | null;
  episode: number;
  status: string;
  introLabel: string | null;
  outroLabel: string | null;
};

function TimeField({
  label,
  value,
  onChange,
  onUsePlayer,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUsePlayer: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/35">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          inputMode="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="1:30"
          className="flex-1 rounded-lg px-3 py-2 text-sm bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={onUsePlayer}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-border dark:border-white/10 text-[11px] font-semibold text-muted-foreground dark:text-white/55 hover:text-zinc-200 hover:border-primary/25 hover:bg-primary/10 transition-colors"
        >
          <Clock className="h-3.5 w-3.5" />
          {t("skipSubmit.usePlayer")}
        </button>
      </div>
    </div>
  );
}

function LiveTimesPanel({
  liveTimes,
  onUseIntro,
  onUseOutro,
}: {
  liveTimes: SkipTimes;
  onUseIntro: () => void;
  onUseOutro: () => void;
}) {
  const t = useT();
  if (!liveTimes.intro && !liveTimes.outro) return null;

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-500/8 p-3 space-y-2">
      <p className="text-[11px] font-mono uppercase tracking-wide text-sky-300/90">
        {t("skipSubmit.liveTimes")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-white/40 mb-1">{t("skipSubmit.intro")}</p>
          <p className="font-mono text-white/80">
            {liveTimes.intro
              ? intervalLabel(liveTimes.intro.start, liveTimes.intro.end)
              : "—"}
          </p>
          {liveTimes.intro && (
            <button
              type="button"
              onClick={onUseIntro}
              className="mt-2 text-[10px] font-semibold text-sky-300 hover:text-sky-200"
            >
              {t("skipSubmit.useLiveIntro")}
            </button>
          )}
        </div>
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2">
          <p className="text-white/40 mb-1">{t("skipSubmit.outro")}</p>
          <p className="font-mono text-white/80">
            {liveTimes.outro
              ? intervalLabel(liveTimes.outro.start, liveTimes.outro.end)
              : "—"}
          </p>
          {liveTimes.outro && (
            <button
              type="button"
              onClick={onUseOutro}
              className="mt-2 text-[10px] font-semibold text-sky-300 hover:text-sky-200"
            >
              {t("skipSubmit.useLiveOutro")}
            </button>
          )}
        </div>
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
}: Props) {
  const t = useT();
  const { auth } = useAuthStore();
  const [introStart, setIntroStart] = useState("");
  const [introEnd, setIntroEnd] = useState("");
  const [outroStart, setOutroStart] = useState("");
  const [outroEnd, setOutroEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [stats, setStats] = useState<SkipStats | null>(null);
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [liveTimes, setLiveTimes] = useState<SkipTimes | null>(null);
  const [leaderboard, setLeaderboard] = useState<
    { username: string; approved: number; role: string; tier?: { id: string; name: string; color: string; icon: string } | null }[]
  >([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const lbRes = await fetch("/api/kitty/skip-leaderboard?limit=5");
        const lbData = await lbRes.json();
        if (!cancelled) setLeaderboard(lbData.contributors ?? []);
      } catch {
        if (!cancelled) setLeaderboard([]);
      }
    })();

    if (!auth) return;

    (async () => {
      try {
        const params = new URLSearchParams({
          stats: "1",
          anilistId: String(anilistId),
          episode: String(episode),
        });
        const res = await fetch(`/api/account/skip-submissions?${params}`, withAuth());
        const data = await res.json();
        if (cancelled) return;

        setStats(data.stats ?? null);
        setRecent(data.recent ?? []);
        setLiveTimes(data.liveTimes ?? null);

        const subRes = await fetch(
          `/api/account/skip-submissions?anilistId=${anilistId}&episode=${episode}`,
          withAuth(),
        );
        const subData = await subRes.json();
        const sub = subData.submission;
        setPendingStatus(sub?.status ?? null);
        if (sub?.status === "pending") {
          setIntroStart(sub.introStart != null ? formatSkipSeconds(sub.introStart) : "");
          setIntroEnd(sub.introEnd != null ? formatSkipSeconds(sub.introEnd) : "");
          setOutroStart(sub.outroStart != null ? formatSkipSeconds(sub.outroStart) : "");
          setOutroEnd(sub.outroEnd != null ? formatSkipSeconds(sub.outroEnd) : "");
        }
      } catch {
        if (!cancelled) {
          setStats(null);
          setRecent([]);
          setLiveTimes(null);
          setPendingStatus(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, auth, anilistId, episode]);

  const usePlayerTime = (setter: (v: string) => void) => {
    const current = usePlayerSeekStore.getState().getCurrentTime?.() ?? 0;
    setter(formatSkipSeconds(current));
  };

  const applyLiveIntro = () => {
    if (!liveTimes?.intro) return;
    setIntroStart(formatSkipSeconds(liveTimes.intro.start));
    setIntroEnd(formatSkipSeconds(liveTimes.intro.end));
  };

  const applyLiveOutro = () => {
    if (!liveTimes?.outro) return;
    setOutroStart(formatSkipSeconds(liveTimes.outro.start));
    setOutroEnd(formatSkipSeconds(liveTimes.outro.end));
  };

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
      const res = await fetch("/api/account/skip-submissions", withAuth({
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
          notes: notes.trim() || null,
        }),
      }));
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

  const helperPct = stats
    ? Math.round((stats.helperProgress / stats.helperThreshold) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next); }}>
      <DialogContent className="border border-border dark:border-white/10 bg-[#09090b] rounded-2xl max-w-lg w-[calc(100%-2rem)] p-0 overflow-hidden shadow-2xl shadow-black/30 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border dark:border-white/8 text-left space-y-2">
          <DialogTitle className="flex items-center gap-2 text-foreground dark:text-white font-semibold text-base tracking-tight">
            <SkipForward className="h-4 w-4 text-zinc-300" />
            {t("skipSubmit.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-white/45 text-sm leading-relaxed">
            {t("skipSubmit.description", { title: animeTitle, episode })}{" "}
            <Link href={ROUTES.TIMESTAMPS} className="text-sky-300/90 hover:text-sky-200 underline-offset-2 hover:underline">
              {t("skipSubmit.browseDatabase")}
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 max-h-[min(60vh,480px)] overflow-y-auto">
          {!auth ? (
            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-white/[0.02] p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground dark:text-white/50">{t("skipSubmit.signIn")}</p>
              <LoginPopoverButton />
            </div>
          ) : (
            <>
              {stats && (
                <div className="rounded-xl border border-primary/20 bg-primary/8 p-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      {(() => {
                        const TierIcon =
                          (stats.tier?.icon && TIMESTAMP_TIER_ICONS[stats.tier.icon]) || Timer;
                        return <TierIcon className="h-3.5 w-3.5" style={{ color: stats.tier?.color }} />;
                      })()}
                      {stats.tier
                        ? t("skipSubmit.currentRank", { rank: stats.tier.name })
                        : stats.nextTier
                          ? t("skipSubmit.helperProgress", {
                              current: stats.approved,
                              total: stats.nextTier.minApproved,
                              role: stats.nextTier.name,
                            })
                          : t("skipSubmit.helperProgress", {
                              current: stats.helperProgress,
                              total: stats.helperThreshold,
                              role: TIMESTAMP_HELPER_DISPLAY,
                            })}
                    </p>
                    <span className="text-[10px] font-mono text-zinc-300/70 tabular-nums">
                      {stats.approved} {t("skipSubmit.approvedShort")}
                    </span>
                  </div>
                  {stats.nextTier && (
                    <>
                      <div className="h-1.5 rounded-full bg-black/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-white transition-all"
                          style={{ width: `${stats.tierProgressPct ?? helperPct}%` }}
                        />
                      </div>
                      <p className="text-[10px] font-mono text-white/45">
                        {t("skipSubmit.nextRank", {
                          rank: stats.nextTier.name,
                          remaining: Math.max(0, stats.nextTier.minApproved - stats.approved),
                        })}
                      </p>
                    </>
                  )}
                  {!stats.nextTier && stats.tier && (
                    <p className="text-[10px] font-mono text-amber-200/80">
                      {t("skipSubmit.maxRank")}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-white/40">
                    <span>{stats.pending} {t("skipSubmit.pendingShort")}</span>
                    <span>·</span>
                    <span>{stats.rejected} {t("skipSubmit.declinedShort")}</span>
                  </div>
                </div>
              )}

              {liveTimes && (
                <LiveTimesPanel
                  liveTimes={liveTimes}
                  onUseIntro={applyLiveIntro}
                  onUseOutro={applyLiveOutro}
                />
              )}

              {pendingStatus === "pending" && (
                <p className="text-xs font-mono text-amber-300/90 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2">
                  {t("skipSubmit.pending")}
                </p>
              )}
              {pendingStatus === "approved" && (
                <p className="text-xs font-mono text-emerald-300/90 bg-emerald-500/10 border border-emerald-400/20 rounded-lg px-3 py-2">
                  {t("skipSubmit.approved")}
                </p>
              )}
              {pendingStatus === "rejected" && (
                <p className="text-xs font-mono text-rose-300/90 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">
                  {t("skipSubmit.rejected")}
                </p>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-white/40">
                  {t("skipSubmit.intro")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TimeField
                    label={t("skipSubmit.start")}
                    value={introStart}
                    onChange={setIntroStart}
                    onUsePlayer={() => usePlayerTime(setIntroStart)}
                  />
                  <TimeField
                    label={t("skipSubmit.end")}
                    value={introEnd}
                    onChange={setIntroEnd}
                    onUsePlayer={() => usePlayerTime(setIntroEnd)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-white/40">
                  {t("skipSubmit.outro")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TimeField
                    label={t("skipSubmit.start")}
                    value={outroStart}
                    onChange={setOutroStart}
                    onUsePlayer={() => usePlayerTime(setOutroStart)}
                  />
                  <TimeField
                    label={t("skipSubmit.end")}
                    value={outroEnd}
                    onChange={setOutroEnd}
                    onUsePlayer={() => usePlayerTime(setOutroEnd)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/35">
                  {t("skipSubmit.notes")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder={t("skipSubmit.notesPlaceholder")}
                  className="w-full resize-none rounded-xl px-3 py-2 text-sm bg-muted/60 dark:bg-white/6 border border-border dark:border-white/10 text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {recent.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/35">
                    {t("skipSubmit.recentSubmissions")}
                  </p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto">
                    {recent.slice(0, 5).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between gap-2 text-[11px] rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5"
                      >
                        <span className="truncate text-white/65">
                          {(r.animeTitle ?? `#${r.anilistId}`)} · ep {r.episode}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 font-mono uppercase text-[10px]",
                            r.status === "approved" && "text-emerald-300",
                            r.status === "pending" && "text-amber-300",
                            r.status === "rejected" && "text-rose-300",
                          )}
                        >
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {leaderboard.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-white/6">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/35 flex items-center gap-1.5">
                    <Trophy className="h-3 w-3 text-amber-300/80" />
                    {t("skipSubmit.leaderboard")}
                  </p>
                  <div className="space-y-1">
                    {leaderboard.map((c, i) => {
                      const TierIcon =
                        (c.tier?.icon && TIMESTAMP_TIER_ICONS[c.tier.icon]) || null;
                      return (
                      <div key={c.username} className="flex items-center justify-between text-[11px] text-white/55 gap-2">
                        <span className="truncate min-w-0 flex items-center gap-1.5">
                          <span className="text-white/30 font-mono shrink-0">#{i + 1}</span>
                          {TierIcon && c.tier ? (
                            <TierIcon className="w-3 h-3 shrink-0" style={{ color: c.tier.color }} />
                          ) : null}
                          <Link href={`/profile/${c.username}`} className="hover:text-sky-300 transition-colors truncate">
                            {c.username}
                          </Link>
                          {c.tier?.name ? (
                            <span className="text-[9px] text-white/35 truncate hidden sm:inline">{c.tier.name}</span>
                          ) : null}
                        </span>
                        <span className="font-mono tabular-nums text-sky-300/80 shrink-0">{c.approved}</span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="px-5 py-4 gap-2 sm:gap-2 sm:justify-end border-t border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-border dark:border-white/10 text-muted-foreground dark:text-white/65 text-xs font-semibold hover:bg-muted/50 dark:bg-white/5 hover:text-foreground dark:hover:text-white/85 transition-colors disabled:opacity-40"
          >
            {t("comments.cancel")}
          </button>
          {auth && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || pendingStatus === "pending"}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold ring-1 transition-colors disabled:opacity-40",
                "bg-primary/15 text-zinc-200 ring-primary/25 hover:bg-primary/25",
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
