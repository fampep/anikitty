import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyDiscordBotRequest } from "@/lib/discord/bot-api-auth";
import { awardDiscordMessageXp } from "@/lib/discord/discord-message-xp";

export async function POST(req: Request) {
  const denied = verifyDiscordBotRequest(req);
  if (denied) return denied;

  let body: { discordId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId = body.discordId?.trim();
  if (!discordId) {
    return NextResponse.json({ error: "discordId required" }, { status: 400 });
  }

  const db = getDb();
  const result = await awardDiscordMessageXp(db, discordId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  }

  return NextResponse.json(result);
}
