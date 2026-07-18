import { safeEqual } from "@/lib/security/security";

/** Authorize Discord bot / internal callers via `Authorization: Bearer <BOT_API_SECRET>`. */
export function authorizeBot(req: Request): boolean {
  const secret = process.env.BOT_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  return safeEqual(auth.slice(7), secret);
}
