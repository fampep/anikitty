"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Star, ThumbsUp, Loader2, Trash2, Pencil, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth-store";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import FramedAvatar from "@/components/common/framed-avatar";
import { UserBadges } from "@/components/profile/user-badges";

type Aggregate = {
  average: number | null;
  score100: number | null;
  count: number;
  distribution: number[];
};

type ReviewUser = {
  username: string;
  avatarUrl: string | null;
  role: string;
  level: number;
  levelRole: string;
  levelRoleColor: string;
  levelTierIcon: string;
};

type Review = {
  id: string;
  score: number;
  body: string;
  hasSpoiler: boolean;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  user: ReviewUser;
};

type Mine = { score: number; body: string; hasSpoiler: boolean } | null;

type SortKey = "helpful" | "recent" | "highest" | "lowest";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function scoreColor(score: number): string {
  if (score >= 9) return "#22d3ee";
  if (score >= 7) return "#34d399";
  if (score >= 5) return "#fbbf24";
  if (score >= 3) return "#fb923c";
  return "#f43f5e";
}

/** Interactive 1–10 star row. */
function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5 transition-transform hover:scale-110"
          aria-label={`${n} / 10`}
        >
          <Star
            className={cn("w-5 h-5 transition-colors", n <= shown ? "text-amber-400" : "text-white/15")}
            fill={n <= shown ? "currentColor" : "none"}
          />
        </button>
      ))}
      <span className="ml-2 text-sm font-bold tabular-nums" style={{ color: shown ? scoreColor(shown) : undefined }}>
        {shown ? `${shown}/10` : ""}
      </span>
    </div>
  );
}

function SpoilerBody({ body }: { body: string }) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{body}</p>;
  }
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      className="flex items-center gap-2 w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-left text-[13px] font-medium text-amber-300/90 hover:bg-amber-500/15 transition-colors"
    >
      <EyeOff className="w-4 h-4 shrink-0" />
      Spoiler review — tap to reveal
    </button>
  );
}

