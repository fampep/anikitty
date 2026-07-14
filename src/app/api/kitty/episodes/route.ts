import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";
import {
  fetchAnilistSiteEpisodes,
  type AnilistSiteEpisode,
} from "@/lib/kitty/anilist-site-api";
import {
  isAnilistSiteProvider,
  type AnilistSiteProviderId,
} from "@/lib/kitty/anilist-site-providers";

const SAFE_ID = /^\d{1,10}$/;

export async function GET(req: Request) {
  return handleKittyApiRequest(req, async () => {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") ?? "";
    const anilistIdRaw = searchParams.get("anilistId") ?? "";
    const audio = searchParams.get("audio") === "dub" ? "dub" : "sub";

    if (!isAnilistSiteProvider(provider) || !SAFE_ID.test(anilistIdRaw)) {
      return Response.json({ error: "provider and anilistId required" }, { status: 400 });
    }

    const episodes: AnilistSiteEpisode[] = await fetchAnilistSiteEpisodes({
      provider: provider as AnilistSiteProviderId,
      anilistId: parseInt(anilistIdRaw, 10),
      audio,
    });

    return Response.json(episodes);
  });
}
