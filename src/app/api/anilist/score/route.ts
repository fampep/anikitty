import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  getAniListMediaScore,
  updateAniListScore,
} from "@/lib/oauth/anilist-sync";

function parseMediaId(value: unknown): number | null {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseInt(value, 10)
        : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function requireAniListToken(userId: string) {
  const db = getDb();
  const [user] = await db
    .select({ anilistAccessToken: users.anilistAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user?.anilistAccessToken?.trim() || null;
}

/** GET /api/anilist/score?mediaId=123 — current AniList score for the linked user. */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mediaId = parseMediaId(new URL(req.url).searchParams.get("mediaId"));
  if (!mediaId) {
    return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
  }

  const accessToken = await requireAniListToken(payload.userId);
  if (!accessToken) {
    return NextResponse.json(
      { error: "AniList not connected", linked: false },
      { status: 400 },
    );
  }

  try {
    const entry = await getAniListMediaScore(accessToken, mediaId);
    return NextResponse.json({
      linked: true,
      mediaId,
      score: entry?.uiScore ?? null,
      status: entry?.status ?? null,
      scoreFormat: entry?.scoreFormat ?? "POINT_100",
    });
  } catch (e) {
    console.error("[anilist/score GET]", e);
    return NextResponse.json({ error: "Failed to load AniList score" }, { status: 502 });
  }
}

/**
 * POST /api/anilist/score
 * Body: { mediaId, score (1–10), status? }
 * Writes the rating to the user's AniList list entry.
 */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const mediaId = parseMediaId(body?.mediaId);
    const rawScore =
      typeof body?.score === "number"
        ? body.score
        : typeof body?.score === "string"
          ? parseFloat(body.score)
          : NaN;
    // 0.5–10 in half-point steps (e.g. 6.5) — never 1–100.
    const score = Math.round(rawScore * 2) / 2;

    if (!mediaId) {
      return NextResponse.json({ error: "mediaId is required" }, { status: 400 });
    }
    if (!Number.isFinite(score) || score < 0.5 || score > 10) {
      return NextResponse.json(
        { error: "score must be from 0.5 to 10 (e.g. 6.5)" },
        { status: 400 },
      );
    }

    const accessToken = await requireAniListToken(payload.userId);
    if (!accessToken) {
      return NextResponse.json(
        { error: "AniList not connected", linked: false },
        { status: 400 },
      );
    }

    const allowedStatus = new Set([
      "CURRENT",
      "COMPLETED",
      "PLANNING",
      "PAUSED",
      "DROPPED",
      "REPEATING",
    ]);
    const statusRaw =
      typeof body?.status === "string" ? body.status.toUpperCase() : null;
    const status =
      statusRaw && allowedStatus.has(statusRaw)
        ? (statusRaw as
            | "CURRENT"
            | "COMPLETED"
            | "PLANNING"
            | "PAUSED"
            | "DROPPED"
            | "REPEATING")
        : null;

    const result = await updateAniListScore(
      accessToken,
      mediaId,
      score,
      status,
    );

    return NextResponse.json({
      ok: true,
      linked: true,
      mediaId,
      score: result.uiScore,
      anilistScore: result.anilistScore,
    });
  } catch (e) {
    console.error("[anilist/score POST]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save AniList score" },
      { status: 502 },
    );
  }
}
