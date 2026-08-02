import "server-only";
import { getDb } from "@/db";
import {
  collections,
  collectionCollaborators,
  collectionFollows,
  collectionItems,
  collectionLikes,
  users,
} from "@/db/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  type CollectionRole,
  type CollectionSummary,
  type CollectionVisibility,
  slugifyCollectionTitle,
} from "./collection-shared";

type Db = ReturnType<typeof getDb>;

const SUMMARY_SELECT = {
  id: collections.id,
  slug: collections.slug,
  title: collections.title,
  description: collections.description,
  visibility: collections.visibility,
  category: collections.category,
  tags: collections.tags,
  coverType: collections.coverType,
  coverValue: collections.coverValue,
  icon: collections.icon,
  isFeatured: collections.isFeatured,
  featuredLabel: collections.featuredLabel,
  forkedFromId: collections.forkedFromId,
  itemCount: collections.itemCount,
  likeCount: collections.likeCount,
  followerCount: collections.followerCount,
  viewCount: collections.viewCount,
  shareCount: collections.shareCount,
  createdAt: collections.createdAt,
  updatedAt: collections.updatedAt,
  itemsUpdatedAt: collections.itemsUpdatedAt,
  ownerId: collections.ownerId,
  ownerUsername: users.username,
  ownerAvatar: users.avatarUrl,
} as const;

export { SUMMARY_SELECT };

type SummaryRow = {
  [K in keyof typeof SUMMARY_SELECT]: unknown;
};

export function rowToSummary(row: SummaryRow): CollectionSummary {
  const r = row as Record<string, unknown>;
  const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null) ?? null);
  return {
    id: String(r.id),
    slug: String(r.slug),
    title: String(r.title),
    description: (r.description as string | null) ?? null,
    visibility: r.visibility as CollectionVisibility,
    category: (r.category as string | null) ?? null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    coverType: (r.coverType as CollectionSummary["coverType"]) ?? "collage",
    coverValue: (r.coverValue as string | null) ?? null,
    icon: (r.icon as string | null) ?? null,
    isFeatured: !!r.isFeatured,
    featuredLabel: (r.featuredLabel as string | null) ?? null,
    forkedFromId: (r.forkedFromId as string | null) ?? null,
    itemCount: Number(r.itemCount ?? 0),
    likeCount: Number(r.likeCount ?? 0),
    followerCount: Number(r.followerCount ?? 0),
    viewCount: Number(r.viewCount ?? 0),
    shareCount: Number(r.shareCount ?? 0),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
    itemsUpdatedAt: iso(r.itemsUpdatedAt),
    ownerId: String(r.ownerId),
    ownerUsername: (r.ownerUsername as string | null) ?? null,
    ownerAvatar: (r.ownerAvatar as string | null) ?? null,
  };
}

/**
 * The viewer's role on a collection, or null if they have none. Owner wins
 * over any collaborator row so a stale invite can't downgrade the owner.
 */
export async function getCollectionRole(
  db: Db,
  collectionId: string,
  userId: string | null | undefined,
): Promise<CollectionRole | null> {
  if (!userId) return null;
  const [owned] = await db
    .select({ ownerId: collections.ownerId })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!owned) return null;
  if (owned.ownerId === userId) return "owner";

  const [collab] = await db
    .select({ role: collectionCollaborators.role })
    .from(collectionCollaborators)
    .where(
      and(
        eq(collectionCollaborators.collectionId, collectionId),
        eq(collectionCollaborators.userId, userId),
      ),
    )
    .limit(1);
  const role = collab?.role;
  return role === "editor" || role === "contributor" ? role : null;
}

/**
 * Private collections are readable only by the owner and collaborators.
 * Unlisted are readable by anyone holding the link — the id is the secret —
 * but are kept out of every listing query.
 */
export function canViewCollection(
  visibility: string,
  role: CollectionRole | null,
): boolean {
  if (visibility === "public" || visibility === "unlisted") return true;
  return role !== null;
}

export async function loadCollection(
  db: Db,
  collectionId: string,
): Promise<CollectionSummary | null> {
  const [row] = await db
    .select(SUMMARY_SELECT)
    .from(collections)
    .leftJoin(users, eq(users.id, collections.ownerId))
    .where(eq(collections.id, collectionId))
    .limit(1);
  return row ? rowToSummary(row) : null;
}

