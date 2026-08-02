import { getDb } from "@/db";
import { collectionLikes, collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { canViewCollection, getCollectionRole } from "@/lib/collections/collection-server";
import { and, eq, sql } from "drizzle-orm";

/** POST toggles the like. Returns the authoritative count so UIs can't drift. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [collection] = await db
    .select({ visibility: collections.visibility })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload.userId);
  if (!canViewCollection(collection.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: collectionLikes.id })
    .from(collectionLikes)
    .where(and(eq(collectionLikes.collectionId, id), eq(collectionLikes.userId, payload.userId)))
    .limit(1);

  if (existing) {
    await db.delete(collectionLikes).where(eq(collectionLikes.id, existing.id));
  } else {
    await db
      .insert(collectionLikes)
      .values({ collectionId: id, userId: payload.userId })
      .onConflictDoNothing();
  }

  // Recount rather than increment so a double-submit can't skew the total.
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionLikes)
    .where(eq(collectionLikes.collectionId, id));
  const likeCount = countRow?.count ?? 0;

  await db.update(collections).set({ likeCount }).where(eq(collections.id, id));

  return Response.json({ liked: !existing, likeCount });
}
