import {
  completeDiscordLink,
  completeDiscordLogin,
  discord2faRedirect,
  discordLoginErrorRedirect,
  discordLoginSuccessRedirect,
  discordSettingsRedirect,
} from "@/lib/oauth/discord-oauth";
import { signRecoveryCodesClaim, verifyOAuthStateFor } from "@/lib/auth/auth-jwt";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    const linkHint = state ? await verifyOAuthStateFor(state, "discord_link") : null;
    if (linkHint?.userId) return discordSettingsRedirect(req, "error");
    return discordLoginErrorRedirect(req, "cancelled");
  }

  const isLink = !!(await verifyOAuthStateFor(state, "discord_link"))?.userId;
  if (isLink) {
    const status = await completeDiscordLink(code, state, req);
    return discordSettingsRedirect(req, status);
  }

  const result = await completeDiscordLogin(code, state, req);
  if (result.type === "success") {
    let recoveryClaim: string | undefined;
    if (result.recoveryCodes?.length) {
      recoveryClaim = await signRecoveryCodesClaim(
        result.userId,
        result.recoveryCodes,
      );
    }
    const { signSessionHandoff } = await import("@/lib/auth/auth-jwt");
    const handoff = await signSessionHandoff(result.token);
    return discordLoginSuccessRedirect(req, result.token, {
      recoveryClaim,
      handoff,
    });
  }
  if (result.type === "2fa") {
    // Codes claim isn't applied on 2FA path — regenerate from settings if needed.
    // Prefer showing codes after 2FA by attaching claim to 2FA cookie redirect if present.
    if (result.recoveryCodes?.length) {
      const claim = await signRecoveryCodesClaim(
        result.userId,
        result.recoveryCodes,
      );
      const res = discord2faRedirect(req, result.pendingToken);
      const { RECOVERY_CODES_CLAIM_COOKIE, recoveryClaimCookieOptions } =
        await import("@/lib/auth/auth-cookie");
      res.cookies.set(RECOVERY_CODES_CLAIM_COOKIE, claim, recoveryClaimCookieOptions());
      return res;
    }
    return discord2faRedirect(req, result.pendingToken);
  }
  return discordLoginErrorRedirect(req, result.reason);
}
