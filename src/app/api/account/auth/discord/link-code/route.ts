import { getDb } from "@/db";
import { discordLinkCodes, users } from "@/db/schema";
import { requireUser, unauthorized } from "@/lib/auth/require-user";
import { notifyDiscordRoleSync } from "@/lib/bot/notify-discord-sync";
import { and, eq, gt, isNull } from "drizzle-orm";

function parseCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^[a-f0-9]{32,64}$/i.test(trimmed) ? trimmed : null;
}

/**
 * GET /api/account/auth/discord/link-code?code=
 * Preview a pending bot link code (logged-in user).
 */
export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  const url = new URL(req.url);
  const code = parseCode(url.searchParams.get("code"));
  if (!code) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({
        discordId: discordLinkCodes.discordId,
        discordUsername: discordLinkCodes.discordUsername,
        expiresAt: discordLinkCodes.expiresAt,
        usedAt: discordLinkCodes.usedAt,
      })
      .from(discordLinkCodes)
      .where(eq(discordLinkCodes.code, code))
      .limit(1);

    if (!row) {
      return Response.json({ error: "not_found", message: "Link code not found" }, { status: 404 });
    }
    if (row.usedAt) {
      return Response.json({ error: "used", message: "This link has already been used" }, { status: 410 });
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return Response.json({ error: "expired", message: "This link has expired" }, { status: 410 });
    }

    const [current] = await db
      .select({ discordId: users.discordId })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    return Response.json({
      discordId: row.discordId,
      discordUsername: row.discordUsername,
      expiresAt: row.expiresAt.toISOString(),
      alreadyLinked: !!current?.discordId,
      sameDiscord: current?.discordId === row.discordId,
    });
  } catch (err) {
    console.error("discord link-code GET error:", err);
    return Response.json({ error: "Failed to load link code" }, { status: 500 });
  }
}

/**
 * POST /api/account/auth/discord/link-code
 * Body: { code }
 * Consumes a bot-issued link code and binds discord_id to the logged-in user.
 */
export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const code = parseCode(
    body && typeof body === "object"
      ? (body as Record<string, unknown>).code
      : null,
  );
  if (!code) {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    const db = getDb();

    const [current] = await db
      .select({
        id: users.id,
        discordId: users.discordId,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!current) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const [row] = await db
      .select()
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
      return Response.json(
        { error: "invalid_code", message: "Link code is invalid, used, or expired" },
        { status: 410 },
      );
    }

    if (current.discordId === row.discordId) {
      await db
        .update(discordLinkCodes)
        .set({ usedAt: new Date(), usedByUserId: current.id })
        .where(eq(discordLinkCodes.code, code));
      return Response.json({ status: "connected", discordUsername: row.discordUsername });
    }

    if (current.discordId) {
      return Response.json(
        {
          error: "already_linked",
          message: "Your AniKitty account already has a Discord linked. Unlink it in Settings first.",
        },
        { status: 409 },
      );
    }

    const [taken] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.discordId, row.discordId))
      .limit(1);

    if (taken) {
      return Response.json(
        {
          error: "taken",
          message: `This Discord account is already linked to @${taken.username}`,
        },
        { status: 409 },
      );
    }

    await db
      .update(users)
      .set({
        discordId: row.discordId,
        discordUsername: row.discordUsername,
      })
      .where(eq(users.id, current.id));

    await db
      .update(discordLinkCodes)
      .set({ usedAt: new Date(), usedByUserId: current.id })
      .where(eq(discordLinkCodes.code, code));

    notifyDiscordRoleSync("discord_link_code");

    return Response.json({
      status: "connected",
      discordId: row.discordId,
      discordUsername: row.discordUsername,
    });
  } catch (err) {
    console.error("discord link-code POST error:", err);
    return Response.json({ error: "Failed to link Discord" }, { status: 500 });
  }
}
