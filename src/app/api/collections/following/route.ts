import { getDb } from "@/db";
import { collectionFollows, collections, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  loadPreviewThumbnails,
  loadViewerState,
  rowToSummary,
  SUMMARY_SELECT,
} from "@/lib/collections/collection-server";
import { desc, eq } from "drizzle-orm";

/** GET /api/collections/following — collections the caller follows. */
export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select(SUMMARY_SELECT)
    .from(collectionFollows)
    .innerJoin(collections, eq(collections.id, collectionFollows.collectionId))
    .leftJoin(users, eq(users.id, collections.ownerId))
    .where(eq(collectionFollows.userId, payload.userId))
    .orderBy(desc(collections.itemsUpdatedAt))
    .limit(100);

  const list = rows.map(rowToSummary);
  const ids = list.map((c) => c.id);
  const [thumbs, viewer] = await Promise.all([
    loadPreviewThumbnails(db, ids),
    loadViewerState(db, ids, payload.userId),
  ]);

  return Response.json({
    collections: list.map((c) => ({
      ...c,
      previewThumbnails: thumbs[c.id] ?? [],
      liked: viewer.liked.has(c.id),
      following: true,
    })),
  });
}
