import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { getUserByUsername } from "@/lib/public-user";
import { desc, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const db = getDb();
  const user = await getUserByUsername(db, username);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rows = await db
    .select({
      id: comments.id,
      animeId: comments.animeId,
      episodeId: comments.episodeId,
      episodeNumber: comments.episodeNumber,
      body: comments.body,
      gifUrl: comments.gifUrl,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.userId, user.id))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return NextResponse.json({
    comments: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
}
