import { authorizeBot } from "@/lib/bot/authorize-bot";
import { parseDiscordSnowflake } from "@/lib/bot/discord-sync-roles";
import { maybeAnnounceDiscordLevelUp } from "@/lib/bot/notify-discord-levelup";
import { getDb } from "@/db";
import { discordChatXp, users } from "@/db/schema";
import {
  DISCORD_CHAT_XP,
  DISCORD_CHAT_XP_COOLDOWN_MS,
} from "@/lib/user/user-level";
import { getUserXpStats } from "@/lib/user/user-xp";
import { and, eq, lt, sql } from "drizzle-orm";

function cooldownResponse(remainingMs?: number) {
  return Response.json(
    {
      awarded: false,
      reason: "cooldown",
      ...(typeof remainingMs === "number"
        ? { cooldownRemainingMs: Math.max(0, remainingMs) }
        : {}),
      xpAmount: DISCORD_CHAT_XP,
      cooldownMs: DISCORD_CHAT_XP_COOLDOWN_MS,
    },
    { status: 429 },
  );
}

async function awardResponse(
  db: ReturnType<typeof getDb>,
  userId: string,
  discordXpTotal: number,
) {
  await maybeAnnounceDiscordLevelUp(db, userId);
  const stats = await getUserXpStats(db, userId);
  return Response.json({
    awarded: true,
    xpGained: DISCORD_CHAT_XP,
    discordXp: discordXpTotal,
    xp: stats.xp,
    level: stats.level,
    levelRole: stats.levelRole,
    cooldownMs: DISCORD_CHAT_XP_COOLDOWN_MS,
  });
}

/**
 * POST /api/bot/discord-xp
 * Body: { discordId, guildId?, messageId? }
 * Awards Discord chat XP to a linked AniKitty account (cooldown-enforced).
 */
export async function POST(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const discordId = parseDiscordSnowflake(record.discordId);
  if (!discordId) {
    return Response.json({ error: "discordId required" }, { status: 400 });
  }

  const guildId = parseDiscordSnowflake(record.guildId);
  const messageId = parseDiscordSnowflake(record.messageId);
  const now = new Date();
  const cooldownCutoff = new Date(now.getTime() - DISCORD_CHAT_XP_COOLDOWN_MS);

  try {
    const db = getDb();

    const [user] = await db
      .select({
        id: users.id,
        bannedAt: users.bannedAt,
      })
      .from(users)
      .where(eq(users.discordId, discordId))
      .limit(1);

    if (!user) {
      return Response.json({ error: "not_linked" }, { status: 404 });
    }

    if (user.bannedAt) {
      return Response.json({ error: "banned" }, { status: 403 });
    }

    const [existing] = await db
      .select({
        xp: discordChatXp.xp,
        lastAwardedAt: discordChatXp.lastAwardedAt,
      })
      .from(discordChatXp)
      .where(eq(discordChatXp.userId, user.id))
      .limit(1);

    if (!existing) {
      const [inserted] = await db
        .insert(discordChatXp)
        .values({
          userId: user.id,
          xp: DISCORD_CHAT_XP,
          lastAwardedAt: now,
          lastMessageId: messageId,
          lastGuildId: guildId,
          updatedAt: now,
        })
        .onConflictDoNothing()
        .returning({ xp: discordChatXp.xp });

      if (inserted) {
        return awardResponse(db, user.id, inserted.xp);
      }
      // Lost insert race — fall through to conditional update.
    } else {
      const elapsed = now.getTime() - existing.lastAwardedAt.getTime();
      if (elapsed < DISCORD_CHAT_XP_COOLDOWN_MS) {
        return cooldownResponse(DISCORD_CHAT_XP_COOLDOWN_MS - elapsed);
      }
    }

    const [updated] = await db
      .update(discordChatXp)
      .set({
        xp: sql`${discordChatXp.xp} + ${DISCORD_CHAT_XP}`,
        lastAwardedAt: now,
        lastMessageId: messageId,
        lastGuildId: guildId,
        updatedAt: now,
      })
      .where(
        and(
          eq(discordChatXp.userId, user.id),
          lt(discordChatXp.lastAwardedAt, cooldownCutoff),
        ),
      )
      .returning({ xp: discordChatXp.xp });

    if (!updated) {
      return cooldownResponse();
    }

    return awardResponse(db, user.id, updated.xp);
  } catch (err) {
    console.error("Bot discord-xp POST error:", err);
    return Response.json({ error: "Failed to award Discord XP" }, { status: 500 });
  }
}
