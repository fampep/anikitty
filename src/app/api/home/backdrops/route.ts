import { getHomeBackdropUrls } from "@/lib/core/home-data";

export async function GET() {
  try {
    const backdrops = await getHomeBackdropUrls();
    return Response.json(
      { backdrops },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (err) {
    console.error("[home/backdrops]", err);
    return Response.json({ backdrops: [] }, { status: 500 });
  }
}
