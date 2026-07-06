import type { getDb } from "@/db";
import { animeReviews, reviewLikes, users } from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getUsersXpStats, levelRoleFields } from "@/lib/user/user-xp";

type Db = ReturnType<typeof getDb>;

export const REVIEW_MIN_SCORE = 1;
export const REVIEW_MAX_SCORE = 10;
export const REVIEW_MAX_BODY = 5000;

export type ReviewAggregate = {
  /** Mean of all user scores, 0–10, or null when there are no reviews. */
  average: number | null;
  /** Same score expressed on a 0–100 scale to sit beside external ratings. */
  score100: number | null;
  count: number;
  /** Counts per star value 1..10 (index 0 = score 1). */
  distribution: number[];
};

export type ReviewSort = "helpful" | "recent" | "highest" | "lowest";

export type PublicReview = {
  id: string;
  score: number;
  body: string;
  hasSpoiler: boolean;
  likeCount: number;
  likedByMe: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  user: {
    username: string;
    avatarUrl: string | null;
    role: string;
    level: number;
    levelRole: string;
    levelRoleColor: string;
    levelTierIcon: string;
  };
};

export function clampScore(n: unknown): number | null {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v) || v < REVIEW_MIN_SCORE || v > REVIEW_MAX_SCORE) return null;
  return v;
}

/** Aggregate score + rating distribution for a title. */
export async function getReviewAggregate(db: Db, animeId: string): Promise<ReviewAggregate> {
  const rows = await db
    .select({ score: animeReviews.score, count: sql<number>`count(*)::int` })
    .from(animeReviews)
    .where(eq(animeReviews.animeId, animeId))
    .groupBy(animeReviews.score);

  const distribution = Array<number>(REVIEW_MAX_SCORE).fill(0);
  let total = 0;
  let weighted = 0;
  for (const r of rows) {
    const idx = r.score - 1;
    if (idx >= 0 && idx < distribution.length) distribution[idx] = r.count;
    total += r.count;
    weighted += r.score * r.count;
  }

  if (total === 0) return { average: null, score100: null, count: 0, distribution };
  const average = weighted / total;
  return {
    average: Math.round(average * 10) / 10,
    score100: Math.round(average * 10),
    count: total,
    distribution,
  };
}

/** A single user's own review of a title (for pre-filling the editor). */
export async function getUserReview(db: Db, userId: string, animeId: string) {
  const [row] = await db
    .select()
    .from(animeReviews)
    .where(and(eq(animeReviews.userId, userId), eq(animeReviews.animeId, animeId)))
    .limit(1);
  return row ?? null;
}

const SORT_ORDER: Record<ReviewSort, ReturnType<typeof desc>[]> = {
  helpful: [desc(animeReviews.likeCount), desc(animeReviews.createdAt)],
  recent: [desc(animeReviews.createdAt)],
  highest: [desc(animeReviews.score), desc(animeReviews.likeCount)],
  lowest: [sql`${animeReviews.score} asc`, desc(animeReviews.likeCount)] as never,
};

/** List reviews for a title, enriched with author + level info and my-like flag. */
export async function listReviews(
  db: Db,
  animeId: string,
  opts: { sort?: ReviewSort; limit?: number; offset?: number; viewerId?: string | null } = {},
): Promise<PublicReview[]> {
  const sort = opts.sort ?? "helpful";
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);
  const offset = Math.max(opts.offset ?? 0, 0);

  const rows = await db
    .select({
      id: animeReviews.id,
      userId: animeReviews.userId,
      score: animeReviews.score,
      body: animeReviews.body,
      hasSpoiler: animeReviews.hasSpoiler,
      likeCount: animeReviews.likeCount,
      createdAt: animeReviews.createdAt,
      updatedAt: animeReviews.updatedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
      role: users.role,
    })
    .from(animeReviews)
    .innerJoin(users, eq(users.id, animeReviews.userId))
    .where(eq(animeReviews.animeId, animeId))
    .orderBy(...SORT_ORDER[sort])
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  const userIds = rows.map((r) => r.userId);
  const statsMap = await getUsersXpStats(db, userIds);

  // Which of these reviews the viewer has already found helpful.
  let likedIds = new Set<string>();
  if (opts.viewerId) {
    const reviewIds = rows.map((r) => r.id);
    const likes = await db
      .select({ reviewId: reviewLikes.reviewId })
      .from(reviewLikes)
      .where(and(eq(reviewLikes.userId, opts.viewerId), inArray(reviewLikes.reviewId, reviewIds)));
    likedIds = new Set(likes.map((l) => l.reviewId));
  }

  return rows.map((r) => {
    const stats = statsMap.get(r.userId);
    const level = stats
      ? levelRoleFields(stats)
      : { level: 1, levelRole: "Newcomer", levelRoleColor: "#94a3b8", levelTierIcon: "Eye" };
    return {
      id: r.id,
      score: r.score,
      body: r.body,
      hasSpoiler: r.hasSpoiler,
      likeCount: r.likeCount,
      likedByMe: likedIds.has(r.id),
      createdAt: r.createdAt?.toISOString() ?? null,
      updatedAt: r.updatedAt?.toISOString() ?? null,
      user: {
        username: r.username,
        avatarUrl: r.avatarUrl,
        role: r.role,
        ...level,
      },
    };
  });
}

