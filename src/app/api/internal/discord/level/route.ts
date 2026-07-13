import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyDiscordBotRequest } from "@/lib/discord/bot-api-auth";
import { findUserByDiscordId } from "@/lib/discord/discord-link";
import { getUserXpStats } from "@/lib/user/user-xp";
import { xpForNextLevel } from "@/lib/user/user-level";

export async function GET(req: Request) {
  const denied = verifyDiscordBotRequest(req);
  if (denied) return denied;

  const discordId = new URL(req.url).searchParams.get("discordId")?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "discordId required" }, { status: 400 });
  }

  const db = getDb();
  const user = await findUserByDiscordId(db, discordId);
  if (!user) {
    return NextResponse.json({ ok: false, reason: "not_linked" }, { status: 404 });
  }

  const stats = await getUserXpStats(db, user.id);
  const progress = xpForNextLevel(stats.xp);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.net"
  ).replace(/\/$/, "");

  return NextResponse.json({
    ok: true,
    username: user.username,
    profileUrl: `${appUrl}/profile/${encodeURIComponent(user.username)}`,
    level: stats.level,
    tier: stats.levelRole,
    tierColor: stats.levelRoleColor,
    xp: stats.xp,
    xpProgress: progress.current,
    xpNeeded: progress.needed,
    completedEpisodes: stats.completedEpisodes,
    commentCount: stats.commentCount,
    discordXp: stats.discordXp,
    role: user.role,
    boosting: !!user.discordBoostSince,
  });
}
