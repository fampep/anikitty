import { searchHhSeries } from "@/lib/hentaihaven/catalog";
import { adultJson, requireAdultGate } from "@/lib/hentaihaven/gate";
import { handleKittyApiRequest } from "@/lib/kitty/kitty-api-server";

export async function GET(req: Request) {
  return handleKittyApiRequest(req, async () => {
    const url = new URL(req.url);
    const blocked = requireAdultGate(url.searchParams);
    if (blocked) return blocked;

    const q = (url.searchParams.get("q") || "").trim();
    if (!q) {
      return adultJson({ error: "Missing q" }, { status: 400 });
    }

    try {
      const data = await searchHhSeries(q);
      return adultJson(data);
    } catch (err) {
      return adultJson(
        { error: err instanceof Error ? err.message : "Search failed" },
        { status: 502 },
      );
    }
  });
}
