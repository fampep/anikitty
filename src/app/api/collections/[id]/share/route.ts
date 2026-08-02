import { getDb } from "@/db";
import { collections } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { canViewCollection, getCollectionRole } from "@/lib/collections/collection-server";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { eq, sql } from "drizzle-orm";

/**
 * POST /api/collections/[id]/share — bumps the share counter when someone
 * uses a share button. This is a soft signal: it counts intent to share, not
 * confirmed shares, since no third-party network reports back. Rate-limited so
 * the number stays roughly meaningful.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;

  const limited = checkRateLimit(`collection-share:${payload?.userId ?? getClientIp(req)}`, 10, 60_000);
  if (limited) return limited;

  const db = getDb();
  const [collection] = await db
    .select({ visibility: collections.visibility })
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const role = await getCollectionRole(db, id, payload?.userId);
  if (!canViewCollection(collection.visibility, role)) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await db
    .update(collections)
    .set({ shareCount: sql`${collections.shareCount} + 1` })
    .where(eq(collections.id, id));

  return Response.json({ ok: true });
}
