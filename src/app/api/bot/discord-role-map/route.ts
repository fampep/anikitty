import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { discordRoleMap } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getDiscordSyncRoleDefs,
  isDiscordSyncRoleKey,
  parseDiscordSnowflake,
} from "@/lib/bot/discord-sync-roles";

type MapEntry = {
  siteRoleKey: string;
  discordRoleId: string;
  discordRoleName?: string | null;
};

function parseGuildId(value: unknown): string | null {
  return parseDiscordSnowflake(value);
}

/**
 * GET /api/bot/discord-role-map?guildId=
 * Returns syncable role definitions + persisted Discord snowflakes for the guild.
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

  const defs = getDiscordSyncRoleDefs();
  const map: Record<string, string> = {};

  if (!process.env.DATABASE_URL) {
    return Response.json({
      guildId,
      roles: defs.map((d) => ({ ...d, discordRoleId: null as string | null })),
      map,
    });
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        siteRoleKey: discordRoleMap.siteRoleKey,
        discordRoleId: discordRoleMap.discordRoleId,
        discordRoleName: discordRoleMap.discordRoleName,
      })
      .from(discordRoleMap)
      .where(eq(discordRoleMap.guildId, guildId));

    const byKey = new Map(rows.map((r) => [r.siteRoleKey, r]));
    for (const row of rows) {
      map[row.siteRoleKey] = row.discordRoleId;
    }

    return Response.json({
      guildId,
      roles: defs.map((d) => {
        const row = byKey.get(d.key);
        return {
          ...d,
          discordRoleId: row?.discordRoleId ?? null,
          discordRoleName: row?.discordRoleName ?? null,
        };
      }),
      map,
    });
  } catch (err) {
    console.error("Bot discord-role-map GET error:", err);
    return Response.json({ error: "Failed to load role map" }, { status: 500 });
  }
}

/**
 * POST /api/bot/discord-role-map
 * Body: { guildId, entries: [{ siteRoleKey, discordRoleId, discordRoleName? }] }
 * or { guildId, map: { admin: "123", ... } }
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
  const guildId = parseGuildId(record.guildId);
  if (!guildId) {
    return Response.json({ error: "guildId required" }, { status: 400 });
  }

  const entries: MapEntry[] = [];

  if (Array.isArray(record.entries)) {
    for (const item of record.entries) {
      if (!item || typeof item !== "object") continue;
      const e = item as Record<string, unknown>;
      const key = typeof e.siteRoleKey === "string" ? e.siteRoleKey.trim().toLowerCase() : "";
      const discordRoleId = parseDiscordSnowflake(e.discordRoleId);
      if (!key || !isDiscordSyncRoleKey(key) || !discordRoleId) continue;
      entries.push({
        siteRoleKey: key,
        discordRoleId,
        discordRoleName:
          typeof e.discordRoleName === "string" ? e.discordRoleName.slice(0, 100) : null,
      });
    }
  } else if (record.map && typeof record.map === "object" && !Array.isArray(record.map)) {
    for (const [rawKey, rawId] of Object.entries(record.map as Record<string, unknown>)) {
      const key = rawKey.trim().toLowerCase();
      const discordRoleId = parseDiscordSnowflake(rawId);
      if (!isDiscordSyncRoleKey(key) || !discordRoleId) continue;
      entries.push({ siteRoleKey: key, discordRoleId });
    }
  }

  if (entries.length === 0) {
    return Response.json({ error: "No valid role map entries" }, { status: 400 });
  }

  try {
    const db = getDb();
    const now = new Date();
    for (const entry of entries) {
      await db
        .insert(discordRoleMap)
        .values({
          guildId,
          siteRoleKey: entry.siteRoleKey,
          discordRoleId: entry.discordRoleId,
          discordRoleName: entry.discordRoleName ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [discordRoleMap.guildId, discordRoleMap.siteRoleKey],
          set: {
            discordRoleId: entry.discordRoleId,
            discordRoleName: entry.discordRoleName ?? null,
            updatedAt: now,
          },
        });
    }

    const rows = await db
      .select({
        siteRoleKey: discordRoleMap.siteRoleKey,
        discordRoleId: discordRoleMap.discordRoleId,
      })
      .from(discordRoleMap)
      .where(eq(discordRoleMap.guildId, guildId));

    const map: Record<string, string> = {};
    for (const row of rows) map[row.siteRoleKey] = row.discordRoleId;

    return Response.json({
      guildId,
      upserted: entries.length,
      map,
    });
  } catch (err) {
    console.error("Bot discord-role-map POST error:", err);
    return Response.json({ error: "Failed to save role map" }, { status: 500 });
  }
}
