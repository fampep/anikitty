import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chatPins } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";

const MAX_PINS = 50;

/**
 * GET /api/chat/pins — current user's pinned messages.
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: chatPins.messageId,
        body: chatPins.body,
        gifUrl: chatPins.gifUrl,
        username: chatPins.username,
        avatarUrl: chatPins.avatarUrl,
        createdAt: chatPins.messageCreatedAt,
        pinnedAt: chatPins.pinnedAt,
      })
      .from(chatPins)
      .where(eq(chatPins.userId, user.id))
      .orderBy(desc(chatPins.pinnedAt))
      .limit(MAX_PINS);

    return Response.json({
      pins: rows.map((r) => ({
        id: r.id,
        body: r.body,
        gifUrl: r.gifUrl,
        username: r.username,
        avatarUrl: r.avatarUrl,
        createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
        pinnedAt: r.pinnedAt.getTime(),
      })),
    });
  } catch {
    return Response.json({ pins: [] });
  }
}

/**
 * POST /api/chat/pins — pin a message snapshot.
 * Body: { id, body, gifUrl?, username, avatarUrl?, createdAt }
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  let body: {
    id?: string;
    body?: string;
    gifUrl?: string | null;
    username?: string;
    avatarUrl?: string | null;
    createdAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messageId = body.id?.trim();
  const username = body.username?.trim();
  if (!messageId || !username) {
    return Response.json({ error: "id and username required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const now = new Date();
    const messageCreatedAt = body.createdAt ? new Date(body.createdAt) : null;

    await db
      .insert(chatPins)
      .values({
        userId: user.id,
        messageId,
        body: (body.body ?? "").slice(0, 2000),
        gifUrl: body.gifUrl ?? null,
        username: username.slice(0, 25),
        avatarUrl: body.avatarUrl ?? null,
        messageCreatedAt:
          messageCreatedAt && !Number.isNaN(messageCreatedAt.getTime())
            ? messageCreatedAt
            : null,
        pinnedAt: now,
      })
      .onConflictDoUpdate({
        target: [chatPins.userId, chatPins.messageId],
        set: {
          body: (body.body ?? "").slice(0, 2000),
          gifUrl: body.gifUrl ?? null,
          username: username.slice(0, 25),
          avatarUrl: body.avatarUrl ?? null,
          messageCreatedAt:
            messageCreatedAt && !Number.isNaN(messageCreatedAt.getTime())
              ? messageCreatedAt
              : null,
          pinnedAt: now,
        },
      });

    // Cap pin count per user
    const all = await db
      .select({ id: chatPins.id })
      .from(chatPins)
      .where(eq(chatPins.userId, user.id))
      .orderBy(desc(chatPins.pinnedAt));
    if (all.length > MAX_PINS) {
      const drop = all.slice(MAX_PINS).map((r) => r.id);
      for (const id of drop) {
        await db.delete(chatPins).where(eq(chatPins.id, id));
      }
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("[chat/pins]", e);
    return Response.json({ error: "Failed to pin" }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/pins?messageId=...
 */
export async function DELETE(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  const messageId = new URL(req.url).searchParams.get("messageId")?.trim();
  if (!messageId) {
    return Response.json({ error: "messageId required" }, { status: 400 });
  }

  try {
    const db = getDb();
    await db
      .delete(chatPins)
      .where(and(eq(chatPins.userId, user.id), eq(chatPins.messageId, messageId)));
    return Response.json({ ok: true });
  } catch (e) {
    console.error("[chat/pins DELETE]", e);
    return Response.json({ error: "Failed to unpin" }, { status: 500 });
  }
}
