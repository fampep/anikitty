import { getDb } from "@/db";
import { collectionItems, collections, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  loadPreviewThumbnails,
  loadViewerState,
  listEditableCollections,
  rowToSummary,
  SUMMARY_SELECT,
  uniqueSlugForOwner,
} from "@/lib/collections/collection-server";
import {
  isCollectionCategory,
  isCollectionIcon,
  isCoverType,
  isVisibility,
  MAX_COLLECTIONS_PER_USER,
  type CollectionSummary,
} from "@/lib/collections/collection-shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

/**
 * GET /api/collections
 *   ?mine=1        — every collection the caller can edit (owned + collaborating)
 *   ?userId=<id>   — a user's public collections (for profile pages)
 * Unlisted collections never appear in either listing; they resolve by link only.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  const db = getDb();

  if (url.searchParams.get("mine") === "1") {
    if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const list = await listEditableCollections(db, payload.userId);
    const ids = list.map((c) => c.id);
    const thumbs = await loadPreviewThumbnails(db, ids);

    // `contains` lets the add-to-collection menu resolve membership in one
    // round trip instead of fetching every collection's items.
    const contains = url.searchParams.get("contains");
    let memberOf: string[] = [];
    if (contains && ids.length > 0) {
      const rows = await db
        .select({ collectionId: collectionItems.collectionId })
        .from(collectionItems)
        .where(
          and(
            inArray(collectionItems.collectionId, ids),
            eq(collectionItems.animeId, contains),
          ),
        );
      memberOf = rows.map((r) => r.collectionId);
    }

    return Response.json({
      collections: list.map((c) => ({ ...c, previewThumbnails: thumbs[c.id] ?? [] })),
      memberOf,
    });
  }

  const userId = url.searchParams.get("userId");
  if (!userId) return Response.json({ error: "Missing userId" }, { status: 400 });

  const rows = await db
    .select(SUMMARY_SELECT)
    .from(collections)
    .leftJoin(users, eq(users.id, collections.ownerId))
    .where(and(eq(collections.ownerId, userId), eq(collections.visibility, "public")))
    .orderBy(desc(collections.likeCount), desc(collections.createdAt))
    .limit(60);

  const list = rows.map(rowToSummary);
  const ids = list.map((c) => c.id);
  const [thumbs, viewer] = await Promise.all([
    loadPreviewThumbnails(db, ids),
    loadViewerState(db, ids, payload?.userId),
  ]);

  return Response.json({
    collections: list.map((c) => ({
      ...c,
      previewThumbnails: thumbs[c.id] ?? [],
      liked: viewer.liked.has(c.id),
      following: viewer.following.has(c.id),
    })) satisfies CollectionSummary[],
  });
}

/** POST /api/collections — create. Defaults to private so nothing leaks by accident. */
export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.json().catch(() => ({}));
  const title = typeof raw.title === "string" ? raw.title.trim().slice(0, 120) : "";
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });

  const db = getDb();

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

  const description =
    typeof raw.description === "string" ? raw.description.trim().slice(0, 2000) || null : null;
  const visibility = isVisibility(raw.visibility) ? raw.visibility : "private";
  const category = isCollectionCategory(raw.category) ? raw.category : null;
  const coverType = isCoverType(raw.coverType) ? raw.coverType : "collage";
  const coverValue =
    typeof raw.coverValue === "string" ? raw.coverValue.trim().slice(0, 500) || null : null;
  const icon = isCollectionIcon(raw.icon) ? raw.icon : null;
  const tags = Array.isArray(raw.tags)
    ? raw.tags
        .filter((t: unknown): t is string => typeof t === "string")
        .map((t: string) => t.trim().slice(0, 30))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const slug = await uniqueSlugForOwner(db, payload.userId, title);

  const [created] = await db
    .insert(collections)
    .values({
      ownerId: payload.userId,
      title,
      slug,
      description,
      visibility,
      category,
      tags,
      coverType,
      coverValue,
      icon,
    })
    .returning({ id: collections.id, slug: collections.slug });

  return Response.json({ id: created.id, slug: created.slug }, { status: 201 });
}
