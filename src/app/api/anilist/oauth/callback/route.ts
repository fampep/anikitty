import {
  anilist2faRedirect,
  anilistLinkRedirect,
  anilistLoginErrorRedirect,
  anilistLoginSuccessRedirect,
  completeAniListOAuth,
} from "@/lib/oauth/anilist-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return anilistLinkRedirect(req, "error");
  }

  const result = await completeAniListOAuth(code, state, req);

  if (result.type === "link") return anilistLinkRedirect(req, "connected");
  if (result.type === "success") return anilistLoginSuccessRedirect(req, result.token);
  if (result.type === "2fa") return anilist2faRedirect(req, result.pendingToken);
  return anilistLoginErrorRedirect(req, result.reason);
}