export default function AnimeReviews({
  animeId,
  animeTitle,
  poster,
  anilistId,
}: {
  animeId: string;
  animeTitle?: string;
  poster?: string;
  anilistId?: number | null;
}) {
  useT();
  const auth = useAuthStore((s) => s.auth);

  const [aggregate, setAggregate] = useState<Aggregate>({
    average: null,
    score100: null,
    count: 0,
    distribution: Array(10).fill(0),
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mine, setMine] = useState<Mine>(null);
  const [sort, setSort] = useState<SortKey>("helpful");
  const [loading, setLoading] = useState(true);

  // Editor state
  const [editing, setEditing] = useState(false);
  const [draftScore, setDraftScore] = useState(0);
  const [draftBody, setDraftBody] = useState("");
  const [draftSpoiler, setDraftSpoiler] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/anime/${animeId}/reviews?sort=${sort}`, withAuth());
      const data = res.ok ? await res.json() : null;
      if (data?.aggregate) {
        setAggregate({
          average: data.aggregate.average ?? null,
          score100: data.aggregate.score100 ?? null,
          count: data.aggregate.count ?? 0,
          distribution: Array.isArray(data.aggregate.distribution)
            ? data.aggregate.distribution
            : Array(10).fill(0),
        });
      }
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      setMine(data?.mine ?? null);
    } catch {
      /* keep prior/default state */
    } finally {
      setLoading(false);
    }
  }, [animeId, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const openEditor = () => {
    setDraftScore(mine?.score ?? 0);
    setDraftBody(mine?.body ?? "");
    setDraftSpoiler(mine?.hasSpoiler ?? false);
    setEditing(true);
  };

  const submit = async () => {
    if (draftScore < 1) {
      toast.error("Pick a score first");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/anime/${animeId}/reviews`,
        withAuth({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: draftScore,
            body: draftBody.trim(),
            hasSpoiler: draftSpoiler,
            animeTitle,
            animeThumbnail: poster,
            anilistId: anilistId ?? undefined,
          }),
        }),
      );
      if (!res.ok) throw new Error();
      toast.success(mine ? "Review updated" : "Review posted (+10 Kittycoins)");
      setEditing(false);
      await load();
    } catch {
      toast.error("Couldn't save your review");
    } finally {
      setSaving(false);
    }
  };

  const removeMine = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/anime/${animeId}/reviews`, withAuth({ method: "DELETE" }));
      if (!res.ok) throw new Error();
      toast.success("Review removed");
      setEditing(false);
      await load();
    } catch {
      toast.error("Couldn't remove your review");
    } finally {
      setSaving(false);
    }
  };

  const toggleLike = async (r: Review) => {
    if (!auth) {
      toast.error("Sign in to vote");
      return;
    }
    // Optimistic
    setReviews((list) =>
      list.map((x) =>
        x.id === r.id
          ? { ...x, likedByMe: !x.likedByMe, likeCount: x.likeCount + (x.likedByMe ? -1 : 1) }
          : x,
      ),
    );
    try {
      const res = await fetch(
        `/api/anime/${animeId}/reviews/${r.id}/like`,
        withAuth({ method: "POST" }),
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviews((list) =>
        list.map((x) => (x.id === r.id ? { ...x, likedByMe: data.liked, likeCount: data.likeCount } : x)),
      );
    } catch {
      await load(); // revert to server truth
    }
  };

  const maxBar = useMemo(() => Math.max(1, ...aggregate.distribution), [aggregate.distribution]);

  return (
    <div className="space-y-6">
      {/* Aggregate header */}
      <div className="flex flex-col sm:flex-row gap-6 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
        <div className="flex flex-col items-center justify-center sm:border-r sm:border-white/8 sm:pr-6 shrink-0">
          <div className="text-5xl font-black tabular-nums leading-none" style={{ color: aggregate.average ? scoreColor(aggregate.average) : "#ffffff" }}>
            {aggregate.average != null ? aggregate.average.toFixed(1) : "—"}
          </div>
          <div className="mt-1 text-[11px] font-mono uppercase tracking-wider text-white/35">AniKitty Score</div>
          <div className="mt-2 flex items-center gap-1 text-amber-400">
            <Star className="w-3.5 h-3.5" fill="currentColor" />
            <span className="text-xs font-semibold text-white/50">
              {aggregate.count} {aggregate.count === 1 ? "rating" : "ratings"}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((star) => {
            const c = aggregate.distribution[star - 1] ?? 0;
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="w-6 text-right text-[11px] font-mono text-white/30">{star}</span>
                <Star className="w-3 h-3 text-amber-400/60 shrink-0" fill="currentColor" />
                <div className="h-2 flex-1 rounded-full bg-white/6 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500/70 to-amber-400"
                    style={{ width: `${(c / maxBar) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-[11px] font-mono text-white/30 tabular-nums">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Your review */}
      {auth && (
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          {!editing ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {mine ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white/45">Your rating:</span>
                    <span className="inline-flex items-center gap-1 font-bold" style={{ color: scoreColor(mine.score) }}>
                      <Star className="w-4 h-4" fill="currentColor" /> {mine.score}/10
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-white/50">You haven&apos;t rated this yet.</span>
                )}
              </div>
              <button
                type="button"
                onClick={openEditor}
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                {mine ? "Edit review" : "Rate & review"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <StarInput value={draftScore} onChange={setDraftScore} />
              <textarea
                value={draftBody}
                onChange={(e) => setDraftBody(e.target.value)}
                placeholder="Share your thoughts (optional)…"
                rows={4}
                maxLength={5000}
                className="w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white/85 placeholder:text-white/25 outline-none focus:border-violet-500/50"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-[13px] text-white/50 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={draftSpoiler}
                    onChange={(e) => setDraftSpoiler(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Contains spoilers
                </label>
                <div className="flex items-center gap-2">
                  {mine && (
                    <button
                      type="button"
                      onClick={removeMine}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/25 px-3 py-2 text-sm font-medium text-red-400/80 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-white/50 hover:text-white/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {mine ? "Update" : "Post"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sort + list */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">
          {aggregate.count > 0 ? `${aggregate.count} ${aggregate.count === 1 ? "review" : "reviews"}` : "Reviews"}
        </h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1.5 text-[13px] text-white/70 outline-none focus:border-violet-500/50"
        >
          <option value="helpful">Most helpful</option>
          <option value="recent">Newest</option>
          <option value="highest">Highest rated</option>
          <option value="lowest">Lowest rated</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-white/8 bg-white/[0.03]" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] py-10 text-center text-sm text-white/35">
          No written reviews yet. Be the first to review {animeTitle ?? "this anime"}.
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
              <div className="flex items-start gap-3">
                <Link href={`/profile/${r.user.username}`} className="shrink-0">
                  <FramedAvatar username={r.user.username} url={r.user.avatarUrl ?? undefined} className="w-9 h-9" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/profile/${r.user.username}`}
                      className="text-sm font-semibold text-white/85 hover:text-white truncate"
                    >
                      {r.user.username}
                    </Link>
                    <UserBadges
                      role={r.user.role}
                      level={r.user.level}
                      levelRole={r.user.levelRole}
                      levelRoleColor={r.user.levelRoleColor}
                      levelTierIcon={r.user.levelTierIcon}
                    />
                    <span className="text-[11px] text-white/25">{relativeTime(r.updatedAt ?? r.createdAt)}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1 text-sm font-bold" style={{ color: scoreColor(r.score) }}>
                    <Star className="w-4 h-4" fill="currentColor" />
                    {r.score}/10
                  </div>

                  {r.body && (
                    <div className="mt-2">
                      {r.hasSpoiler ? <SpoilerBody body={r.body} /> : (
                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{r.body}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleLike(r)}
                    className={cn(
                      "mt-2.5 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-medium transition-colors",
                      r.likedByMe
                        ? "border-violet-500/40 bg-violet-500/15 text-violet-300"
                        : "border-white/10 text-white/45 hover:text-white/70 hover:border-white/20",
                    )}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" fill={r.likedByMe ? "currentColor" : "none"} />
                    Helpful{r.likeCount > 0 ? ` · ${r.likeCount}` : ""}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
