import { getDb } from "@/db";
import { users } from "@/db/schema";
import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { ilike, sql } from "drizzle-orm";

// Username autocomplete for @mentions. Prefix match, capped small.
export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) return Response.json({ users: [] });

  const db = getDb();
  const rows = await db
    .select({ username: users.username, avatarUrl: users.avatarUrl })
    .from(users)
    .where(ilike(users.username, `${q.replace(/[%_]/g, "")}%`))
    .orderBy(sql`length(${users.username})`)
    .limit(6);

  return Response.json({ users: rows });
}
