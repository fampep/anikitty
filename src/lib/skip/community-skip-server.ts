import { getDb } from "@/db";
import { episodeSkipTimes, userNotifications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { rowToSkipTimes, watchEpisodeUrl } from "@/lib/skip/community-skip";
import type { SkipTimes } from "@/hooks/use-aniskip";

export async function getApprovedCommunitySkipTimes(
  anilistId: number,
  episode: number,
): Promise<SkipTimes> {
  const db = getDb();
  const [row] = await db
    .select({
      introStart: episodeSkipTimes.introStart,
      introEnd: episodeSkipTimes.introEnd,
      outroStart: episodeSkipTimes.outroStart,
      outroEnd: episodeSkipTimes.outroEnd,
    })
    .from(episodeSkipTimes)
    .where(and(eq(episodeSkipTimes.anilistId, anilistId), eq(episodeSkipTimes.episode, episode)))
    .limit(1);

  return row ? rowToSkipTimes(row) : {};
}

export async function notifySkipSubmissionDecision(opts: {
  userId: string;
  submissionId: string;
  anilistId: number;
  episode: number;
  animeTitle: string | null;
  approved: boolean;
  rejectReason?: string | null;
}) {
  const db = getDb();
  const title = opts.animeTitle?.trim() || `Anime #${opts.anilistId}`;
  const body = opts.approved
    ? `Your skip times for episode ${opts.episode} were approved. Thanks for helping build our timestamp database!`
    : `Your skip times for episode ${opts.episode} were declined.${
        opts.rejectReason?.trim() ? ` Reason: ${opts.rejectReason.trim()}` : ""
      }`;

  await db.insert(userNotifications).values({
    userId: opts.userId,
    type: opts.approved ? "skip_approved" : "skip_rejected",
    title,
    body,
    linkUrl: watchEpisodeUrl(opts.anilistId, opts.episode),
    referenceType: "skip_submission",
    referenceId: opts.submissionId,
  });
}