export async function loadCollectionItems(db: Db, collectionId: string) {
  const rows = await db
    .select({
      id: collectionItems.id,
      animeId: collectionItems.animeId,
      anilistId: collectionItems.anilistId,
      animeTitle: collectionItems.animeTitle,
      animeThumbnail: collectionItems.animeThumbnail,
      note: collectionItems.note,
      position: collectionItems.position,
      addedBy: collectionItems.addedBy,
      createdAt: collectionItems.createdAt,
    })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(collectionItems.position, collectionItems.createdAt);

  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  }));
}

/** First few posters, used to render collage covers on cards. */
export async function loadPreviewThumbnails(
  db: Db,
  collectionIds: string[],
): Promise<Record<string, string[]>> {
  if (collectionIds.length === 0) return {};
  const rows = await db
    .select({
      collectionId: collectionItems.collectionId,
      thumb: collectionItems.animeThumbnail,
      position: collectionItems.position,
    })
    .from(collectionItems)
    .where(inArray(collectionItems.collectionId, collectionIds))
    .orderBy(collectionItems.position);

  const out: Record<string, string[]> = {};
  for (const r of rows) {
    if (!r.thumb) continue;
    const list = (out[r.collectionId] ??= []);
    if (list.length < 4) list.push(r.thumb);
  }
  return out;
}

/** Which of these collections the viewer has liked / follows. */
export async function loadViewerState(
  db: Db,
  collectionIds: string[],
  userId: string | null | undefined,
): Promise<{ liked: Set<string>; following: Set<string> }> {
  if (!userId || collectionIds.length === 0) {
    return { liked: new Set(), following: new Set() };
  }
  const [likes, follows] = await Promise.all([
    db
      .select({ collectionId: collectionLikes.collectionId })
      .from(collectionLikes)
      .where(
        and(
          eq(collectionLikes.userId, userId),
          inArray(collectionLikes.collectionId, collectionIds),
        ),
      ),
    db
      .select({ collectionId: collectionFollows.collectionId })
      .from(collectionFollows)
      .where(
        and(
          eq(collectionFollows.userId, userId),
          inArray(collectionFollows.collectionId, collectionIds),
        ),
      ),
  ]);
  return {
    liked: new Set(likes.map((l) => l.collectionId)),
    following: new Set(follows.map((f) => f.collectionId)),
  };
}

/**
 * Appends -2, -3 … until the (owner, slug) unique index is satisfied.
 * `excludeId` lets an edit keep its own slug.
 */
export async function uniqueSlugForOwner(
  db: Db,
  ownerId: string,
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugifyCollectionTitle(title);
  const existing = await db
    .select({ id: collections.id, slug: collections.slug })
    .from(collections)
    .where(eq(collections.ownerId, ownerId));

  const taken = new Set(
    existing.filter((r) => r.id !== excludeId).map((r) => r.slug),
  );
  if (!taken.has(base)) return base;
  for (let i = 2; i < 500; i++) {
    const candidate = `${base}-${i}`.slice(0, 140);
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`.slice(0, 140);
}

/** Recomputes item_count and stamps items_updated_at after any item change. */
export async function syncItemCount(db: Db, collectionId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.collectionId, collectionId));
  const count = row?.count ?? 0;
  await db
    .update(collections)
    .set({ itemCount: count, itemsUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(collections.id, collectionId));
  return count;
}

/** Collections the given user can manage — owned plus collaborator invites. */
export async function listEditableCollections(db: Db, userId: string) {
  const owned = await db
    .select(SUMMARY_SELECT)
    .from(collections)
    .leftJoin(users, eq(users.id, collections.ownerId))
    .where(eq(collections.ownerId, userId))
    .orderBy(desc(collections.updatedAt));

  const collabRows = await db
    .select({ collectionId: collectionCollaborators.collectionId })
    .from(collectionCollaborators)
    .where(eq(collectionCollaborators.userId, userId));

  const collabIds = collabRows.map((r) => r.collectionId);
  const collab = collabIds.length
    ? await db
        .select(SUMMARY_SELECT)
        .from(collections)
        .leftJoin(users, eq(users.id, collections.ownerId))
        .where(inArray(collections.id, collabIds))
        .orderBy(desc(collections.updatedAt))
    : [];

  return [...owned, ...collab].map(rowToSummary);
}
