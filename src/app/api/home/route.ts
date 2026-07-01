import {
  getHomeCriticalData,
  getHomeDiscoveryData,
  getHomePageData,
} from "@/lib/core/home-data";

export async function GET(req: Request) {
  const scope = new URL(req.url).searchParams.get("scope");

  try {
    const data =
      scope === "critical"
        ? await getHomeCriticalData()
        : scope === "discovery"
          ? await getHomeDiscoveryData()
          : await getHomePageData();

    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    console.error("AniList home error:", err);
    return Response.json({ error: "Failed to fetch home data" }, { status: 500 });
  }
}
