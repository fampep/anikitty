import "server-only";
import { getDb } from "@/db";
import { collectionFollows, collections, userNotifications } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { collectionPath } from "./collection-shared";

type Db = ReturnType<typeof getDb>;

/** Follower fan-out is capped so a popular collection can't stall a request. */
const MAX_FANOUT = 500;

/**
 * Notifies followers that a collection changed. Private collections are
 * skipped — they shouldn't have followers, but a visibility flip could leave
 * stale rows behind.
 */
export async function notifyCollectionFollowers(
  db: Db,
  collectionId: string,
  actorUserId: string,
  action: "added" | "removed" | "updated",
): Promise<void> {
  const [collection] = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      title: collections.title,
      visibility: collections.visibility,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!collection || collection.visibility === "private") return;

  const followers = await db
    .select({ userId: collectionFollows.userId })
    .from(collectionFollows)
    .where(
      and(
        eq(collectionFollows.collectionId, collectionId),
        // Don't notify whoever made the change.
        ne(collectionFollows.userId, actorUserId),
      ),
    )
    .limit(MAX_FANOUT);
  if (followers.length === 0) return;

  const verb =
    action === "added" ? "added new anime to" : action === "removed" ? "removed anime from" : "updated";

  await db.insert(userNotifications).values(
    followers.map((f) => ({
      userId: f.userId,
      type: "collection_update",
      actorUserId,
      title: collection.title,
      body: `Someone ${verb} ${collection.title}`,
      linkUrl: collectionPath(collection.id, collection.slug),
      referenceType: "collection",
      referenceId: collection.id,
    })),
  );
}

/** Milestone ping to the owner when a follower count crosses a round number. */
const FOLLOWER_MILESTONES = [10, 50, 100, 500, 1000, 5000, 10_000, 50_000, 100_000];

export async function maybeNotifyFollowerMilestone(
  db: Db,
  collectionId: string,
  newCount: number,
): Promise<void> {
  if (!FOLLOWER_MILESTONES.includes(newCount)) return;

  const [collection] = await db
    .select({
      id: collections.id,
      slug: collections.slug,
      title: collections.title,
      ownerId: collections.ownerId,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!collection) return;

  await db.insert(userNotifications).values({
    userId: collection.ownerId,
    type: "collection_milestone",
    title: collection.title,
    body: `${collection.title} reached ${newCount.toLocaleString()} followers`,
    linkUrl: collectionPath(collection.id, collection.slug),
    referenceType: "collection",
    referenceId: collection.id,
  });
}
