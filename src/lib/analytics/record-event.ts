import { getDb } from "@/db";
import { animeViewEvents } from "@/db/schema";

export async function recordViewEvent(
  animeId: string,
  episodeId: string | null,
  userId: string | null,
  eventType: "view_start" | "view_complete" | "favorite" | "search",
  watchTimeSeconds?: number,
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(animeViewEvents).values({
      animeId,
      episodeId,
      userId,
      eventType,
      watchTimeSeconds: watchTimeSeconds ?? null,
    });
  } catch (e) {
    console.error("[record-event] failed:", e);
  }
}
