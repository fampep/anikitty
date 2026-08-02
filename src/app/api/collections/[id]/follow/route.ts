import { getDb } from "@/db";
import { collectionFollows, collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { canViewCollection, getCollectionRole } from "@/lib/collections/collection-server";
import { maybeNotifyFollowerMilestone } from "@/lib/collections/collection-notify";
import { and, eq, sql } from "drizzle-orm";

/** POST toggles the follow. Following a private collection isn't possible. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const [collection] = await db
    .select({ visibility: collections.visibility, ownerId: collections.ownerId })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload.userId);
  if (!canViewCollection(collection.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  if (collection.visibility === "private") {
    return Response.json({ error: "This collection isn't shared" }, { status: 400 });
  }
  if (collection.ownerId === payload.userId) {
    return Response.json({ error: "You can't follow your own collection" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: collectionFollows.id })
    .from(collectionFollows)
    .where(and(eq(collectionFollows.collectionId, id), eq(collectionFollows.userId, payload.userId)))
    .limit(1);

  if (existing) {
    await db.delete(collectionFollows).where(eq(collectionFollows.id, existing.id));
  } else {
    await db
      .insert(collectionFollows)
      .values({ collectionId: id, userId: payload.userId })
      .onConflictDoNothing();
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionFollows)
    .where(eq(collectionFollows.collectionId, id));
  const followerCount = countRow?.count ?? 0;

  await db.update(collections).set({ followerCount }).where(eq(collections.id, id));

  if (!existing) {
    void maybeNotifyFollowerMilestone(db, id, followerCount).catch(() => {});
  }

  return Response.json({ following: !existing, followerCount });
}
