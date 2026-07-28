import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import {
  getUserModerationStatus,
  interactionBlockMessage,
} from "@/lib/security/moderation";
import {
  clampEpisodeScore,
  deleteEpisodeRating,
  formatEpisodeScore,
  getEpisodeRatingAggregate,
  getUserEpisodeRating,
  upsertEpisodeRating,
} from "@/lib/reviews/episode-ratings";

function parseEpisodeNumber(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * GET /api/anime/[id]/episodes/[ep]/rating
 * Public aggregate + optional `mine` when authenticated.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; ep: string }> },
) {
  const { id, ep } = await params;
  const episodeNumber = parseEpisodeNumber(ep);
  if (!episodeNumber) {
    return NextResponse.json({ error: "Invalid episode number" }, { status: 400 });
  }

  try {
    const db = getDb();
    const viewer = await requireUser(req).catch(() => null);
    const [aggregate, mine] = await Promise.all([
      getEpisodeRatingAggregate(db, id, episodeNumber),
      viewer
        ? getUserEpisodeRating(db, viewer.id, id, episodeNumber)
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      animeId: id,
      episodeNumber,
      average: aggregate.average,
      count: aggregate.count,
      mine,
    });
  } catch (e) {
    console.error("[episode-rating GET]", e);
    return NextResponse.json({
      animeId: id,
      episodeNumber,
      average: null,
      count: 0,
      mine: null,
    });
  }
}

/**
 * POST /api/anime/[id]/episodes/[ep]/rating
 * Body: { score: 0.5–10 }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; ep: string }> },
) {
  const { id, ep } = await params;
  const episodeNumber = parseEpisodeNumber(ep);
  if (!episodeNumber) {
    return NextResponse.json({ error: "Invalid episode number" }, { status: 400 });
  }

  const user = await requireUser(req);
  if (!user) return unauthorized();

  const db = getDb();
  const status = await getUserModerationStatus(db, user.id);
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

  const score = clampEpisodeScore(body.score);
  if (score == null) {
    return NextResponse.json(
      { error: "Score must be from 0.5 to 10 (e.g. 6.5)" },
      { status: 400 },
    );
  }

  try {
    const { created } = await upsertEpisodeRating(
      db,
      user.id,
      id,
      episodeNumber,
      score,
    );
    const aggregate = await getEpisodeRatingAggregate(db, id, episodeNumber);
    return NextResponse.json({
      ok: true,
      created,
      score,
      scoreLabel: formatEpisodeScore(score),
      average: aggregate.average,
      count: aggregate.count,
    });
  } catch (e) {
    console.error("[episode-rating POST]", e);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}

/** DELETE — clear your rating for this episode. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; ep: string }> },
) {
  const { id, ep } = await params;
  const episodeNumber = parseEpisodeNumber(ep);
  if (!episodeNumber) {
    return NextResponse.json({ error: "Invalid episode number" }, { status: 400 });
  }

  const user = await requireUser(req);
  if (!user) return unauthorized();

  try {
    const db = getDb();
    const removed = await deleteEpisodeRating(db, user.id, id, episodeNumber);
    const aggregate = await getEpisodeRatingAggregate(db, id, episodeNumber);
    return NextResponse.json({
      ok: true,
      removed,
      average: aggregate.average,
      count: aggregate.count,
      mine: null,
    });
  } catch (e) {
    console.error("[episode-rating DELETE]", e);
    return NextResponse.json({ error: "Failed to clear rating" }, { status: 500 });
  }
}
