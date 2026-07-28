"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import AnilistIcon from "@/icons/anilist";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { ROUTES } from "@/constants/routes";
import { useAuthStore } from "@/store/auth-store";
import { useT } from "@/providers/i18n-provider";
import { anisurgeAuth } from "@/lib/oauth/anisurge";

function scoreColor(score: number): string {
  if (score >= 9) return "#22d3ee";
  if (score >= 7) return "#34d399";
  if (score >= 5) return "#fbbf24";
  if (score >= 3) return "#fb923c";
  return "#f43f5e";
}

/** Snap to 0.5 steps between 0.5 and 10. */
function normalizeUiScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  const clamped = Math.min(10, Math.max(0.5, score));
  return Math.round(clamped * 2) / 2;
}

function formatUiScore(score: number): string {
  const n = normalizeUiScore(score);
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Rate an anime on AniList with 0.5–10 scores (e.g. 6.5), not 1–100.
 */
export default function AnilistRateButton({
  anilistId,
  localListStatus,
}: {
  anilistId?: number | null;
  localListStatus?: string | null;
}) {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const rootRef = useRef<HTMLDivElement>(null);
  const [linked, setLinked] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [draft, setDraft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const mediaId =
    typeof anilistId === "number" && anilistId > 0 ? anilistId : null;

  const loadLinkAndScore = useCallback(async () => {
    if (!auth || !mediaId) {
      setLinked(false);
      return;
    }
    setLoading(true);
    try {
      const me = await anisurgeAuth.me();
      const isLinked = !!me.anilistLinked;
      setLinked(isLinked);
      if (!isLinked) return;

      const res = await fetch(
        `/api/anilist/score?mediaId=${mediaId}`,
        withAuth(),
      );
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.score === "number" && data.score > 0) {
        const next = normalizeUiScore(data.score);
        setScore(next);
        setDraft(next);
      }
    } catch {
      setLinked(false);
    } finally {
      setLoading(false);
    }
  }, [auth, mediaId]);

  useEffect(() => {
    void loadLinkAndScore();
  }, [loadLinkAndScore]);

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

  if (!auth || !mediaId) return null;

  const shown = draft > 0 ? draft : score;

  const saveScore = async (nextRaw: number) => {
    const next = normalizeUiScore(nextRaw);
    if (saving || next < 0.5 || next > 10) return;
    setSaving(true);
    try {
      const status =
        localListStatus === "completed"
          ? "COMPLETED"
          : localListStatus === "watching" || localListStatus === "current"
            ? "CURRENT"
            : undefined;
      const res = await fetch(
        "/api/anilist/score",
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mediaId, score: next, status }),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.linked === false) {
          setLinked(false);
          toast.error(t("anime.anilistRateConnect"));
          return;
        }
        throw new Error(data?.error || "Failed");
      }
      const saved =
        typeof data.score === "number" ? normalizeUiScore(data.score) : next;
      setScore(saved);
      setDraft(saved);
      setOpen(false);
      toast.success(
        t("anime.anilistRated", { score: formatUiScore(saved) }),
      );
    } catch {
      toast.error(t("anime.anilistRateError"));
    } finally {
      setSaving(false);
    }
  };

  if (linked === false) {
    return (
      <Link
        href={ROUTES.SETTINGS}
        title={t("anime.anilistRateConnect")}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold border transition-all",
          "border-sky-500/25 bg-sky-500/10 text-sky-200/90 hover:bg-sky-500/15",
        )}
      >
        <AnilistIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t("anime.anilistRateConnectShort")}</span>
      </Link>
    );
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => {
          setDraft(score > 0 ? score : 7);
          setOpen((v) => !v);
        }}
        disabled={loading || linked == null}
        title={t("anime.anilistRateTitle")}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[12px] font-semibold border transition-all disabled:opacity-50",
          score > 0
            ? "border-amber-500/35 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
            : "border-white/15 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]",
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Star
            className="w-3.5 h-3.5"
            fill={score > 0 ? "currentColor" : "none"}
          />
        )}
        <span className="hidden sm:inline">
          {score > 0
            ? t("anime.anilistRatedLabel", { score: formatUiScore(score) })
            : t("anime.anilistRate")}
        </span>
        <span className="sm:hidden tabular-nums">
          {score > 0 ? `${formatUiScore(score)}/10` : t("anime.anilistRateShort")}
        </span>
      </button>

      {open ? (
        <div
          className={cn(
            "absolute left-0 top-[calc(100%+0.4rem)] z-40 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-white/12",
            "bg-zinc-950/95 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl",
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
              <AnilistIcon className="h-3 w-3" />
              {t("anime.anilistRateHint")}
            </p>
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: shown ? scoreColor(shown) : undefined }}
            >
              {shown ? `${formatUiScore(shown)}/10` : "—"}
            </span>
          </div>

          <div
            className="flex items-center gap-0.5"
            role="group"
            aria-label={t("anime.anilistRateTitle")}
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
                    aria-label={`${formatUiScore(half)} / 10`}
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
                    aria-label={`${formatUiScore(n)} / 10`}
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
            <span className="sr-only">{t("anime.anilistRateHint")}</span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={shown || 7}
              disabled={saving}
              onChange={(e) =>
                setDraft(normalizeUiScore(parseFloat(e.target.value)))
              }
              onMouseUp={(e) =>
                void saveScore(
                  normalizeUiScore(parseFloat(e.currentTarget.value)),
                )
              }
              onTouchEnd={(e) =>
                void saveScore(
                  normalizeUiScore(parseFloat(e.currentTarget.value)),
                )
              }
              className="w-full accent-amber-400"
            />
          </label>
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-white/30">
            <span>0.5</span>
            <span>5</span>
            <span>10</span>
          </div>

          {saving ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/45">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t("anime.anilistRateSaving")}
            </p>
          ) : (
            <p className="mt-2 text-[10px] text-white/35">
              {t("anime.anilistRateDecimalHint")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
