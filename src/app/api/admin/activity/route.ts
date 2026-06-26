import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { watchProgress, users } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { desc, eq } from "drizzle-orm";

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

  const db = getDb();
  const rows = await db
    .select({
      progressId: watchProgress.id,
      animeId: watchProgress.animeId,
      episodeId: watchProgress.episodeId,
      currentTime: watchProgress.currentTime,
      duration: watchProgress.duration,
      language: watchProgress.language,
      server: watchProgress.server,
      animeTitle: watchProgress.animeTitle,
      animeThumbnail: watchProgress.animeThumbnail,
      updatedAt: watchProgress.updatedAt,
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
      userRole: users.role,
    })
    .from(watchProgress)
    .innerJoin(users, eq(watchProgress.userId, users.id))
    .orderBy(desc(watchProgress.updatedAt))
    .limit(limit);

  return NextResponse.json({ activity: rows });
}
