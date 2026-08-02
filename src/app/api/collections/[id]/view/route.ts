import { createHash } from "node:crypto";
import { getDb } from "@/db";
import { collections, collectionViews } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { canViewCollection, getCollectionRole } from "@/lib/collections/collection-server";
import { getClientIp } from "@/lib/security/rate-limit";
import { eq, sql } from "drizzle-orm";

/**
 * Anonymous viewers are keyed on a salted hash of IP + user agent so the raw
 * address is never stored. Signed-in viewers key on their user id instead, so
 * the count doesn't move when they change network.
 */
function viewerKeyFor(req: Request, userId: string | null): string {
  if (userId) return `u:${userId}`;
  const ip = getClientIp(req) || "unknown";
  const ua = req.headers.get("user-agent") ?? "";
  const salt = process.env.PROXY_SECRET ?? "anikitty";
  return `a:${createHash("sha256").update(`${salt}:${ip}:${ua}`).digest("hex").slice(0, 40)}`;
}

/**
 * POST /api/collections/[id]/view — records one view per viewer per day.
 * Repeat views in the same day are no-ops, so the counter can't be inflated
 * by refreshing.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  const db = getDb();

  const [collection] = await db
    .select({ visibility: collections.visibility, ownerId: collections.ownerId })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload?.userId);
  if (!canViewCollection(collection.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  // The creator browsing their own list isn't a view.
  if (payload?.userId && collection.ownerId === payload.userId) {
    return Response.json({ ok: true, counted: false });
  }

  const day = new Date().toISOString().slice(0, 10);
  const inserted = await db
    .insert(collectionViews)
    .values({
      collectionId: id,
      userId: payload?.userId ?? null,
      viewerKey: viewerKeyFor(req, payload?.userId ?? null),
      day,
    })
    .onConflictDoNothing()
    .returning({ id: collectionViews.id });

  if (inserted.length === 0) return Response.json({ ok: true, counted: false });

  await db
    .update(collections)
    .set({ viewCount: sql`${collections.viewCount} + 1` })
    .where(eq(collections.id, id));

  return Response.json({ ok: true, counted: true });
}
