import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userAnimeNotes } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";

/**
 * GET /api/account/anime-notes
 * Returns { notes: Record<animeId, note> } for the signed-in user.
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  try {
    const db = getDb();
    const rows = await db
      .select({
        animeId: userAnimeNotes.animeId,
        note: userAnimeNotes.note,
      })
      .from(userAnimeNotes)
      .where(eq(userAnimeNotes.userId, user.id));

    const notes: Record<string, string> = {};
    for (const row of rows) {
      if (row.note.trim()) notes[row.animeId] = row.note;
    }
    return Response.json({ notes });
  } catch {
    return Response.json({ notes: {} });
  }
}

/**
 * PUT /api/account/anime-notes
 * Body: { animeId: string, note: string }
 * Empty note deletes the row.
 */
export async function PUT(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  let body: { animeId?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const animeId = body.animeId?.trim();
  if (!animeId) {
    return Response.json({ error: "animeId required" }, { status: 400 });
  }
  const trimmed = typeof body.note === "string" ? body.note.trim().slice(0, 2000) : "";

  try {
    const db = getDb();
    if (!trimmed) {
      await db
        .delete(userAnimeNotes)
        .where(and(eq(userAnimeNotes.userId, user.id), eq(userAnimeNotes.animeId, animeId)));
      return Response.json({ ok: true, note: null });
    }

    const now = new Date();
    await db
      .insert(userAnimeNotes)
      .values({
        userId: user.id,
        animeId,
        note: trimmed,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userAnimeNotes.userId, userAnimeNotes.animeId],
        set: { note: trimmed, updatedAt: now },
      });

    return Response.json({ ok: true, note: trimmed });
  } catch (e) {
    console.error("[anime-notes]", e);
    return Response.json({ error: "Failed to save note" }, { status: 500 });
  }
}
