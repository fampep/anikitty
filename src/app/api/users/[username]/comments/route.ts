import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { comments } from "@/db/schema";
import { requireVisibleProfileUser } from "@/lib/user/public-profile-access";
import { desc, eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username: raw } = await params;
  const userOrResponse = await requireVisibleProfileUser(req, raw);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const db = getDb();
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
    .where(eq(comments.userId, userOrResponse.id))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return NextResponse.json({
    comments: rows.map((r) => ({
      ...r,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
  });
}
