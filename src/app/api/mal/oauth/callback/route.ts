import { completeMalOAuth, malSettingsRedirect } from "@/lib/oauth/mal-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return malSettingsRedirect(req, error === "access_denied" ? "denied" : "unknown");
  }

  if (!code || !state) {
    return malSettingsRedirect(req, "missing_params");
  }

  const status = await completeMalOAuth(code, state);
  return malSettingsRedirect(req, status);
}
