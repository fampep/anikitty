import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";
import {
  fetchAnilistSiteServers,
  type AnilistSiteServer,
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
    const dataIds = searchParams.get("dataIds") ?? "";
    const audio = searchParams.get("audio") === "dub" ? "dub" : "sub";

    if (!isAnilistSiteProvider(provider) || !dataIds.trim()) {
      return Response.json({ error: "provider and dataIds required" }, { status: 400 });
    }

    const servers: AnilistSiteServer[] = await fetchAnilistSiteServers({
      provider: provider as AnilistSiteProviderId,
      dataIds,
      audio,
    });

    return Response.json(servers);
  });
}
