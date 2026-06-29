import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { dmConversations } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  buildConversationSummary,
  canInitiateDm,
  findOrCreateConversation,
  getUserByUsername,
} from "@/lib/social/dm-server";
import { desc, eq, or } from "drizzle-orm";

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const convs = await db
    .select()
    .from(dmConversations)
    .where(
      or(
        eq(dmConversations.participantAId, payload.userId),
        eq(dmConversations.participantBId, payload.userId),
      ),
    )
    .orderBy(desc(dmConversations.lastActivityAt))
    .limit(100);

  const conversations = await Promise.all(
    convs.map((c) => buildConversationSummary(c, payload.userId)),
  );

  return NextResponse.json({ conversations });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  if (!username?.trim()) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  const target = await getUserByUsername(username.trim());
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const allowed = await canInitiateDm(payload.userId, target);
  if (!allowed) {
    return NextResponse.json({ error: "Cannot message this user" }, { status: 403 });
  }

  const conv = await findOrCreateConversation(payload.userId, target.id);
  if (!conv) return NextResponse.json({ error: "Invalid conversation" }, { status: 400 });

  const conversation = await buildConversationSummary(conv, payload.userId);
  return NextResponse.json({ conversation });
}
