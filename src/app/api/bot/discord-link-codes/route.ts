import { randomBytes } from "crypto";
import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { discordLinkCodes, users } from "@/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { parseDiscordSnowflake } from "@/lib/bot/discord-sync-roles";

const CODE_TTL_MS = 15 * 60 * 1000;
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://anikitty.moe";

/**
 * POST /api/bot/discord-link-codes
 * Body: { discordId, discordUsername? }
 * Bot-auth only. Creates a short-lived one-time link code for /link-discord?code=
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

  const discordUsername =
    typeof record.discordUsername === "string"
      ? record.discordUsername.trim().slice(0, 100) || null
      : null;

  try {
    const db = getDb();

    const [existing] = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(eq(users.discordId, discordId))
      .limit(1);

    if (existing) {
      return Response.json(
        {
          error: "already_linked",
          message: `This Discord account is already linked to @${existing.username}`,
          siteUsername: existing.username,
        },
        { status: 409 },
      );
    }

    const code = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await db.insert(discordLinkCodes).values({
      code,
      discordId,
      discordUsername,
      expiresAt,
    });

    const url = `${SITE_ORIGIN}/link-discord?code=${encodeURIComponent(code)}`;

    return Response.json({
      code,
      discordId,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: Math.floor(CODE_TTL_MS / 1000),
      url,
    });
  } catch (err) {
    console.error("Bot discord-link-codes POST error:", err);
    return Response.json({ error: "Failed to create link code" }, { status: 500 });
  }
}

/**
 * GET /api/bot/discord-link-codes?code=
 * Optional peek for bots — unused by default; prefer create response URL.
 */
export async function GET(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  if (!/^[a-f0-9]{32,64}$/i.test(code)) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        discordId: discordLinkCodes.discordId,
        expiresAt: discordLinkCodes.expiresAt,
        usedAt: discordLinkCodes.usedAt,
      })
      .from(discordLinkCodes)
      .where(
        and(
          eq(discordLinkCodes.code, code),
          isNull(discordLinkCodes.usedAt),
          gt(discordLinkCodes.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!row) {
      return Response.json({ valid: false }, { status: 404 });
    }

    return Response.json({
      valid: true,
      discordId: row.discordId,
      expiresAt: row.expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("Bot discord-link-codes GET error:", err);
    return Response.json({ error: "Failed to check link code" }, { status: 500 });
  }
}
