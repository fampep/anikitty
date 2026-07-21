import { NextResponse } from "next/server";
import {
  extractToken,
  verifyRecoveryCodesClaim,
  verifyToken,
} from "@/lib/auth/auth-jwt";
import {
  clearRecoveryClaimCookie,
  readCookie,
  RECOVERY_CODES_CLAIM_COOKIE,
} from "@/lib/auth/auth-cookie";

/**
 * One-time reveal of recovery codes after Discord signup (claim cookie).
 * Cleared after a successful read.
 */
export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const session = await verifyToken(token);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const claimJwt = readCookie(req, RECOVERY_CODES_CLAIM_COOKIE);
  if (!claimJwt) {
    return NextResponse.json({ codes: null });
  }

  const claim = await verifyRecoveryCodesClaim(claimJwt);
  if (!claim || claim.userId !== session.userId) {
    const res = NextResponse.json({ codes: null });
    clearRecoveryClaimCookie(res);
    return res;
  }

  const res = NextResponse.json({
    codes: claim.codes,
    message: "Save these recovery codes now — they won’t be shown again.",
  });
  clearRecoveryClaimCookie(res);
  return res;
}
