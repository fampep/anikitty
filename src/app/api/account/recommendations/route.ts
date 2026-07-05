import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import { getRecommendationsForUser } from "@/lib/core/recommendations";

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? await verifyToken(token) : null;
  if (!payload) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await getRecommendationsForUser(payload.userId);
    return Response.json(
      { data: result.items, hasHistory: result.hasHistory },
      { headers: { "Cache-Control": "private, max-age=600" } },
    );
  } catch (err) {
    console.error("recommendations error:", err);
    return Response.json({ data: [], hasHistory: true });
  }
}
