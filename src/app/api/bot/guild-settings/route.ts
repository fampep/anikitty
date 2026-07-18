import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { discordGuildSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseDiscordSnowflake } from "@/lib/bot/discord-sync-roles";

function parseGuildId(value: unknown): string | null {
  return parseDiscordSnowflake(value);
}

/**
 * GET /api/bot/guild-settings?guildId=
 * Returns persisted guild settings (level-up channel, …).
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const guildId = parseGuildId(url.searchParams.get("guildId"));
  if (!guildId) {
    return Response.json({ error: "guildId required" }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({
      guildId,
      levelupChannelId: null as string | null,
    });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        guildId: discordGuildSettings.guildId,
        levelupChannelId: discordGuildSettings.levelupChannelId,
        updatedAt: discordGuildSettings.updatedAt,
      })
      .from(discordGuildSettings)
      .where(eq(discordGuildSettings.guildId, guildId))
      .limit(1);

    return Response.json({
      guildId,
      levelupChannelId: row?.levelupChannelId ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  } catch (err) {
    console.error("Bot guild-settings GET error:", err);
    return Response.json({ error: "Failed to load guild settings" }, { status: 500 });
  }
}

/**
 * PUT /api/bot/guild-settings
 * Body: { guildId, levelupChannelId: string | null }
 */
export async function PUT(req: Request) {
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
  const guildId = parseGuildId(record.guildId);
  if (!guildId) {
    return Response.json({ error: "guildId required" }, { status: 400 });
  }

  let levelupChannelId: string | null;
  if (record.levelupChannelId === null || record.levelupChannelId === "") {
    levelupChannelId = null;
  } else {
    const parsed = parseDiscordSnowflake(record.levelupChannelId);
    if (!parsed) {
      return Response.json({ error: "levelupChannelId invalid" }, { status: 400 });
    }
    levelupChannelId = parsed;
  }

  try {
    const db = getDb();
    const now = new Date();
    await db
      .insert(discordGuildSettings)
      .values({
        guildId,
        levelupChannelId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: discordGuildSettings.guildId,
        set: {
          levelupChannelId,
          updatedAt: now,
        },
      });

    return Response.json({
      guildId,
      levelupChannelId,
      updatedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("Bot guild-settings PUT error:", err);
    return Response.json({ error: "Failed to save guild settings" }, { status: 500 });
  }
}
