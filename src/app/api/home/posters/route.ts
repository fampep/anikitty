import { getHomePosterUrls } from "@/lib/home-data";

export async function GET() {
  try {
    const posters = await getHomePosterUrls();
    return Response.json(
      { posters },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (err) {
    console.error("[home/posters]", err);
    return Response.json({ posters: [] }, { status: 500 });
  }
}
