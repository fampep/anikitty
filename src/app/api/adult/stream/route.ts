import { adultJson, requireAdultGate } from "@/lib/hentaihaven/gate";
import { resolveHhEpisodeStream } from "@/lib/hentaihaven/stream";
import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";

export async function GET(req: Request) {
  return handleKittyApiRequest(req, async () => {
    const url = new URL(req.url);
    const blocked = requireAdultGate(url.searchParams);
    if (blocked) return blocked;

    const seriesSlug = (url.searchParams.get("seriesSlug") || "").trim();
    const episodeSlug = (url.searchParams.get("episodeSlug") || "").trim();
    const seriesIdRaw = url.searchParams.get("seriesId");
    const episodeNumberRaw = url.searchParams.get("episode");
    const seriesId = seriesIdRaw ? Number.parseInt(seriesIdRaw, 10) : undefined;
    const episodeNumber = episodeNumberRaw
      ? Number.parseFloat(episodeNumberRaw)
      : undefined;

    try {
      const stream = await resolveHhEpisodeStream(req, {
        seriesSlug: seriesSlug || undefined,
        seriesId:
          seriesId != null && Number.isFinite(seriesId) ? seriesId : undefined,
        episodeSlug: episodeSlug || undefined,
        episodeNumber:
          episodeNumber != null && Number.isFinite(episodeNumber)
            ? episodeNumber
            : undefined,
      });
      const headers: HeadersInit = {};
      if (stream.sessionCookie) {
        headers["Set-Cookie"] = stream.sessionCookie;
      }
      const { sessionCookie: _, ...payload } = stream;
      return adultJson(payload, { headers });
    } catch (err) {
      return adultJson(
        { error: err instanceof Error ? err.message : "Stream failed" },
        { status: 502 },
      );
    }
  });
}
