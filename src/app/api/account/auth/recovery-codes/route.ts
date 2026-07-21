import { extractToken, verifyToken } from "@/lib/auth/auth-jwt";
import {
  countUnusedRecoveryCodes,
  issueRecoveryCodes,
} from "@/lib/auth/recovery-codes";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

/** Status: how many unused recovery codes remain. */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const remaining = await countUnusedRecoveryCodes(payload.userId);
  return NextResponse.json({ remaining, recommended: remaining === 0 });
}

/** Regenerate a full set of recovery codes (invalidates unused ones). Returns plaintext once. */
export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const limited = rateLimit(`regen-recovery:${payload.userId}:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many regenerations. Try again in ${limited.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const codes = await issueRecoveryCodes(payload.userId);
  return NextResponse.json({
    codes,
    remaining: codes.length,
    message: "Save these codes now — they won’t be shown again.",
  });
}
