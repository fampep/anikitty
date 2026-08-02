import { getDb } from "@/db";
import { collections, collectionViews, collectionLikes, collectionFollows } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getCollectionRole } from "@/lib/collections/collection-server";
import { canEditCollection } from "@/lib/collections/collection-shared";
import { and, eq, gte, sql } from "drizzle-orm";

/**
 * GET /api/collections/[id]/stats — creator analytics. Owner/editor only.
 *
 * Deliberately omits the "top countries" and "traffic sources" breakdowns:
 * the app captures neither geo nor referrer data anywhere, so those numbers
 * would be invented rather than measured.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!canEditCollection(role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [collection] = await db
    .select({
      viewCount: collections.viewCount,
      likeCount: collections.likeCount,
      followerCount: collections.followerCount,
      shareCount: collections.shareCount,
      itemCount: collections.itemCount,
      createdAt: collections.createdAt,
    })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const since = new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10);

  const [uniqueRow, dailyRows, recentLikes, recentFollows] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${collectionViews.viewerKey})::int` })
      .from(collectionViews)
      .where(eq(collectionViews.collectionId, id)),
    db
      .select({
        day: collectionViews.day,
        count: sql<number>`count(*)::int`,
      })
      .from(collectionViews)
      .where(and(eq(collectionViews.collectionId, id), gte(collectionViews.day, since)))
      .groupBy(collectionViews.day)
      .orderBy(collectionViews.day),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionLikes)
      .where(
        and(
          eq(collectionLikes.collectionId, id),
          gte(collectionLikes.createdAt, new Date(Date.now() - 7 * 86_400_000)),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(collectionFollows)
      .where(
        and(
          eq(collectionFollows.collectionId, id),
          gte(collectionFollows.createdAt, new Date(Date.now() - 7 * 86_400_000)),
        ),
      ),
  ]);

  const uniqueVisitors = uniqueRow[0]?.count ?? 0;
  const views = collection.viewCount;

  return Response.json({
    stats: {
      views,
      uniqueVisitors,
      likes: collection.likeCount,
      followers: collection.followerCount,
      shares: collection.shareCount,
      items: collection.itemCount,
      likesLast7Days: recentLikes[0]?.count ?? 0,
      followersLast7Days: recentFollows[0]?.count ?? 0,
      // Share of viewers who cared enough to like or follow.
      engagementRate: uniqueVisitors > 0
        ? Math.round(((collection.likeCount + collection.followerCount) / uniqueVisitors) * 1000) / 10
        : 0,
      dailyViews: dailyRows.map((r) => ({ day: r.day, count: r.count })),
      createdAt:
        collection.createdAt instanceof Date
          ? collection.createdAt.toISOString()
          : collection.createdAt,
    },
  });
}
