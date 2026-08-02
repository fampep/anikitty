import { getDb } from "@/db";
import { collectionItems, collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getCollectionRole, syncItemCount } from "@/lib/collections/collection-server";
import {
  canAddItems,
  canEditCollection,
  MAX_COLLECTION_ITEMS,
} from "@/lib/collections/collection-shared";
import { notifyCollectionFollowers } from "@/lib/collections/collection-notify";
import { and, eq, sql } from "drizzle-orm";

/** POST /api/collections/[id]/items — add one anime. Contributors may add. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!canAddItems(role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));
  const animeId = typeof raw.animeId === "string" ? raw.animeId.trim() : "";
  if (!animeId) return Response.json({ error: "Missing animeId" }, { status: 400 });

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, id));
  if ((countRow?.count ?? 0) >= MAX_COLLECTION_ITEMS) {
    return Response.json(
      { error: `Collections are limited to ${MAX_COLLECTION_ITEMS} titles` },
      { status: 400 },
    );
  }

  // New items land at the end of the manual order.
  const [maxRow] = await db
    .select({ max: sql<number>`coalesce(max(position), -1)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, id));

  const inserted = await db
    .insert(collectionItems)
    .values({
      collectionId: id,
      animeId,
      anilistId: typeof raw.anilistId === "number" ? raw.anilistId : null,
      animeTitle: typeof raw.animeTitle === "string" ? raw.animeTitle.slice(0, 500) : null,
      animeThumbnail:
        typeof raw.animeThumbnail === "string" ? raw.animeThumbnail.slice(0, 1000) : null,
      note: typeof raw.note === "string" ? raw.note.trim().slice(0, 500) || null : null,
      position: (maxRow?.max ?? -1) + 1,
      addedBy: payload.userId,
    })
    .onConflictDoNothing()
    .returning({ id: collectionItems.id });

  // Already present — treat as success so double-clicks aren't errors.
  if (inserted.length === 0) return Response.json({ ok: true, duplicate: true });

  const count = await syncItemCount(db, id);
  void notifyCollectionFollowers(db, id, payload.userId, "added").catch(() => {});

  return Response.json({ ok: true, itemCount: count }, { status: 201 });
}

/** DELETE /api/collections/[id]/items?animeId=… */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!canAddItems(role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const animeId = url.searchParams.get("animeId");
  if (!animeId) return Response.json({ error: "Missing animeId" }, { status: 400 });

  // Contributors can pull their own additions but not other people's.
  const [row] = await db
    .select({ addedBy: collectionItems.addedBy })
    .from(collectionItems)
    .where(and(eq(collectionItems.collectionId, id), eq(collectionItems.animeId, animeId)))
    .limit(1);
  if (!row) return Response.json({ error: "Not in collection" }, { status: 404 });
  if (!canEditCollection(role) && row.addedBy !== payload.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .delete(collectionItems)
    .where(and(eq(collectionItems.collectionId, id), eq(collectionItems.animeId, animeId)));

  const count = await syncItemCount(db, id);
  return Response.json({ ok: true, itemCount: count });
}

/**
 * PATCH /api/collections/[id]/items — reorder, or edit a single item's note.
 * Body: { order: string[] } (item ids) or { itemId, note }.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!canEditCollection(role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));

  if (typeof raw.itemId === "string" && typeof raw.note === "string") {
    await db
      .update(collectionItems)
      .set({ note: raw.note.trim().slice(0, 500) || null })
      .where(and(eq(collectionItems.collectionId, id), eq(collectionItems.id, raw.itemId)));
    return Response.json({ ok: true });
  }

  if (Array.isArray(raw.order)) {
    const order = raw.order.filter((v: unknown): v is string => typeof v === "string");
    // Positions are written one row at a time; the list is capped at 500 so
    // the round-trip count stays bounded.
    for (let i = 0; i < order.length; i++) {
      await db
        .update(collectionItems)
        .set({ position: i })
        .where(and(eq(collectionItems.collectionId, id), eq(collectionItems.id, order[i])));
    }
    await db
      .update(collections)
      .set({ itemsUpdatedAt: new Date(), updatedAt: new Date() })
      .where(eq(collections.id, id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Nothing to update" }, { status: 400 });
}
