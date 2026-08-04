import { anilistSettingsRedirect, completeAniListOAuth } from "@/lib/oauth/anilist-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return anilistSettingsRedirect(req, { status: "error" });
  }

  const result = await completeAniListOAuth(code, state, req);
  return anilistSettingsRedirect(req, result);
}
