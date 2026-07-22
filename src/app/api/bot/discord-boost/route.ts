import { authorizeBot } from "@/lib/bot/authorize-bot";
import { getDb } from "@/db";
import { parseDiscordSnowflake } from "@/lib/bot/discord-sync-roles";
import { setDiscordBoostByDiscordId } from "@/lib/social/booster-access";

/**
 * POST /api/bot/discord-boost
 * Body: { discordId: string, boosting: boolean }
 *
 * Discord bot reports guild boost status for a linked account.
 * Grants/clears the site Booster role (badge only — not ad-free).
 */
export async function POST(req: Request) {
  if (!authorizeBot(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.DATABASE_URL) {
    return Response.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId =
    body && typeof body === "object" && "discordId" in body
      ? parseDiscordSnowflake((body as { discordId: unknown }).discordId)
      : null;
  const boosting =
    body && typeof body === "object" && "boosting" in body
      ? (body as { boosting: unknown }).boosting
      : undefined;

  if (!discordId) {
    return Response.json({ error: "discordId required" }, { status: 400 });
  }
  if (typeof boosting !== "boolean") {
    return Response.json({ error: "boosting boolean required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = await setDiscordBoostByDiscordId(db, discordId, boosting);
    if (!result) {
      return Response.json(
        { linked: false, discordId, boosting },
        { status: 404 },
      );
    }

    return Response.json({
      linked: true,
      discordId,
      ...result,
    });
  } catch (err) {
    console.error("Bot discord-boost error:", err);
    return Response.json({ error: "Failed to update boost status" }, { status: 500 });
  }
}
