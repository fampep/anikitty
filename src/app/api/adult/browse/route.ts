import {
  browseHhSeries,
  getHhHomeSpotlight,
} from "@/lib/hentaihaven/catalog";
import { adultJson, requireAdultGate } from "@/lib/hentaihaven/gate";
import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";

export async function GET(req: Request) {
  return handleKittyApiRequest(req, async () => {
    const url = new URL(req.url);
    const blocked = requireAdultGate(url.searchParams);
    if (blocked) return blocked;

    try {
      const page = Math.max(
        1,
        Number.parseInt(url.searchParams.get("page") || "1", 10) || 1,
      );
      if (url.searchParams.get("home") === "1") {
        const items = await getHhHomeSpotlight();
        return adultJson({ items, page: 1, totalPages: 1, totalResults: items.length });
      }
      const data = await browseHhSeries(page);
      return adultJson(data);
    } catch (err) {
      return adultJson(
        { error: err instanceof Error ? err.message : "Browse failed" },
        { status: 502 },
      );
    }
  });
}
