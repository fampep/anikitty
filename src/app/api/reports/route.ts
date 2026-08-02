import { getDb } from "@/db";
import { comments, userReports } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { eq } from "drizzle-orm";

const VALID_REASONS = new Set([
  "spam",
  "harassment",
  "spoiler",
  "nsfw",
  "hate",
  "off_topic",
  "duplicate",
  "other",
]);
const VALID_TARGETS = new Set(["comment", "user"]);

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const limited = checkRateLimit(`report:${payload.userId}:${getClientIp(req)}`, 8, 60_000);
  if (limited) return limited;

  const raw = await req.json().catch(() => ({}));
  const targetType = typeof raw.targetType === "string" ? raw.targetType : "";
  const targetId = typeof raw.targetId === "string" ? raw.targetId.trim() : "";
  const reason = typeof raw.reason === "string" ? raw.reason : "";
  const details = typeof raw.details === "string" ? raw.details.trim().slice(0, 500) : null;

  if (!VALID_TARGETS.has(targetType) || !targetId || !VALID_REASONS.has(reason)) {
    return Response.json({ error: "Invalid report" }, { status: 400 });
  }

  const db = getDb();

  // Resolve the offending user for comment reports so mods can act on them.
  let targetUserId: string | null = null;
  if (targetType === "comment") {
    const [c] = await db
      .select({ userId: comments.userId })
      .from(comments)
      .where(eq(comments.id, targetId))
      .limit(1);
    if (!c) return Response.json({ error: "Comment not found" }, { status: 404 });
    targetUserId = c.userId;
  } else {
    targetUserId = targetId;
  }

  if (targetUserId === payload.userId) {
    return Response.json({ error: "You can't report yourself" }, { status: 400 });
  }

  await db
    .insert(userReports)
    .values({
      reporterUserId: payload.userId,
      targetType,
      targetId,
      targetUserId,
      reason,
      details,
    })
    .onConflictDoNothing();

  return Response.json({ ok: true }, { status: 201 });
}
