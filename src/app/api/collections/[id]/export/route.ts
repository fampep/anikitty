import { getDb } from "@/db";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  canViewCollection,
  getCollectionRole,
  loadCollection,
  loadCollectionItems,
} from "@/lib/collections/collection-server";
import { collectionPath } from "@/lib/collections/collection-shared";
import { APP_URL } from "@/lib/seo/site-seo";

/** GET /api/collections/[id]/export — portable JSON of the list. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  const db = getDb();

  const collection = await loadCollection(db, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload?.userId);
  if (!canViewCollection(collection.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const items = await loadCollectionItems(db, id);

  const doc = {
    format: "anikitty.collection",
    version: 1,
    exportedAt: new Date().toISOString(),
    collection: {
      title: collection.title,
      description: collection.description,
      category: collection.category,
      tags: collection.tags,
      creator: collection.ownerUsername,
      source: `${APP_URL}${collectionPath(collection.id, collection.slug)}`,
    },
    items: items.map((i) => ({
      animeId: i.animeId,
      anilistId: i.anilistId,
      title: i.animeTitle,
      note: i.note,
      position: i.position,
    })),
  };

  const filename = `${collection.slug || "collection"}.json`;
  return new Response(JSON.stringify(doc, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
