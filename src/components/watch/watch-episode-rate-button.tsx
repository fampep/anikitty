"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";

function scoreColor(score: number): string {
  if (score >= 9) return "#22d3ee";
  if (score >= 7) return "#34d399";
  if (score >= 5) return "#fbbf24";
  if (score >= 3) return "#fb923c";
  return "#f43f5e";
}

function normalizeScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.min(10, Math.max(0.5, score)) * 2) / 2;
}

function formatScore(score: number): string {
  const n = normalizeScore(score);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Site-only episode rating (0.5–10). Lives on the watch episode bar.
 */
export default function WatchEpisodeRateButton({
  animeId,
  episodeNumber,
}: {
  animeId: string;
  episodeNumber: number;
}) {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [draft, setDraft] = useState(0);
  const [average, setAverage] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!animeId || !(episodeNumber > 0)) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/anime/${encodeURIComponent(animeId)}/episodes/${episodeNumber}/rating`,
        withAuth(),
      );
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.mine === "number" && data.mine > 0) {
        const mine = normalizeScore(data.mine);
        setScore(mine);
        setDraft(mine);
      } else {
        setScore(0);
        setDraft(0);
      }
      setAverage(
        typeof data.average === "number" ? Math.round(data.average * 10) / 10 : null,
      );
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [animeId, episodeNumber]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open]);

  const formatAverage = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1);

  // Guests: read-only community average when available (no rate UI).
  if (!auth) {
    if (loading || average == null || count <= 0) return null;
    return (
      <div
        className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold border border-amber-500/35 bg-amber-500/10 text-amber-200"
        title={t("watch.episodeRateAvg", {
          avg: formatAverage(average),
          count,
        })}
      >
        <Star className="w-3 h-3" fill="currentColor" />
        <span className="tabular-nums">{formatAverage(average)}</span>
        <span className="text-[9px] opacity-60">({count})</span>
      </div>
    );
  }

  const shown = draft > 0 ? draft : score;

  const saveScore = async (nextRaw: number) => {
    const next = normalizeScore(nextRaw);
    if (saving || next < 0.5 || next > 10) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/anime/${encodeURIComponent(animeId)}/episodes/${episodeNumber}/rating`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: next }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed");
      const saved =
        typeof data.score === "number" ? normalizeScore(data.score) : next;
      setScore(saved);
      setDraft(saved);
      if (typeof data.average === "number") {
        setAverage(Math.round(data.average * 10) / 10);
      }
      if (typeof data.count === "number") setCount(data.count);
      setOpen(false);
      toast.success(
        t("watch.episodeRated", {
          score: formatScore(saved),
          n: episodeNumber,
        }),
      );
    } catch {
      toast.error(t("watch.episodeRateError"));
    } finally {
      setSaving(false);
    }
  };

  const clearScore = async () => {
    if (saving || score <= 0) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/anime/${encodeURIComponent(animeId)}/episodes/${episodeNumber}/rating`,
        withAuth({ method: "DELETE" }),
      );
      if (!res.ok) throw new Error();
      const data = await res.json().catch(() => ({}));
      setScore(0);
      setDraft(0);
      setAverage(
        typeof data.average === "number" ? Math.round(data.average * 10) / 10 : null,
      );
      setCount(typeof data.count === "number" ? data.count : 0);
      setOpen(false);
      toast.success(t("watch.episodeRateCleared"));
    } catch {
      toast.error(t("watch.episodeRateError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative inline-flex" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setDraft(score > 0 ? score : 7);
          setOpen((v) => !v);
        }}
        disabled={loading}
        title={t("watch.episodeRateTitle")}
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-semibold border transition-all disabled:opacity-50",
          score > 0
            ? "border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
            : "border-border dark:border-white/12 bg-muted/40 dark:bg-white/[0.04] text-muted-foreground dark:text-white/70 hover:bg-muted/60 dark:hover:bg-white/[0.08]",
        )}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Star
            className="w-3 h-3"
            fill={score > 0 ? "currentColor" : "none"}
          />
        )}
        <span className="tabular-nums">
          {score > 0
            ? formatScore(score)
            : average != null
              ? `~${formatScore(average)}`
              : t("watch.episodeRateShort")}
        </span>
        {count > 0 && score <= 0 ? (
          <span className="text-[9px] opacity-60">({count})</span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 bottom-[calc(100%+0.4rem)] z-40 w-[min(18.5rem,calc(100vw-2rem))] rounded-xl border border-white/12",
            "bg-zinc-950/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
              {t("watch.episodeRateHint", { n: episodeNumber })}
            </p>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: shown ? scoreColor(shown) : undefined }}
            >
              {shown ? `${formatScore(shown)}/10` : "—"}
            </span>
          </div>

          <div
            className="flex items-center gap-0.5"
            role="group"
            aria-label={t("watch.episodeRateTitle")}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
              const half = n - 0.5;
              const fillFull = shown >= n;
              const fillHalf = !fillFull && shown >= half;
              return (
                <div key={n} className="relative h-7 w-5 shrink-0">
                  <Star
                    className="pointer-events-none absolute inset-0 m-auto h-5 w-5 text-white/15"
                    fill="none"
                  />
                  {fillFull ? (
                    <Star
                      className="pointer-events-none absolute inset-0 m-auto h-5 w-5 text-amber-400"
                      fill="currentColor"
                    />
                  ) : null}
                  {fillHalf ? (
                    <Star
                      className="pointer-events-none absolute inset-0 m-auto h-5 w-5 text-amber-400"
                      fill="currentColor"
                      style={{ clipPath: "inset(0 50% 0 0)" }}
                    />
                  ) : null}
                  <button
                    type="button"
                    disabled={saving}
                    aria-label={`${formatScore(half)} / 10`}
                    className="absolute inset-y-0 left-0 w-1/2 disabled:opacity-50"
                    onMouseEnter={() => setDraft(half)}
                    onClick={() => {
                      setDraft(half);
                      void saveScore(half);
                    }}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    aria-label={`${formatScore(n)} / 10`}
                    className="absolute inset-y-0 right-0 w-1/2 disabled:opacity-50"
                    onMouseEnter={() => setDraft(n)}
                    onClick={() => {
                      setDraft(n);
                      void saveScore(n);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <label className="mt-3 block">
            <span className="sr-only">{t("watch.episodeRateHint", { n: episodeNumber })}</span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={shown || 7}
              disabled={saving}
              onChange={(e) =>
                setDraft(normalizeScore(parseFloat(e.target.value)))
              }
              onMouseUp={(e) =>
                void saveScore(normalizeScore(parseFloat(e.currentTarget.value)))
              }
              onTouchEnd={(e) =>
                void saveScore(normalizeScore(parseFloat(e.currentTarget.value)))
              }
              className="w-full accent-amber-400"
            />
          </label>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] text-white/35">
              {average != null
                ? t("watch.episodeRateAvg", {
                    avg: formatScore(average),
                    count,
                  })
                : t("watch.episodeRateDecimalHint")}
            </p>
            {score > 0 ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void clearScore()}
                className="text-[10px] font-semibold text-white/45 hover:text-white/80 disabled:opacity-50"
              >
                {t("watch.episodeRateClear")}
              </button>
            ) : null}
          </div>

          {saving ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("watch.episodeRateSaving")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
