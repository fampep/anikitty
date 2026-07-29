import { unstable_cache } from "next/cache";
import { buildFranchise } from "@/lib/discovery/franchise";
import { publicErrorMessage } from "@/lib/security/public-error";

export const revalidate = 3600;

const getCachedFranchise = unstable_cache(
  async (id: number) => buildFranchise(id),
  ["franchise-v1"],
  { revalidate: 3600 },
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return Response.json({ error: "Invalid franchise id" }, { status: 400 });
  }

  try {
    const data = await getCachedFranchise(numId);
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("Franchise error:", err);
    return Response.json(
      { error: publicErrorMessage(err, "Failed to load franchise") },
      { status: 500 },
    );
  }
}
