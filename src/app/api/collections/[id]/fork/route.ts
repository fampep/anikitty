import { getDb } from "@/db";
import { collectionItems, collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  canViewCollection,
  getCollectionRole,
  loadCollection,
  loadCollectionItems,
  uniqueSlugForOwner,
} from "@/lib/collections/collection-server";
import { MAX_COLLECTIONS_PER_USER } from "@/lib/collections/collection-shared";
import { eq, sql } from "drizzle-orm";

/**
 * POST /api/collections/[id]/fork — copy someone else's collection into your
 * own editable one. The copy starts private and records forkedFromId so the
 * original creator keeps credit on the collection page.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const source = await loadCollection(db, id);
  if (!source) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload.userId);
  if (!canViewCollection(source.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collections)
    .where(eq(collections.ownerId, payload.userId));
  if ((countRow?.count ?? 0) >= MAX_COLLECTIONS_PER_USER) {
    return Response.json(
      { error: `You've reached the limit of ${MAX_COLLECTIONS_PER_USER} collections` },
      { status: 400 },
    );
  }

  const title = `${source.title} (copy)`.slice(0, 120);
  const slug = await uniqueSlugForOwner(db, payload.userId, title);

  const [created] = await db
    .insert(collections)
    .values({
      ownerId: payload.userId,
      title,
      slug,
      description: source.description,
      visibility: "private",
      category: source.category,
      tags: source.tags,
      coverType: source.coverType,
      coverValue: source.coverValue,
      icon: source.icon,
      forkedFromId: source.id,
    })
    .returning({ id: collections.id, slug: collections.slug });

  const items = await loadCollectionItems(db, id);
  if (items.length > 0) {
    await db.insert(collectionItems).values(
      items.map((it, index) => ({
        collectionId: created.id,
        animeId: it.animeId,
        anilistId: it.anilistId,
        animeTitle: it.animeTitle,
        animeThumbnail: it.animeThumbnail,
        note: it.note,
        position: index,
        addedBy: payload.userId,
      })),
    );
    await db
      .update(collections)
      .set({ itemCount: items.length })
      .where(eq(collections.id, created.id));
  }

  return Response.json({ id: created.id, slug: created.slug }, { status: 201 });
}
