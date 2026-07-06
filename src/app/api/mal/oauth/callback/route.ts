import { completeMalOAuth, malSettingsRedirect } from "@/lib/oauth/mal-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return malSettingsRedirect(req, "error");
  }

  const status = await completeMalOAuth(code, state, req);
  return malSettingsRedirect(req, status);
}
