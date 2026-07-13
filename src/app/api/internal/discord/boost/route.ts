import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { verifyDiscordBotRequest } from "@/lib/discord/bot-api-auth";
import { syncDiscordBoostStatus } from "@/lib/discord/discord-boost";

export async function POST(req: Request) {
  const denied = verifyDiscordBotRequest(req);
  if (denied) return denied;

  let body: { discordId?: string; boosting?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId = body.discordId?.trim();
  if (!discordId || typeof body.boosting !== "boolean") {
    return NextResponse.json({ error: "discordId and boosting required" }, { status: 400 });
  }

  const db = getDb();
  const result = await syncDiscordBoostStatus(db, discordId, body.boosting);
  if (!result.ok) {
    return NextResponse.json({ ok: false, reason: result.reason }, { status: 404 });
  }

  return NextResponse.json(result);
}
