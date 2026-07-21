import {
  completeDiscordLink,
  completeDiscordLogin,
  discord2faRedirect,
  discordLoginErrorRedirect,
  discordLoginSuccessRedirect,
  discordSettingsRedirect,
} from "@/lib/oauth/discord-oauth";
import { verifyOAuthStateFor } from "@/lib/auth/auth-jwt";

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
    return discordLoginSuccessRedirect(req, result.token);
  }
  if (result.type === "2fa") {
    return discord2faRedirect(req, result.pendingToken);
  }
  return discordLoginErrorRedirect(req, result.reason);
}
