import { getDb } from "@/db";
import { collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  canViewCollection,
  getCollectionRole,
  loadCollection,
  loadCollectionItems,
  loadViewerState,
  uniqueSlugForOwner,
} from "@/lib/collections/collection-server";
import {
  canEditCollection,
  isCollectionCategory,
  isCollectionIcon,
  isCoverType,
  isVisibility,
} from "@/lib/collections/collection-shared";
import { eq } from "drizzle-orm";

/** GET /api/collections/[id] — full collection + items, access-checked. */
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

  const [items, viewer] = await Promise.all([
    loadCollectionItems(db, id),
    loadViewerState(db, [id], payload?.userId),
  ]);

  return Response.json({
    collection: {
      ...collection,
      liked: viewer.liked.has(id),
      following: viewer.following.has(id),
      myRole: role,
    },
    items,
  });
}

/** PATCH /api/collections/[id] — owner or editor only. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!canEditCollection(role)) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [existing] = await db
    .select({ ownerId: collections.ownerId, title: collections.title })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  const raw = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof raw.title === "string") {
    const title = raw.title.trim().slice(0, 120);
    if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
    patch.title = title;
    // Re-slug on rename so the URL keeps matching the title. The id still
    // resolves the collection, so old links don't break.
    if (title !== existing.title) {
      patch.slug = await uniqueSlugForOwner(db, existing.ownerId, title, id);
    }
  }
  if (typeof raw.description === "string") {
    patch.description = raw.description.trim().slice(0, 2000) || null;
  }
  if (isVisibility(raw.visibility)) patch.visibility = raw.visibility;
  if (raw.category === null || isCollectionCategory(raw.category)) patch.category = raw.category;
  if (isCoverType(raw.coverType)) patch.coverType = raw.coverType;
  if (typeof raw.coverValue === "string" || raw.coverValue === null) {
    patch.coverValue =
      typeof raw.coverValue === "string" ? raw.coverValue.trim().slice(0, 500) || null : null;
  }
  if (isCollectionIcon(raw.icon) || raw.icon === null) {
    patch.icon = isCollectionIcon(raw.icon) ? raw.icon : null;
  }
  if (Array.isArray(raw.tags)) {
    patch.tags = raw.tags
      .filter((t: unknown): t is string => typeof t === "string")
      .map((t: string) => t.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 10);
  }

  await db.update(collections).set(patch).where(eq(collections.id, id));
  const updated = await loadCollection(db, id);
  return Response.json({ collection: updated });
}

/** DELETE /api/collections/[id] — owner only; editors can't delete. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(collections).where(eq(collections.id, id));
  return Response.json({ ok: true });
}