/** Create or replace the viewer's review of a title. Returns the review id. */
export async function upsertReview(
  db: Db,
  userId: string,
  animeId: string,
  data: {
    score: number;
    body?: string;
    hasSpoiler?: boolean;
    animeTitle?: string | null;
    animeThumbnail?: string | null;
    anilistId?: number | null;
  },
): Promise<{ id: string; created: boolean }> {
  const existing = await getUserReview(db, userId, animeId);
  const body = (data.body ?? "").slice(0, REVIEW_MAX_BODY);

  const [row] = await db
    .insert(animeReviews)
    .values({
      userId,
      animeId,
      score: data.score,
      body,
      hasSpoiler: data.hasSpoiler ?? false,
      animeTitle: data.animeTitle ?? null,
      animeThumbnail: data.animeThumbnail ?? null,
      anilistId: data.anilistId ?? null,
    })
    .onConflictDoUpdate({
      target: [animeReviews.userId, animeReviews.animeId],
      set: {
        score: data.score,
        body,
        hasSpoiler: data.hasSpoiler ?? false,
        ...(data.animeTitle ? { animeTitle: data.animeTitle } : {}),
        ...(data.animeThumbnail ? { animeThumbnail: data.animeThumbnail } : {}),
        ...(data.anilistId ? { anilistId: data.anilistId } : {}),
        updatedAt: new Date(),
      },
    })
    .returning({ id: animeReviews.id });

  return { id: row.id, created: !existing };
}

export async function deleteReview(db: Db, userId: string, animeId: string): Promise<boolean> {
  const res = await db
    .delete(animeReviews)
    .where(and(eq(animeReviews.userId, userId), eq(animeReviews.animeId, animeId)))
    .returning({ id: animeReviews.id });
  return res.length > 0;
}

/** Toggle a "helpful" like; keeps the denormalized like_count in sync. */
export async function toggleReviewLike(
  db: Db,
  userId: string,
  reviewId: string,
): Promise<{ liked: boolean; likeCount: number } | null> {
  const [review] = await db
    .select({ id: animeReviews.id, ownerId: animeReviews.userId })
    .from(animeReviews)
    .where(eq(animeReviews.id, reviewId))
    .limit(1);
  if (!review) return null;
  if (review.ownerId === userId) return null; // can't like your own review

  const [existing] = await db
    .select({ id: reviewLikes.id })
    .from(reviewLikes)
    .where(and(eq(reviewLikes.reviewId, reviewId), eq(reviewLikes.userId, userId)))
    .limit(1);

  let liked: boolean;
  if (existing) {
    await db.delete(reviewLikes).where(eq(reviewLikes.id, existing.id));
    await db
      .update(animeReviews)
      .set({ likeCount: sql`greatest(${animeReviews.likeCount} - 1, 0)` })
      .where(eq(animeReviews.id, reviewId));
    liked = false;
  } else {
    await db.insert(reviewLikes).values({ reviewId, userId }).onConflictDoNothing();
    await db
      .update(animeReviews)
      .set({ likeCount: sql`${animeReviews.likeCount} + 1` })
      .where(eq(animeReviews.id, reviewId));
    liked = true;
  }

  const [row] = await db
    .select({ likeCount: animeReviews.likeCount })
    .from(animeReviews)
    .where(eq(animeReviews.id, reviewId))
    .limit(1);
  return { liked, likeCount: row?.likeCount ?? 0 };
}
