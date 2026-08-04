import {
  completeAniListOAuth,
  anilistLoginSuccessRedirect,
  anilistLoginErrorRedirect,
  anilist2faRedirect,
  anilistLinkRedirect,
} from "@/lib/oauth/anilist-oauth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return anilistLoginErrorRedirect(req, "missing_params");
  }

  const result = await completeAniListOAuth(code, state, req);

  if (result.type === "success") {
    return anilistLoginSuccessRedirect(req, result.token);
  }

  if (result.type === "2fa") {
    return anilist2faRedirect(req, result.pendingToken);
  }

  if (result.type === "link") {
    return anilistLinkRedirect(req, "connected");
  }

  return anilistLoginErrorRedirect(req, result.reason);
}
