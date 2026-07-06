import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { getUserModerationStatus, interactionBlockMessage } from "@/lib/security/moderation";
import { grantKittycoins } from "@/lib/shop/kittycoins";
import {
  clampScore,
  deleteReview,
  getReviewAggregate,
  getUserReview,
  listReviews,
  REVIEW_MAX_BODY,
  upsertReview,
  type ReviewSort,
} from "@/lib/reviews/reviews";

const VALID_SORTS: ReviewSort[] = ["helpful", "recent", "highest", "lowest"];

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const sortParam = searchParams.get("sort") as ReviewSort | null;
  const sort = sortParam && VALID_SORTS.includes(sortParam) ? sortParam : "helpful";
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const emptyAggregate = {
    average: null,
    score100: null,
    count: 0,
    distribution: Array<number>(10).fill(0),
  };

  try {
    const db = getDb();
    const viewer = await requireUser(req).catch(() => null);

    const [aggregate, reviews, mine] = await Promise.all([
      getReviewAggregate(db, id),
      listReviews(db, id, { sort, limit, offset, viewerId: viewer?.id ?? null }),
      viewer ? getUserReview(db, viewer.id, id) : Promise.resolve(null),
    ]);

    return NextResponse.json({
      aggregate,
      reviews,
      mine: mine
        ? {
            score: mine.score,
            body: mine.body,
            hasSpoiler: mine.hasSpoiler,
          }
        : null,
    });
  } catch (e) {
    console.error("[reviews GET]", e);
    // Degrade gracefully (e.g. before the tables are migrated) instead of 500.
    return NextResponse.json({ aggregate: emptyAggregate, reviews: [], mine: null });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const db0 = getDb();
  const status = await getUserModerationStatus(db0, user.id);
  const blocked = status && interactionBlockMessage(status);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const score = clampScore(body.score);
  if (score === null) {
    return NextResponse.json({ error: "Score must be a whole number from 1 to 10." }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim().slice(0, REVIEW_MAX_BODY) : "";

  const db = db0;
  const { id: reviewId, created } = await upsertReview(db, user.id, id, {
    score,
    body: text,
    hasSpoiler: !!body.hasSpoiler,
    animeTitle: typeof body.animeTitle === "string" ? body.animeTitle : null,
    animeThumbnail: typeof body.animeThumbnail === "string" ? body.animeThumbnail : null,
    anilistId: typeof body.anilistId === "number" ? body.anilistId : parseInt(id, 10) || null,
  });

  // One-time Kittycoin reward for reviewing a title (idempotent per anime).
  if (created) {
    void grantKittycoins(db, user.id, 10, "review", id);
  }

  const aggregate = await getReviewAggregate(db, id);
  return NextResponse.json({ ok: true, reviewId, created, aggregate });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const db = getDb();
  const removed = await deleteReview(db, user.id, id);
  const aggregate = await getReviewAggregate(db, id);
  return NextResponse.json({ ok: removed, aggregate });
}
