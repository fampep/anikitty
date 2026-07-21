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

  try {
    const remaining = await countUnusedRecoveryCodes(payload.userId);
    return NextResponse.json({ remaining, recommended: remaining === 0 });
  } catch (e) {
    console.error("[recovery-codes status]", e);
    return NextResponse.json({ remaining: 0, recommended: true, missingTable: true });
  }
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

  try {
    const codes = await issueRecoveryCodes(payload.userId);
    return NextResponse.json({
      codes,
      remaining: codes.length,
      message: "Save these codes now — they won’t be shown again.",
    });
  } catch (e) {
    console.error("[recovery-codes regenerate]", e);
    const msg = e instanceof Error ? e.message : String(e);
    if (/user_recovery_codes|does not exist|password_set_at|email_verified_at/i.test(msg)) {
      return NextResponse.json(
        {
          error:
            "Database is missing recovery tables. Redeploy the site so auto-migrate can create them, then try again.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
