import { getDb } from "@/db";
import { collectionCollaborators, collections, users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getCollectionRole } from "@/lib/collections/collection-server";
import { collectionPath, isCollectionRole } from "@/lib/collections/collection-shared";
import { userNotifications } from "@/db/schema";
import { and, eq } from "drizzle-orm";

/** GET — list collaborators. Visible to anyone who can manage the collection. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      userId: collectionCollaborators.userId,
      role: collectionCollaborators.role,
      username: users.username,
      avatarUrl: users.avatarUrl,
      createdAt: collectionCollaborators.createdAt,
    })
    .from(collectionCollaborators)
    .leftJoin(users, eq(users.id, collectionCollaborators.userId))
    .where(eq(collectionCollaborators.collectionId, id));

  return Response.json({ collaborators: rows, myRole: role });
}

/** POST — invite by username, or change an existing collaborator's role. Owner only. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  if (role !== "owner") return Response.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => ({}));
  const username = typeof raw.username === "string" ? raw.username.trim() : "";
  const newRole = isCollectionRole(raw.role) && raw.role !== "owner" ? raw.role : "contributor";
  if (!username) return Response.json({ error: "Missing username" }, { status: 400 });

  const [target] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!target) return Response.json({ error: "User not found" }, { status: 404 });
  if (target.id === payload.userId) {
    return Response.json({ error: "You already own this collection" }, { status: 400 });
  }

  await db
    .insert(collectionCollaborators)
    .values({
      collectionId: id,
      userId: target.id,
      role: newRole,
      invitedBy: payload.userId,
    })
    .onConflictDoUpdate({
      target: [collectionCollaborators.collectionId, collectionCollaborators.userId],
      set: { role: newRole },
    });

  const [collection] = await db
    .select({ title: collections.title, slug: collections.slug })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);

  if (collection) {
    await db
      .insert(userNotifications)
      .values({
        userId: target.id,
        type: "collection_invite",
        actorUserId: payload.userId,
        title: collection.title,
        body: `You were added to ${collection.title} as ${newRole}`,
        linkUrl: collectionPath(id, collection.slug),
        referenceType: "collection",
        referenceId: id,
      })
      .catch(() => {});
  }

  return Response.json({ ok: true });
}

/** DELETE ?userId=… — remove a collaborator, or leave the collection yourself. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") ?? payload.userId;

  const db = getDb();
  const role = await getCollectionRole(db, id, payload.userId);
  // Owners can remove anyone; collaborators can only remove themselves.
  if (role !== "owner" && targetUserId !== payload.userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!role) return Response.json({ error: "Forbidden" }, { status: 403 });

  await db
    .delete(collectionCollaborators)
    .where(
      and(
        eq(collectionCollaborators.collectionId, id),
        eq(collectionCollaborators.userId, targetUserId),
      ),
    );

  return Response.json({ ok: true });
}
