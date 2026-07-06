import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchlist } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { eq, and, sql } from "drizzle-orm";

/** Adjust the rewatch counter for a list entry. Body: { rewatchDelta } or { rewatchCount }. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ animeId: string }> },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId } = await params;
  const id = decodeURIComponent(animeId);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const db = getDb();
  const where = and(eq(watchlist.userId, payload.userId), eq(watchlist.animeId, id));

  let setExpr;
  if (typeof body.rewatchCount === "number") {
    setExpr = sql`least(greatest(${Math.round(body.rewatchCount)}, 0), 999)`;
  } else if (typeof body.rewatchDelta === "number") {
    const delta = Math.round(body.rewatchDelta);
    setExpr = sql`least(greatest(${watchlist.rewatchCount} + ${delta}, 0), 999)`;
  } else {
    return NextResponse.json({ error: "rewatchCount or rewatchDelta required" }, { status: 400 });
  }

  const [row] = await db
    .update(watchlist)
    .set({ rewatchCount: setExpr, updatedAt: new Date() })
    .where(where)
    .returning({ rewatchCount: watchlist.rewatchCount });

  if (!row) return NextResponse.json({ error: "Not in your list" }, { status: 404 });
  return NextResponse.json({ ok: true, rewatchCount: row.rewatchCount });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ animeId: string }> },
) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { animeId } = await params;
  const db = getDb();

  await db
    .delete(watchlist)
    .where(
      and(
        eq(watchlist.userId, payload.userId),
        eq(watchlist.animeId, decodeURIComponent(animeId)),
      ),
    );

  return NextResponse.json({ ok: true });
}
